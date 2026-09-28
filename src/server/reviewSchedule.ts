import type { FlashcardProgress, FlashcardRating } from "../types.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const AGAIN_DELAY_MS = 10 * 60 * 1000;

function nextIntervalDays(current: number, rating: Exclude<FlashcardRating, "again">) {
  if (current <= 0) return rating === "hard" ? 1 : rating === "good" ? 3 : 7;
  if (rating === "hard") return Math.max(current + 1, Math.round(current * 1.5));
  if (rating === "good") return Math.max(current + 1, Math.round(current * 2.5));
  return Math.max(current + 2, Math.round(current * 3.5));
}

export function calculateReviewSchedule(
  current: FlashcardProgress | undefined,
  rating: FlashcardRating,
  reviewedAt = new Date(),
) {
  const currentInterval = current?.intervalDays ?? 0;
  const intervalDays = rating === "again" ? 0 : nextIntervalDays(currentInterval, rating);
  const dueAt = new Date(
    reviewedAt.getTime() + (rating === "again" ? AGAIN_DELAY_MS : intervalDays * DAY_MS),
  ).toISOString();

  return {
    dueAt,
    lastReviewedAt: reviewedAt.toISOString(),
    reviewCount: (current?.reviewCount ?? 0) + 1,
    lapseCount: (current?.lapseCount ?? 0) + (rating === "again" ? 1 : 0),
    lastRating: rating,
    intervalDays,
  };
}
