export const CARD_DIFFICULTIES = ["easy", "medium", "hard"] as const;
export const FLASHCARD_RATINGS = ["again", "hard", "good", "easy"] as const;

export type FlashcardRating = (typeof FLASHCARD_RATINGS)[number];

export interface Flashcard {
  id: number;
  cardKey: string;
  cardType: string;
  category: string;
  topic: string;
  subtopic: string;
  difficulty: string;
  front: string;
  answer: string;
  keyPoints: string;
  followUpQuestions: string;
  commonMistakes: string;
  sourceReference: string | null;
  needsReview: boolean;
  reviewReason: string | null;
  questionId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface FlashcardProgress {
  id: number;
  cardId: number;
  dueAt: string;
  lastReviewedAt: string | null;
  reviewCount: number;
  lapseCount: number;
  lastRating: string | null;
  intervalDays: number;
  createdAt: string;
  updatedAt: string;
}
