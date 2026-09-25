import { isFlashcardRating, reviewFlashcard } from "../../../src/server/database";
import type { ApiRequest, ApiResponse } from "../../../src/server/http";

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rawId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const cardId = Number(rawId);
  if (!Number.isInteger(cardId) || cardId <= 0) {
    return res.status(400).json({ error: "Invalid flashcard id" });
  }

  const rating = (req.body as { rating?: unknown } | undefined)?.rating;
  if (!isFlashcardRating(rating)) {
    return res.status(400).json({ error: "rating must be again, hard, good, or easy" });
  }

  try {
    const progress = await reviewFlashcard(cardId, rating);
    if (!progress) return res.status(404).json({ error: "Flashcard not found" });
    return res.status(200).json(progress);
  } catch (error) {
    console.error("Could not save flashcard review", error);
    return res.status(500).json({ error: "Could not save flashcard review" });
  }
}
