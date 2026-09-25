import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Expand, Moon, Shuffle, Sun } from "lucide-react";
import { CARD_DIFFICULTIES, type Flashcard, type FlashcardProgress, type FlashcardRating } from "@/types";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function parseList(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function formatLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatNextReview(dueAt: string) {
  const milliseconds = new Date(dueAt).getTime() - Date.now();
  const minutes = Math.max(1, Math.round(milliseconds / 60_000));
  if (minutes < 60) return `in ${minutes} minute${minutes === 1 ? "" : "s"}`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `in ${hours} hour${hours === 1 ? "" : "s"}`;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: new Date(dueAt).getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  }).format(new Date(dueAt));
}

function dueTime(progress: FlashcardProgress | undefined) {
  if (!progress) return Number.NEGATIVE_INFINITY;
  const timestamp = new Date(progress.dueAt).getTime();
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

function isDue(progress: FlashcardProgress | undefined) {
  return dueTime(progress) <= Date.now();
}

const REVIEW_OPTIONS: Array<{
  rating: FlashcardRating;
  label: string;
  description: string;
  className: string;
}> = [
  { rating: "again", label: "Again", description: "Review soon", className: "border-red-500/45 hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300" },
  { rating: "hard", label: "Hard", description: "Short interval", className: "border-amber-500/45 hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-300" },
  { rating: "good", label: "Good", description: "Normal interval", className: "border-blue-500/45 hover:bg-blue-500/10 hover:text-blue-700 dark:hover:text-blue-300" },
  { rating: "easy", label: "Easy", description: "Longest interval", className: "border-emerald-500/45 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300" },
];

function reviewIndicatorClass(reviewCount: number) {
  if (reviewCount === 0) return "bg-red-500";
  if (reviewCount <= 2) return "bg-amber-400";
  if (reviewCount <= 5) return "bg-lime-500";
  return "bg-emerald-500";
}

function ReviewProgressIndicator({ cardId, reviewCount }: { cardId: number; reviewCount: number }) {
  return (
    <span
      data-testid={`flashcard-review-indicator-${cardId}`}
      className={`inline-block h-3 w-3 shrink-0 rounded-sm border border-black/10 ${reviewIndicatorClass(reviewCount)}`}
      title={`Reviewed ${reviewCount} time${reviewCount === 1 ? "" : "s"}`}
      aria-label={`Reviewed ${reviewCount} time${reviewCount === 1 ? "" : "s"}`}
    />
  );
}

function FlashcardAnswer({ card, onHide }: { card: Flashcard; onHide: () => void }) {
  const keyPoints = parseList(card.keyPoints);
  const followUps = parseList(card.followUpQuestions);
  const mistakes = parseList(card.commonMistakes);

  return (
    <div className="space-y-4 text-base leading-7">
      <p>{card.answer}</p>
      {keyPoints.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Key points</p>
          <ul className="list-disc space-y-1 pl-5">
            {keyPoints.map((point) => <li key={point}>{point}</li>)}
          </ul>
        </div>
      )}
      {followUps.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Follow-ups</p>
          <ul className="space-y-1">
            {followUps.map((question) => <li key={question} className="text-muted-foreground">{question}</li>)}
          </ul>
        </div>
      )}
      {mistakes.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Common mistakes</p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            {mistakes.map((mistake) => <li key={mistake}>{mistake}</li>)}
          </ul>
        </div>
      )}
      <button
        type="button"
        onClick={onHide}
        className="text-sm font-medium text-primary hover:underline"
      >
        Hide answer
      </button>
    </div>
  );
}

