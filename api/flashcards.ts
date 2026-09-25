import { listFlashcards } from "../src/server/database";
import type { ApiRequest, ApiResponse } from "../src/server/http";

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
    const cardType = typeof req.query.cardType === "string" ? req.query.cardType.trim() : "";
    return res.status(200).json(await listFlashcards(category, cardType));
  } catch (error) {
    console.error("Could not load flashcards", error);
    return res.status(500).json({ error: "Could not load flashcards" });
  }
}
