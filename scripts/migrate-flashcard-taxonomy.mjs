import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

import { createClient } from "@libsql/client";

const DEFAULT_MAPPING_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../data/flashcard-taxonomy-mapping.json",
);

function fail(message) {
  throw new Error(message);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function parseArgs() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const unknownFlags = args.filter((arg) => arg.startsWith("--") && arg !== "--dry-run");
  const paths = args.filter((arg) => !arg.startsWith("--"));
  if (unknownFlags.length > 0 || paths.length > 1) {
    fail("Usage: npm run migrate:taxonomy -- [mapping.json] [--dry-run]");
  }
  return { dryRun, mappingPath: resolve(paths[0] ?? DEFAULT_MAPPING_PATH) };
}

async function loadMappings(mappingPath) {
  const payload = JSON.parse(await readFile(mappingPath, "utf8"));
  if (!payload || !Array.isArray(payload.mappings) || payload.mappings.length === 0) {
    fail("Mapping file must contain a non-empty mappings array");
  }

  const requiredFields = ["cardKey", "oldCategory", "category", "oldTopic", "newTopic", "newSubtopic"];
  for (const [index, mapping] of payload.mappings.entries()) {
    if (!mapping || typeof mapping !== "object" || Array.isArray(mapping)) {
      fail(`mappings[${index}] must be an object`);
    }
    for (const field of requiredFields) {
      if (!isNonEmptyString(mapping[field])) {
        fail(`mappings[${index}].${field} must be a non-empty string`);
      }
    }
  }

  const keys = payload.mappings.map((mapping) => mapping.cardKey);
  const duplicateKeys = [...new Set(keys.filter((key, index) => keys.indexOf(key) !== index))];
  if (duplicateKeys.length > 0) fail(`Duplicate cardKey values: ${duplicateKeys.join(", ")}`);
  if (payload.metadata?.cardCount != null && payload.metadata.cardCount !== payload.mappings.length) {
    fail(`Mapping metadata declares ${payload.metadata.cardCount} cards but contains ${payload.mappings.length}`);
  }
  return payload.mappings;
}

function rowsByCardKey(rows) {
  return new Map(rows.map((row) => [String(row.card_key), row]));
}

function progressIdentity(rows) {
  return rows.map((row) => `${row.id}:${row.card_id}`).sort();
}

function assertSameList(before, after, label) {
  if (before.length !== after.length || before.some((value, index) => value !== after[index])) {
    fail(`${label} changed during migration`);
  }
}

async function readState(db, hasSubtopic) {
  const cards = await db.execute(
    hasSubtopic
      ? "SELECT id, card_key, category, topic, subtopic FROM flashcards ORDER BY card_key"
      : "SELECT id, card_key, category, topic FROM flashcards ORDER BY card_key",
  );
  const progress = await db.execute("SELECT id, card_id FROM flashcard_progress ORDER BY id");
  return { cards: cards.rows, progress: progress.rows };
}

function validateCoverage(mappings, cards, hasSubtopic) {
  const databaseByKey = rowsByCardKey(cards);
  const mappingKeys = new Set(mappings.map((mapping) => mapping.cardKey));
  const missingCards = mappings.filter((mapping) => !databaseByKey.has(mapping.cardKey)).map((mapping) => mapping.cardKey);
  const unmappedCards = cards.map((card) => String(card.card_key)).filter((key) => !mappingKeys.has(key));
  if (missingCards.length > 0) fail(`Mapping keys missing from Turso: ${missingCards.join(", ")}`);
  if (unmappedCards.length > 0) fail(`Turso cards missing from mapping: ${unmappedCards.join(", ")}`);

  const mismatches = [];
  for (const mapping of mappings) {
    const card = databaseByKey.get(mapping.cardKey);
    const currentTopic = String(card.topic);
    const alreadyApplied = hasSubtopic
      && String(card.category) === mapping.category
      && currentTopic === mapping.newTopic
      && String(card.subtopic) === mapping.newSubtopic;
    if (!alreadyApplied && currentTopic !== mapping.oldTopic) {
      mismatches.push(`${mapping.cardKey}: expected ${JSON.stringify(mapping.oldTopic)}, found ${JSON.stringify(currentTopic)}`);
    }
    if (!alreadyApplied && String(card.category) !== mapping.oldCategory) {
      mismatches.push(`${mapping.cardKey}: expected category ${JSON.stringify(mapping.category)}, found ${JSON.stringify(card.category)}`);
    }
  }
  if (mismatches.length > 0) fail(`Pre-migration validation failed:\n${mismatches.join("\n")}`);
  return databaseByKey;
}

