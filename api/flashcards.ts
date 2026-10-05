import { listFlashcards } from "../src/server/database.js";
import type { ApiRequest, ApiResponse } from "../src/server/http.js";

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
    const topic = typeof req.query.topic === "string" ? req.query.topic.trim() : "";
    const subtopic = typeof req.query.subtopic === "string" ? req.query.subtopic.trim() : "";
    const cardType = typeof req.query.cardType === "string" ? req.query.cardType.trim() : "";
    return res.status(200).json(await listFlashcards({ category, topic, subtopic, cardType }));
  } catch (error) {
    console.error("Could not load flashcards", error);
    return res.status(500).json({ error: "Could not load flashcards" });
  }
}
