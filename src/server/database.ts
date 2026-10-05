import { createClient, type Client, type InValue } from "@libsql/client";

import { FLASHCARD_RATINGS, type FlashcardProgress, type FlashcardRating } from "../types.js";
import { calculateReviewSchedule } from "./reviewSchedule.js";

let client: Client | undefined;

function getClient() {
  if (client) return client;
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required");
  }
  client = createClient({ url, authToken });
  return client;
}

export function isFlashcardRating(value: unknown): value is FlashcardRating {
  return typeof value === "string" && FLASHCARD_RATINGS.includes(value as FlashcardRating);
}

export async function listFlashcards({
  category = "",
  topic = "",
  subtopic = "",
  cardType = "",
}: {
  category?: string;
  topic?: string;
  subtopic?: string;
  cardType?: string;
} = {}) {
  const conditions: string[] = [];
  const args: InValue[] = [];
  if (category) {
    conditions.push("category = ?");
    args.push(category);
  }
  if (cardType) {
    conditions.push("card_type = ?");
    args.push(cardType);
  }
  if (topic) {
    conditions.push("topic = ?");
    args.push(topic);
  }
  if (subtopic) {
    conditions.push("subtopic = ?");
    args.push(subtopic);
  }
  const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
  const result = await getClient().execute({
    sql: `SELECT id, card_key AS cardKey, card_type AS cardType, category, topic, subtopic,
      difficulty, front, answer, key_points AS keyPoints,
      follow_up_questions AS followUpQuestions, common_mistakes AS commonMistakes,
      source_reference AS sourceReference, needs_review AS needsReview,
      review_reason AS reviewReason, question_id AS questionId,
      created_at AS createdAt, updated_at AS updatedAt
      FROM flashcards${where} ORDER BY category, topic, subtopic, id`,
    args,
  });
  return result.rows.map((row) => ({
    ...row,
    needsReview: Boolean(row.needsReview),
  }));
}

export async function listProgress() {
  const result = await getClient().execute(`SELECT id, card_id AS cardId,
    due_at AS dueAt, last_reviewed_at AS lastReviewedAt,
    review_count AS reviewCount, lapse_count AS lapseCount,
    last_rating AS lastRating, interval_days AS intervalDays,
    created_at AS createdAt, updated_at AS updatedAt
    FROM flashcard_progress ORDER BY card_id`);
  return result.rows;
}

export async function reviewFlashcard(cardId: number, rating: FlashcardRating) {
  const db = getClient();
  const card = await db.execute({
    sql: "SELECT id FROM flashcards WHERE id = ?",
    args: [cardId],
  });
  if (card.rows.length === 0) return undefined;

  const currentResult = await db.execute({
    sql: `SELECT id, card_id AS cardId, due_at AS dueAt,
      last_reviewed_at AS lastReviewedAt, review_count AS reviewCount,
      lapse_count AS lapseCount, last_rating AS lastRating,
      interval_days AS intervalDays, created_at AS createdAt,
      updated_at AS updatedAt FROM flashcard_progress WHERE card_id = ?`,
    args: [cardId],
  });
  const current = currentResult.rows[0] as unknown as FlashcardProgress | undefined;
  const next = calculateReviewSchedule(current, rating);
  const now = new Date().toISOString();

  const result = await db.execute({
    sql: `INSERT INTO flashcard_progress
      (card_id, due_at, last_reviewed_at, review_count, lapse_count,
       last_rating, interval_days, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(card_id) DO UPDATE SET
        due_at = excluded.due_at,
        last_reviewed_at = excluded.last_reviewed_at,
        review_count = excluded.review_count,
        lapse_count = excluded.lapse_count,
        last_rating = excluded.last_rating,
        interval_days = excluded.interval_days,
        updated_at = excluded.updated_at
      RETURNING id, card_id AS cardId, due_at AS dueAt,
        last_reviewed_at AS lastReviewedAt, review_count AS reviewCount,
        lapse_count AS lapseCount, last_rating AS lastRating,
        interval_days AS intervalDays, created_at AS createdAt,
        updated_at AS updatedAt`,
    args: [
      cardId,
      next.dueAt,
      next.lastReviewedAt,
      next.reviewCount,
      next.lapseCount,
      next.lastRating,
      next.intervalDays,
      now,
      now,
    ],
  });
  return result.rows[0];
}