async function main() {
  const { dryRun, mappingPath } = parseArgs();
  const mappings = await loadMappings(mappingPath);
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) fail("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required");

  const db = createClient({ url, authToken });
  const schema = await db.execute("PRAGMA table_info(flashcards)");
  let hasSubtopic = schema.rows.some((row) => row.name === "subtopic");
  const before = await readState(db, hasSubtopic);
  const databaseByKey = validateCoverage(mappings, before.cards, hasSubtopic);
  const identitiesBefore = new Map(before.cards.map((card) => [String(card.card_key), Number(card.id)]));
  const progressBefore = progressIdentity(before.progress);

  console.log(`Validated ${mappings.length} mappings against ${before.cards.length} Turso cards.`);
  console.log(`Subtopic column ${hasSubtopic ? "already exists" : "will be added"}.`);
  if (dryRun) {
    console.log("Dry run complete; the database was not changed.");
    return;
  }

  if (!hasSubtopic) {
    await db.execute("ALTER TABLE flashcards ADD COLUMN subtopic TEXT");
    hasSubtopic = true;
  }

  await db.batch(
    mappings.map((mapping) => {
      const card = databaseByKey.get(mapping.cardKey);
      return {
        sql: "UPDATE flashcards SET category = ?, topic = ?, subtopic = ? WHERE card_key = ? AND id = ?",
        args: [mapping.category, mapping.newTopic, mapping.newSubtopic, mapping.cardKey, Number(card.id)],
      };
    }),
    "write",
  );

  const after = await readState(db, hasSubtopic);
  if (after.cards.length !== before.cards.length) fail("Flashcard row count changed during migration");
  const afterByKey = rowsByCardKey(after.cards);
  const taxonomyErrors = [];
  for (const mapping of mappings) {
    const card = afterByKey.get(mapping.cardKey);
    if (!card) {
      taxonomyErrors.push(`${mapping.cardKey}: missing after migration`);
      continue;
    }
    if (Number(card.id) !== identitiesBefore.get(mapping.cardKey)) {
      taxonomyErrors.push(`${mapping.cardKey}: id changed from ${identitiesBefore.get(mapping.cardKey)} to ${card.id}`);
    }
    if (String(card.category) !== mapping.category || String(card.topic) !== mapping.newTopic || String(card.subtopic) !== mapping.newSubtopic) {
      taxonomyErrors.push(`${mapping.cardKey}: expected ${mapping.newTopic}/${mapping.newSubtopic}, found ${card.topic}/${card.subtopic}`);
    }
  }
  if (taxonomyErrors.length > 0) fail(`Post-migration verification failed:\n${taxonomyErrors.join("\n")}`);

  const invalidTaxonomy = await db.execute(
    "SELECT COUNT(*) AS count FROM flashcards WHERE topic IS NULL OR trim(topic) = '' OR subtopic IS NULL OR trim(subtopic) = ''",
  );
  if (Number(invalidTaxonomy.rows[0].count) !== 0) fail("One or more cards have empty taxonomy values");
  assertSameList(progressBefore, progressIdentity(after.progress), "Review progress identities");

  console.log(`Updated and verified ${mappings.length} flashcards.`);
  console.log(`Preserved all ${identitiesBefore.size} card identities and ${progressBefore.length} review progress rows.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
