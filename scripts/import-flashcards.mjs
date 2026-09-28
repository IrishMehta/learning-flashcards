import { readFile } from "node:fs/promises";
import process from "node:process";

import { createClient } from "@libsql/client";

const REQUIRED_STRINGS = [
  "card_key",
  "card_type",
  "category",
  "topic",
  "difficulty",
  "front",
  "answer",
];
const STRING_ARRAYS = ["key_points", "follow_up_questions", "common_mistakes"];
const CHATGPT_REFERENCE_MARKER = /\s*:chatgpt-content-reference\{index="\d+"\}/g;

function usage() {
  console.error("Usage: npm run import:flashcards -- <cards.json> [--dry-run]");
}

function fail(message) {
  throw new Error(message);
}

function validateCard(card, index) {
  if (!card || typeof card !== "object" || Array.isArray(card)) {
    fail(`cards[${index}] must be an object`);
  }
  for (const field of REQUIRED_STRINGS) {
    if (typeof card[field] !== "string" || card[field].trim() === "") {
      fail(`cards[${index}].${field} must be a non-empty string`);
    }
  }
  for (const field of STRING_ARRAYS) {
    if (!Array.isArray(card[field]) || card[field].some((item) => typeof item !== "string")) {
      fail(`cards[${index}].${field} must be an array of strings`);
    }
  }
  if (typeof card.needs_review !== "boolean") {
    fail(`cards[${index}].needs_review must be a boolean`);
  }
  if (card.source_reference != null && typeof card.source_reference !== "string") {
    fail(`cards[${index}].source_reference must be a string or null`);
  }
  if (card.review_reason != null && typeof card.review_reason !== "string") {
    fail(`cards[${index}].review_reason must be a string or null`);
  }
  if (card.question_id != null && !Number.isInteger(card.question_id)) {
    fail(`cards[${index}].question_id must be an integer or null`);
  }
  return card;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const unknownFlags = args.filter((arg) => arg.startsWith("--") && arg !== "--dry-run");
  const paths = args.filter((arg) => !arg.startsWith("--"));

  if (unknownFlags.length > 0 || paths.length !== 1) {
    usage();
    process.exitCode = 1;
    return;
  }

  const raw = await readFile(paths[0], "utf8");
  const removedMarkers = raw.match(CHATGPT_REFERENCE_MARKER)?.length ?? 0;
  const payload = JSON.parse(raw.replace(CHATGPT_REFERENCE_MARKER, ""));
  if (!payload || !Array.isArray(payload.cards) || payload.cards.length === 0) {
    fail("Input must be an object with a non-empty cards array");
  }

  const cards = payload.cards.map(validateCard);
  const keys = cards.map((card) => card.card_key);
  const duplicateKeys = [...new Set(keys.filter((key, index) => keys.indexOf(key) !== index))];
  if (duplicateKeys.length > 0) {
    fail(`Duplicate card_key values: ${duplicateKeys.join(", ")}`);
  }

  console.log(`Validated ${cards.length} flashcard${cards.length === 1 ? "" : "s"}.`);
  if (removedMarkers > 0) {
    console.log(`Removed ${removedMarkers} non-content ChatGPT citation marker${removedMarkers === 1 ? "" : "s"}.`);
  }
  if (dryRun) {
    console.log("Dry run complete; the database was not changed.");
    return;
  }

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    fail("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required");
  }

  const db = createClient({ url, authToken });
  const placeholders = keys.map(() => "?").join(", ");
  const existing = await db.execute({
    sql: `SELECT card_key FROM flashcards WHERE card_key IN (${placeholders})`,
    args: keys,
  });
  const existingKeys = new Set(existing.rows.map((row) => String(row.card_key)));
  const now = new Date().toISOString();

  await db.batch(
    cards.map((card) => ({
      sql: `INSERT INTO flashcards (
        card_key, card_type, category, topic, difficulty, front, answer,
        key_points, follow_up_questions, common_mistakes, source_reference,
        needs_review, review_reason, question_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(card_key) DO UPDATE SET
        card_type = excluded.card_type,
        category = excluded.category,
        topic = excluded.topic,
        difficulty = excluded.difficulty,
        front = excluded.front,
        answer = excluded.answer,
        key_points = excluded.key_points,
        follow_up_questions = excluded.follow_up_questions,
        common_mistakes = excluded.common_mistakes,
        source_reference = excluded.source_reference,
        needs_review = excluded.needs_review,
        review_reason = excluded.review_reason,
        question_id = excluded.question_id,
        updated_at = excluded.updated_at`,
      args: [
        card.card_key,
        card.card_type,
        card.category,
        card.topic,
        card.difficulty,
        card.front,
        card.answer,
        JSON.stringify(card.key_points),
        JSON.stringify(card.follow_up_questions),
        JSON.stringify(card.common_mistakes),
        card.source_reference?.trim() || null,
        card.needs_review ? 1 : 0,
        card.review_reason ?? null,
        card.question_id ?? null,
        now,
        now,
      ],
    })),
    "write",
  );

  const verified = await db.execute({
    sql: `SELECT card_key FROM flashcards WHERE card_key IN (${placeholders})`,
    args: keys,
  });
  const verifiedKeys = new Set(verified.rows.map((row) => String(row.card_key)));
  const missingKeys = keys.filter((key) => !verifiedKeys.has(key));
  if (missingKeys.length > 0) {
    fail(`Import verification failed; missing card_key values: ${missingKeys.join(", ")}`);
  }

  const inserted = keys.filter((key) => !existingKeys.has(key)).length;
  console.log(`Imported ${cards.length} flashcards: ${inserted} inserted, ${cards.length - inserted} updated.`);
  console.log(`Verified all ${verifiedKeys.size} requested card keys in Turso.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

