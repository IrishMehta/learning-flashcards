import { listProgress } from "../../src/server/database";
import type { ApiRequest, ApiResponse } from "../../src/server/http";

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    return res.status(200).json(await listProgress());
  } catch (error) {
    console.error("Could not load flashcard progress", error);
    return res.status(500).json({ error: "Could not load flashcard progress" });
  }
}