function ReviewRating({
  progress,
  isSaving,
  onRate,
}: {
  progress: FlashcardProgress | undefined;
  isSaving: boolean;
  onRate: (rating: FlashcardRating) => void;
}) {
  return (
    <div className="mt-7 border-t border-border pt-6">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">How well did you remember it?</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Your rating sets the next review date.</p>
        </div>
        {progress?.lastRating && (
          <p className="text-xs text-muted-foreground">
            Last: {formatLabel(progress.lastRating)} / Next {formatNextReview(progress.dueAt)}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {REVIEW_OPTIONS.map((option) => (
          <Button
            key={option.rating}
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={() => onRate(option.rating)}
            data-testid={`button-rate-${option.rating}`}
            className={`h-auto min-h-16 flex-col items-start gap-0.5 whitespace-normal px-3 py-2 text-left ${option.className}`}
          >
            <span className="text-sm font-semibold">{option.label}</span>
            <span className="text-xs font-normal text-muted-foreground">{option.description}</span>
          </Button>
        ))}
      </div>
      {progress && (
        <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
          {progress.reviewCount} review{progress.reviewCount === 1 ? "" : "s"} completed
          {progress.lapseCount > 0 ? ` / ${progress.lapseCount} marked Again` : ""}
        </p>
      )}
    </div>
  );
}

function FlashcardItem({
  card,
  progress,
  highlighted,
  showAnswer,
  onToggleAnswer,
  onSelect,
}: {
  card: Flashcard;
  progress: FlashcardProgress | undefined;
  highlighted: boolean;
  showAnswer: boolean;
  onToggleAnswer: () => void;
  onSelect: () => void;
}) {

  return (
    <article
      data-testid={`flashcard-${card.id}`}
      className={`group relative rounded-2xl border bg-card p-5 shadow-sm transition-all ${
        highlighted ? "border-primary ring-2 ring-primary/20" : "border-card-border hover:-translate-y-px hover:border-primary/40 hover:shadow-md"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="absolute inset-0 rounded-2xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={`Open flashcard: ${card.front}`}
      />

      <div className="pointer-events-none relative">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
              {formatLabel(card.cardType)}
            </span>
            <span className="rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[11px] text-muted-foreground">
              {formatLabel(card.difficulty)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ReviewProgressIndicator cardId={card.id} reviewCount={progress?.reviewCount ?? 0} />
            {card.needsReview && (
              <span className="text-[11px] font-medium text-amber-600 dark:text-amber-300" title={card.reviewReason ?? "This card needs review"}>
                Needs review
              </span>
            )}
            <Expand size={15} className="text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" />
          </div>
        </div>

        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{card.topic}</p>
        <h2 className="text-base font-semibold leading-6">{card.front}</h2>

        <div className="mt-5 border-t border-border/70 pt-4">
          {showAnswer ? (
            <div className="pointer-events-auto relative">
              <FlashcardAnswer card={card} onHide={onToggleAnswer} />
            </div>
          ) : (
            <Button
              data-testid={`button-reveal-${card.id}`}
              variant="outline"
              className="pointer-events-auto relative w-full"
              onClick={onToggleAnswer}
            >
              Reveal answer
            </Button>
          )}
        </div>

        {card.sourceReference && (
          <p className="mt-4 text-[11px] text-muted-foreground">Source: {card.sourceReference}</p>
        )}
      </div>
    </article>
  );
}

function FlashcardFocusDialog({
  card,
  position,
  total,
  showAnswer,
  progress,
  isSaving,
  onToggleAnswer,
  onRate,
  onPrevious,
  onNext,
  onClose,
}: {
  card: Flashcard | undefined;
  position: number;
  total: number;
  showAnswer: boolean;
  progress: FlashcardProgress | undefined;
  isSaving: boolean;
  onToggleAnswer: () => void;
  onRate: (rating: FlashcardRating) => void;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(card)} onOpenChange={(open) => { if (!open) onClose(); }}>
      {card && (
        <DialogContent className="max-h-[92vh] w-[calc(100%-2rem)] max-w-3xl gap-0 overflow-hidden border-primary/30 bg-card p-0 shadow-2xl sm:rounded-2xl">
          <div className="max-h-[calc(92vh-5.25rem)] overflow-y-auto p-6 sm:p-9">
            <DialogHeader className="pr-8 text-left">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  {formatLabel(card.cardType)}
                </span>
                <span className="rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground">
                  {formatLabel(card.difficulty)}
                </span>
                <ReviewProgressIndicator cardId={card.id} reviewCount={progress?.reviewCount ?? 0} />
                <span className="ml-auto text-xs text-muted-foreground">{position + 1} of {total}</span>
              </div>
              <DialogDescription className="text-xs font-semibold uppercase tracking-wider text-primary">
                {card.topic}
              </DialogDescription>
              <DialogTitle className="text-xl leading-8 sm:text-2xl sm:leading-9">
                {card.front}
              </DialogTitle>
            </DialogHeader>

            <div className="mt-7 border-t border-border pt-6">
              {showAnswer ? (
                <>
                  <FlashcardAnswer card={card} onHide={onToggleAnswer} />
                  <ReviewRating progress={progress} isSaving={isSaving} onRate={onRate} />
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-primary/35 bg-primary/5 p-6 text-center sm:p-8">
                  <p className="mb-4 text-sm text-muted-foreground">Answer out loud before checking yourself.</p>
                  <Button data-testid={`button-dialog-reveal-${card.id}`} onClick={onToggleAnswer}>
                    Reveal answer
                  </Button>
                </div>
              )}
            </div>

            {card.sourceReference && (
              <p className="mt-6 text-xs text-muted-foreground">Source: {card.sourceReference}</p>
            )}
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-card-border bg-muted/35 px-4 py-3 sm:px-6">
            <Button variant="outline" onClick={onPrevious} disabled={position === 0} className="justify-self-start">
              <ChevronLeft />
              <span className="hidden sm:inline">Previous</span>
            </Button>
            <span className="text-xs text-muted-foreground" aria-live="polite">Card {position + 1} of {total}</span>
            <Button variant="outline" onClick={onNext} disabled={position === total - 1} className="justify-self-end">
              <span className="hidden sm:inline">Next</span>
              <ChevronRight />
            </Button>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}

export default function FlashcardsPage() {
  const { theme, toggle } = useTheme();
  const { toast } = useToast();
  const [category, setCategory] = useState("All");
  const [cardType, setCardType] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [randomCardId, setRandomCardId] = useState<number | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [revealedCardIds, setRevealedCardIds] = useState<Set<number>>(() => new Set());

  const { data: cards = [], isLoading, isError } = useQuery<Flashcard[]>({
    queryKey: ["/api/flashcards"],
  });
  const { data: progressEntries = [] } = useQuery<FlashcardProgress[]>({
    queryKey: ["/api/flashcards/progress"],
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ cardId, rating }: { cardId: number; rating: FlashcardRating }) => {
      const response = await apiRequest("POST", `/api/flashcards/${cardId}/review`, { rating });
      return await response.json() as FlashcardProgress;
    },
    onSuccess: (savedProgress) => {
      queryClient.setQueryData<FlashcardProgress[]>(["/api/flashcards/progress"], (current = []) => {
        const remaining = current.filter((entry) => entry.cardId !== savedProgress.cardId);
        return [...remaining, savedProgress].sort((a, b) => a.cardId - b.cardId);
      });
      toast({
        title: `${formatLabel(savedProgress.lastRating ?? "review")} saved`,
        description: `Next review ${formatNextReview(savedProgress.dueAt)}.`,
      });
    },
    onError: () => {
      toast({ title: "Could not save review", description: "Please try that rating again.", variant: "destructive" });
    },
  });

  const categories = useMemo(
    () => Array.from(new Set(cards.map((card) => card.category))).sort(),
    [cards],
  );
  const cardTypes = useMemo(
    () => Array.from(new Set(cards.map((card) => card.cardType))).sort(),
    [cards],
  );
  const progressByCard = useMemo(
    () => new Map(progressEntries.map((entry) => [entry.cardId, entry])),
    [progressEntries],
  );
  const filteredCards = useMemo(
    () => cards
      .filter((card) =>
        (category === "All" || card.category === category) &&
        (cardType === "All" || card.cardType === cardType) &&
        (difficulty === "All" || card.difficulty === difficulty)
      )
      .sort((a, b) => dueTime(progressByCard.get(a.id)) - dueTime(progressByCard.get(b.id))),
    [cards, category, cardType, difficulty, progressByCard],
  );
  const selectedCardIndex = filteredCards.findIndex((card) => card.id === selectedCardId);
  const selectedCard = selectedCardIndex >= 0 ? filteredCards[selectedCardIndex] : undefined;

  const toggleAnswer = (cardId: number) => {
    setRevealedCardIds((current) => {
      const next = new Set(current);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  const closeSelectedCard = () => {
    if (selectedCardId !== null) {
      setRevealedCardIds((current) => {
        if (!current.has(selectedCardId)) return current;
        const next = new Set(current);
        next.delete(selectedCardId);
        return next;
      });
    }
    setSelectedCardId(null);
  };

  useEffect(() => {
    if (!selectedCard) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" && selectedCardIndex > 0) {
        event.preventDefault();
        setSelectedCardId(filteredCards[selectedCardIndex - 1].id);
      }
      if (event.key === "ArrowRight" && selectedCardIndex < filteredCards.length - 1) {
        event.preventDefault();
        setSelectedCardId(filteredCards[selectedCardIndex + 1].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredCards, selectedCard, selectedCardIndex]);

  const randomCard = () => {
    if (filteredCards.length === 0) return;
    const dueCards = filteredCards.filter((card) => isDue(progressByCard.get(card.id)));
    const queue = dueCards.length > 0 ? dueCards : filteredCards;
    const candidates = queue.length > 1
      ? queue.filter((card) => card.id !== randomCardId)
      : queue;
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    setRandomCardId(picked.id);
    setSelectedCardId(picked.id);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-card-border bg-card/90 shadow-xs backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 28 28" className="h-7 w-7" aria-label="Career Flashcards" fill="none">
              <rect width="28" height="28" rx="7" className="fill-primary" />
              <circle cx="14" cy="14" r="6" stroke="white" strokeWidth="2" />
              <line x1="14" y1="11" x2="14" y2="14" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <circle cx="14" cy="16.5" r="1" fill="white" />
            </svg>
            <span className="text-sm font-semibold tracking-tight">Career Flashcards</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              data-testid="button-theme-toggle"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent transition-colors hover:border-border hover:bg-accent"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6 sm:py-10">
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2 text-primary">
                <BookOpen size={18} />
                <span className="text-xs font-semibold uppercase tracking-widest">Active recall</span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">Flashcards</h1>
              <p className="mt-1 text-sm text-muted-foreground">Answer aloud before revealing the answer.</p>
            </div>
            <Button
              data-testid="button-random-flashcard"
              onClick={randomCard}
              disabled={filteredCards.length === 0}
            >
              <Shuffle size={15} />
              Random Card
            </Button>
          </div>

          <div className="grid gap-3 rounded-2xl border border-card-border bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Category</p>
              <Select value={category} onValueChange={(value) => { setCategory(value); setRandomCardId(null); setSelectedCardId(null); }}>
                <SelectTrigger data-testid="select-flashcard-category" className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All categories</SelectItem>
                  {categories.map((value) => <SelectItem key={value} value={value}>{formatLabel(value)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Card type</p>
              <Select value={cardType} onValueChange={(value) => { setCardType(value); setRandomCardId(null); setSelectedCardId(null); }}>
                <SelectTrigger data-testid="select-flashcard-type" className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All card types</SelectItem>
                  {cardTypes.map((value) => <SelectItem key={value} value={value}>{formatLabel(value)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Difficulty</p>
              <Select value={difficulty} onValueChange={(value) => { setDifficulty(value); setRandomCardId(null); setSelectedCardId(null); }}>
                <SelectTrigger data-testid="select-flashcard-difficulty" className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All difficulties</SelectItem>
                  {CARD_DIFFICULTIES.map((value) => <SelectItem key={value} value={value}>{formatLabel(value)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between border-t border-border/70 pt-3 text-xs text-muted-foreground sm:col-span-2 lg:col-span-3">
              <span>{filteredCards.length} card{filteredCards.length !== 1 ? "s" : ""} match the current filters.</span>
              {randomCardId !== null && <span className="inline-flex items-center gap-1 text-primary"><CheckCircle2 size={13} /> Random pick selected</span>}
            </div>
          </div>
        </section>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => <div key={item} className="h-72 animate-pulse rounded-2xl border border-card-border bg-card" />)}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-dashed border-destructive/50 bg-card/70 py-16 text-center text-sm text-destructive">
            Could not load flashcards.
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/70 py-16 text-center text-muted-foreground">
            <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No flashcards match these filters yet.</p>
            <p className="mt-1 text-xs">Import cards generated from your notes to begin reviewing.</p>
          </div>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCards.map((card) => (
              <FlashcardItem
                key={card.id}
                card={card}
                progress={progressByCard.get(card.id)}
                highlighted={card.id === randomCardId}
                showAnswer={revealedCardIds.has(card.id)}
                onToggleAnswer={() => toggleAnswer(card.id)}
                onSelect={() => setSelectedCardId(card.id)}
              />
            ))}
          </section>
        )}

        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <ChevronRight size={13} /> Review cards out loud, then reveal the answer to compare your response.
        </p>
      </main>

      <FlashcardFocusDialog
        card={selectedCard}
        position={selectedCardIndex}
        total={filteredCards.length}
        showAnswer={selectedCard ? revealedCardIds.has(selectedCard.id) : false}
        progress={selectedCard ? progressByCard.get(selectedCard.id) : undefined}
        isSaving={reviewMutation.isPending}
        onToggleAnswer={() => { if (selectedCard) toggleAnswer(selectedCard.id); }}
        onRate={(rating) => { if (selectedCard) reviewMutation.mutate({ cardId: selectedCard.id, rating }); }}
        onPrevious={() => { if (selectedCardIndex > 0) setSelectedCardId(filteredCards[selectedCardIndex - 1].id); }}
        onNext={() => { if (selectedCardIndex < filteredCards.length - 1) setSelectedCardId(filteredCards[selectedCardIndex + 1].id); }}
        onClose={closeSelectedCard}
      />
    </div>
  );
}
