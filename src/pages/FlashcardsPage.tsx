import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpenCheck,
  Brain,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Filter,
  Layers3,
  type LucideIcon,
  Moon,
  RotateCcw,
  Search,
  Shuffle,
  Sparkles,
  Sun,
  ThumbsUp,
  X,
  Zap,
} from "lucide-react";

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

const INITIAL_VISIBLE_CARDS = 12;
const FILTER_STORAGE_KEY = "career-flashcards-filters";

type SavedFilters = {
  category: string;
  cardType: string;
  difficulty: string;
  search: string;
};

const DEFAULT_FILTERS: SavedFilters = {
  category: "All",
  cardType: "All",
  difficulty: "All",
  search: "",
};

function loadSavedFilters(): SavedFilters {
  if (typeof window === "undefined") return DEFAULT_FILTERS;

  try {
    const saved = JSON.parse(window.localStorage.getItem(FILTER_STORAGE_KEY) ?? "null");
    if (!saved || typeof saved !== "object") return DEFAULT_FILTERS;

    return {
      category: typeof saved.category === "string" ? saved.category : DEFAULT_FILTERS.category,
      cardType: typeof saved.cardType === "string" ? saved.cardType : DEFAULT_FILTERS.cardType,
      difficulty: typeof saved.difficulty === "string" ? saved.difficulty : DEFAULT_FILTERS.difficulty,
      search: typeof saved.search === "string" ? saved.search : DEFAULT_FILTERS.search,
    };
  } catch {
    return DEFAULT_FILTERS;
  }
}

function parseList(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatNextReview(dueAt: string) {
  const milliseconds = new Date(dueAt).getTime() - Date.now();
  const minutes = Math.max(1, Math.round(milliseconds / 60_000));
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `in ${hours} hr`;
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

function reviewStatus(progress: FlashcardProgress | undefined) {
  const count = progress?.reviewCount ?? 0;
  if (count === 0) return { label: "New", className: "bg-amber-100 text-amber-900 dark:bg-amber-300/15 dark:text-amber-200" };
  if (count <= 2) return { label: `${count} review${count === 1 ? "" : "s"}`, className: "bg-orange-100 text-orange-900 dark:bg-orange-300/15 dark:text-orange-200" };
  return { label: `${count} reviews`, className: "bg-emerald-100 text-emerald-900 dark:bg-emerald-300/15 dark:text-emerald-200" };
}

const REVIEW_OPTIONS: Array<{
  rating: FlashcardRating;
  label: string;
  description: string;
  icon: LucideIcon;
  className: string;
}> = [
  { rating: "again", label: "Again", description: "10 min", icon: RotateCcw, className: "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-200" },
  { rating: "hard", label: "Hard", description: "1 day", icon: Brain, className: "border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100 dark:border-orange-400/25 dark:bg-orange-400/10 dark:text-orange-200" },
  { rating: "good", label: "Good", description: "3 days", icon: ThumbsUp, className: "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-200" },
  { rating: "easy", label: "Easy", description: "7 days", icon: Sparkles, className: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200" },
];

function FlashcardAnswer({ card }: { card: Flashcard }) {
  const keyPoints = parseList(card.keyPoints);
  const followUps = parseList(card.followUpQuestions);
  const mistakes = parseList(card.commonMistakes);

  return (
    <div className="space-y-5 text-[15px] leading-7 sm:text-base">
      <div className="rounded-2xl bg-secondary/65 p-4 text-card-foreground sm:p-5">
        <p>{card.answer}</p>
      </div>
      {keyPoints.length > 0 && (
        <section className="rounded-2xl border border-emerald-200/70 bg-emerald-50/75 p-4 dark:border-emerald-400/20 dark:bg-emerald-400/10">
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-emerald-800 dark:text-emerald-200">
            <Zap size={14} /> Key points
          </p>
          <ul className="space-y-2 pl-5 marker:text-emerald-500">
            {keyPoints.map((point) => <li key={point} className="list-disc">{point}</li>)}
          </ul>
        </section>
      )}
      {followUps.length > 0 && (
        <section className="rounded-2xl border border-violet-200/70 bg-violet-50/75 p-4 dark:border-violet-400/20 dark:bg-violet-400/10">
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-violet-800 dark:text-violet-200">
            <CircleHelp size={14} /> Follow-ups
          </p>
          <ul className="space-y-2">
            {followUps.map((question) => <li key={question}>• {question}</li>)}
          </ul>
        </section>
      )}
      {mistakes.length > 0 && (
        <section className="rounded-2xl border border-rose-200/70 bg-rose-50/70 p-4 dark:border-rose-400/20 dark:bg-rose-400/10">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-rose-800 dark:text-rose-200">Watch out for</p>
          <ul className="space-y-2 pl-5 marker:text-rose-400">
            {mistakes.map((mistake) => <li key={mistake} className="list-disc">{mistake}</li>)}
          </ul>
        </section>
      )}
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
    <section className="mt-7 border-t border-border pt-6">
      <div className="mb-4">
        <p className="font-display text-lg font-semibold">How did that feel?</p>
        <p className="mt-1 text-sm text-muted-foreground">Be honest—the schedule adapts to your answer.</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {REVIEW_OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.rating}
              type="button"
              disabled={isSaving}
              onClick={() => onRate(option.rating)}
              data-testid={`button-rate-${option.rating}`}
              className={`min-h-[76px] rounded-2xl border p-3 text-left transition-transform active:scale-[0.98] disabled:opacity-50 ${option.className}`}
            >
              <Icon size={17} className="mb-2" />
              <span className="block text-sm font-bold">{option.label}</span>
              <span className="block text-xs opacity-70">{option.description}</span>
            </button>
          );
        })}
      </div>
      {progress?.lastRating && (
        <p className="mt-3 text-xs text-muted-foreground">
          Previously {formatLabel(progress.lastRating)} · scheduled {formatNextReview(progress.dueAt)}
        </p>
      )}
    </section>
  );
}

function FlashcardItem({
  card,
  progress,
  highlighted,
  onSelect,
}: {
  card: Flashcard;
  progress: FlashcardProgress | undefined;
  highlighted: boolean;
  onSelect: () => void;
}) {
  const status = reviewStatus(progress);
  return (
    <article
      data-testid={`flashcard-${card.id}`}
      className={`group relative flex min-h-[196px] flex-col overflow-hidden rounded-[1.6rem] border bg-card p-5 shadow-sm transition-all sm:min-h-[240px] sm:p-6 ${
        highlighted ? "-translate-y-0.5 border-primary ring-4 ring-primary/10" : "border-card-border hover:-translate-y-1 hover:border-primary/35 hover:shadow-md"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="absolute inset-0 z-10 cursor-pointer rounded-[1.6rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label={`Study flashcard: ${card.front}`}
      />
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate rounded-full bg-primary/9 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">
            {formatLabel(card.cardType)}
          </span>
          <span className="text-[11px] font-medium text-muted-foreground">{formatLabel(card.difficulty)}</span>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${status.className}`}>{status.label}</span>
      </div>
      <p className="mb-2 line-clamp-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{card.topic}</p>
      <h2 className="font-display text-[1.14rem] font-semibold leading-[1.45] text-card-foreground sm:text-xl">{card.front}</h2>
      <div className="mt-auto flex items-center justify-between border-t border-border/65 pt-4 text-xs font-semibold text-primary">
        <span>Tap to practice</span>
        <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
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
  onReveal,
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
  onReveal: () => void;
  onRate: (rating: FlashcardRating) => void;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const status = reviewStatus(progress);
  const progressPercent = total > 0 ? ((position + 1) / total) * 100 : 0;

  return (
    <Dialog open={Boolean(card)} onOpenChange={(open) => { if (!open) onClose(); }}>
      {card && (
        <DialogContent className="left-0 top-0 flex h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden border-0 bg-card p-0 shadow-2xl sm:left-[50%] sm:top-[50%] sm:h-[min(820px,92vh)] sm:w-[calc(100%-2rem)] sm:max-w-3xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-[2rem] sm:border sm:border-card-border">
          <div className="absolute inset-x-0 top-0 z-10 h-1 bg-muted">
            <div className="h-full rounded-r-full bg-primary transition-[width]" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-8 pt-12 sm:px-10 sm:pt-10">
            <DialogHeader className="pr-8 text-left">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">
                  {formatLabel(card.cardType)}
                </span>
                <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${status.className}`}>{status.label}</span>
                <span className="ml-auto text-xs font-semibold text-muted-foreground">{position + 1} / {total}</span>
              </div>
              <DialogDescription className="text-xs font-bold uppercase tracking-[0.15em] text-primary/80">
                {card.topic}
              </DialogDescription>
              <DialogTitle className="font-display text-[1.7rem] font-semibold leading-[1.25] sm:text-4xl sm:leading-[1.2]">
                {card.front}
              </DialogTitle>
            </DialogHeader>

            <div className="mt-7">
              {showAnswer ? (
                <>
                  <FlashcardAnswer card={card} />
                  <ReviewRating progress={progress} isSaving={isSaving} onRate={onRate} />
                </>
              ) : (
                <div className="relative overflow-hidden rounded-[1.7rem] border border-dashed border-primary/30 bg-primary/[0.055] px-5 py-9 text-center sm:px-8 sm:py-12">
                  <div className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-amber-300/25 blur-2xl" />
                  <Brain className="mx-auto mb-4 text-primary" size={28} />
                  <p className="font-display text-lg font-semibold">Pause. Say it in your own words.</p>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Retrieval is the workout. The answer is only the check.</p>
                  <Button data-testid={`button-dialog-reveal-${card.id}`} onClick={onReveal} size="lg" className="relative mt-6 min-h-12 rounded-xl px-7">
                    Reveal answer
                  </Button>
                </div>
              )}
            </div>

            {card.sourceReference && <p className="mt-6 text-xs text-muted-foreground">Source: {card.sourceReference}</p>}
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-card-border bg-background/80 px-4 pb-[max(0.8rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:px-6 sm:pb-3">
            <Button variant="ghost" onClick={onPrevious} disabled={position === 0} className="min-h-11 justify-self-start rounded-xl px-3">
              <ChevronLeft /> <span className="hidden sm:inline">Previous</span>
            </Button>
            <span className="text-xs font-semibold text-muted-foreground">Keep going</span>
            <Button variant="ghost" onClick={onNext} disabled={position === total - 1} className="min-h-11 justify-self-end rounded-xl px-3">
              <span className="hidden sm:inline">Next</span> <ChevronRight />
            </Button>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="min-h-11 rounded-xl bg-card"><SelectValue /></SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}

export default function FlashcardsPage() {
  const { theme, toggle } = useTheme();
  const { toast } = useToast();
  const [initialFilters] = useState(loadSavedFilters);
  const [category, setCategory] = useState(initialFilters.category);
  const [cardType, setCardType] = useState(initialFilters.cardType);
  const [difficulty, setDifficulty] = useState(initialFilters.difficulty);
  const [search, setSearch] = useState(initialFilters.search);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_CARDS);
  const [randomCardId, setRandomCardId] = useState<number | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [revealedCardIds, setRevealedCardIds] = useState<Set<number>>(() => new Set());

  const { data: cards = [], isLoading, isError } = useQuery<Flashcard[]>({ queryKey: ["/api/flashcards"] });
  const { data: progressEntries = [] } = useQuery<FlashcardProgress[]>({ queryKey: ["/api/flashcards/progress"] });

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
        title: `${formatLabel(savedProgress.lastRating ?? "review")}—nice work`,
        description: `This card returns ${formatNextReview(savedProgress.dueAt)}.`,
      });
    },
    onError: () => toast({ title: "Review did not save", description: "Please try that rating again.", variant: "destructive" }),
  });

  const categories = useMemo(() => Array.from(new Set(cards.map((card) => card.category))).sort(), [cards]);
  const cardTypes = useMemo(() => Array.from(new Set(cards.map((card) => card.cardType))).sort(), [cards]);
  const progressByCard = useMemo(() => new Map(progressEntries.map((entry) => [entry.cardId, entry])), [progressEntries]);
  const reviewedCount = useMemo(() => cards.filter((card) => (progressByCard.get(card.id)?.reviewCount ?? 0) > 0).length, [cards, progressByCard]);
  const dueCount = useMemo(() => cards.filter((card) => isDue(progressByCard.get(card.id))).length, [cards, progressByCard]);
  const activeFilterCount = [category, cardType, difficulty].filter((value) => value !== "All").length;

  const filteredCards = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return cards
      .filter((card) =>
        (category === "All" || card.category === category) &&
        (cardType === "All" || card.cardType === cardType) &&
        (difficulty === "All" || card.difficulty === difficulty) &&
        (!normalizedSearch || `${card.front} ${card.topic} ${card.answer}`.toLowerCase().includes(normalizedSearch))
      )
      .sort((a, b) => dueTime(progressByCard.get(a.id)) - dueTime(progressByCard.get(b.id)));
  }, [cards, category, cardType, difficulty, search, progressByCard]);

  const visibleCards = filteredCards.slice(0, visibleCount);
  const selectedCardIndex = filteredCards.findIndex((card) => card.id === selectedCardId);
  const selectedCard = selectedCardIndex >= 0 ? filteredCards[selectedCardIndex] : undefined;

  useEffect(() => setVisibleCount(INITIAL_VISIBLE_CARDS), [category, cardType, difficulty, search]);

  useEffect(() => {
    try {
      window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({ category, cardType, difficulty, search }));
    } catch {
      // Storage may be unavailable in restricted or private browsing contexts.
    }
  }, [category, cardType, difficulty, search]);

  const setCardRevealed = (cardId: number, revealed: boolean) => {
    setRevealedCardIds((current) => {
      const next = new Set(current);
      if (revealed) next.add(cardId); else next.delete(cardId);
      return next;
    });
  };

  const selectCard = (cardId: number) => {
    setSelectedCardId(cardId);
    setCardRevealed(cardId, false);
  };

  const closeSelectedCard = () => {
    if (selectedCardId !== null) setCardRevealed(selectedCardId, false);
    setSelectedCardId(null);
  };

  const moveToCard = (index: number) => {
    const nextCard = filteredCards[index];
    if (!nextCard) return;
    if (selectedCardId !== null) setCardRevealed(selectedCardId, false);
    setSelectedCardId(nextCard.id);
  };

  useEffect(() => {
    if (!selectedCard) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" && selectedCardIndex > 0) { event.preventDefault(); moveToCard(selectedCardIndex - 1); }
      if (event.key === "ArrowRight" && selectedCardIndex < filteredCards.length - 1) { event.preventDefault(); moveToCard(selectedCardIndex + 1); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredCards, selectedCard, selectedCardId, selectedCardIndex]);

  const startReview = () => {
    const next = filteredCards.find((card) => isDue(progressByCard.get(card.id))) ?? filteredCards[0];
    if (next) selectCard(next.id);
  };

  const randomCard = () => {
    if (filteredCards.length === 0) return;
    const candidates = filteredCards.length > 1 ? filteredCards.filter((card) => card.id !== randomCardId) : filteredCards;
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    setRandomCardId(picked.id);
    selectCard(picked.id);
  };

  const resetFilters = () => {
    setCategory("All"); setCardType("All"); setDifficulty("All"); setSearch("");
  };

  const rateAndAdvance = (rating: FlashcardRating) => {
    if (!selectedCard) return;
    reviewMutation.mutate({ cardId: selectedCard.id, rating }, {
      onSuccess: () => {
        window.setTimeout(() => {
          if (selectedCardIndex < filteredCards.length - 1) moveToCard(selectedCardIndex + 1);
        }, 360);
      },
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-card-border/80 bg-background/88 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <BookOpenCheck size={18} />
            </div>
            <div>
              <p className="font-display text-[15px] font-bold leading-none">Recall</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Career deck</p>
            </div>
          </div>
          <button
            onClick={toggle}
            data-testid="button-theme-toggle"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-bold shadow-xs transition-colors hover:bg-accent"
            aria-label="Toggle color theme"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            <span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 sm:px-6 sm:pb-12 sm:pt-8">
        <section className="deck-hero relative overflow-hidden rounded-[2rem] px-5 py-6 text-[#fff8e8] shadow-lg sm:px-9 sm:py-9">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-amber-300/25 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-emerald-200/10 blur-3xl" />
          <div className="relative grid gap-7 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.15em] sm:mb-4">
                <Sparkles size={14} /> Today’s deck
              </div>
              <h1 className="max-w-xl font-display text-[1.82rem] font-semibold leading-[1.08] sm:text-5xl">Turn what you know into what you can recall.</h1>
              <p className="mt-3 max-w-lg text-sm leading-5 text-white/75 sm:mt-4 sm:text-base sm:leading-6">A few focused cards beat another hour of rereading.</p>
              <div className="mt-5 grid grid-cols-2 gap-2.5 sm:mt-6 sm:flex">
                <Button onClick={startReview} disabled={filteredCards.length === 0} size="lg" className="min-h-12 rounded-xl border-white/10 bg-[#fff8e8] px-3 text-sm font-bold text-[#29493b] shadow-sm hover:bg-white sm:px-6">
                  Start review <ArrowRight />
                </Button>
                <Button onClick={randomCard} disabled={filteredCards.length === 0} variant="ghost" size="lg" className="min-h-12 rounded-xl border-white/20 bg-white/10 px-3 text-sm font-bold text-white hover:bg-white/15 sm:px-5">
                  <Shuffle /> Surprise me
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-black/10 p-1.5 backdrop-blur-sm sm:gap-2 sm:p-2">
              <div className="rounded-xl bg-white/10 px-2 py-2.5 text-center sm:px-3 sm:py-3.5"><strong className="block font-display text-xl sm:text-2xl">{dueCount}</strong><span className="text-[9px] font-bold uppercase tracking-wider text-white/65 sm:text-[10px]">Due</span></div>
              <div className="rounded-xl bg-white/10 px-2 py-2.5 text-center sm:px-3 sm:py-3.5"><strong className="block font-display text-xl sm:text-2xl">{reviewedCount}</strong><span className="text-[9px] font-bold uppercase tracking-wider text-white/65 sm:text-[10px]">Practiced</span></div>
              <div className="rounded-xl bg-white/10 px-2 py-2.5 text-center sm:px-3 sm:py-3.5"><strong className="block font-display text-xl sm:text-2xl">{cards.length}</strong><span className="text-[9px] font-bold uppercase tracking-wider text-white/65 sm:text-[10px]">Total</span></div>
            </div>
          </div>
        </section>

        <section className="mt-6 sm:mt-10">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Explore</p>
              <h2 className="font-display text-2xl font-semibold sm:text-3xl">Browse your deck</h2>
            </div>
            <p className="hidden text-sm text-muted-foreground sm:block">{filteredCards.length} matching cards</p>
          </div>

          <div className="rounded-[1.5rem] border border-card-border bg-card/75 p-3 shadow-sm sm:p-4">
            <div className="flex gap-2">
              <label className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
                <span className="sr-only">Search cards</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  type="search"
                  placeholder="Search questions or topics"
                  className="min-h-12 w-full rounded-xl border border-border bg-background pl-10 pr-10 text-sm outline-none transition-shadow placeholder:text-muted-foreground/75 focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
                {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-muted" aria-label="Clear search"><X size={15} /></button>}
              </label>
              <Button variant="outline" onClick={() => setFiltersOpen((open) => !open)} className="relative min-h-12 rounded-xl bg-background px-3 sm:px-4">
                <Filter /> <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{activeFilterCount}</span>}
              </Button>
            </div>

            {filtersOpen && (
              <div className="mt-3 grid gap-3 border-t border-border/70 pt-4 sm:grid-cols-3">
                <FilterSelect label="Category" value={category} onChange={setCategory}>
                  <SelectItem value="All">All categories</SelectItem>
                  {categories.map((value) => <SelectItem key={value} value={value}>{formatLabel(value)}</SelectItem>)}
                </FilterSelect>
                <FilterSelect label="Card type" value={cardType} onChange={setCardType}>
                  <SelectItem value="All">All card types</SelectItem>
                  {cardTypes.map((value) => <SelectItem key={value} value={value}>{formatLabel(value)}</SelectItem>)}
                </FilterSelect>
                <FilterSelect label="Difficulty" value={difficulty} onChange={setDifficulty}>
                  <SelectItem value="All">All difficulties</SelectItem>
                  {CARD_DIFFICULTIES.map((value) => <SelectItem key={value} value={value}>{formatLabel(value)}</SelectItem>)}
                </FilterSelect>
                {activeFilterCount > 0 && <button onClick={resetFilters} className="text-left text-xs font-bold text-primary hover:underline sm:col-span-3">Reset all filters</button>}
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between sm:hidden">
            <p className="text-xs font-semibold text-muted-foreground">{filteredCards.length} matching cards</p>
            {(activeFilterCount > 0 || search) && <button onClick={resetFilters} className="text-xs font-bold text-primary">Reset</button>}
          </div>
        </section>

        {isLoading ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => <div key={item} className="h-60 animate-pulse rounded-[1.6rem] border border-card-border bg-card" />)}
          </div>
        ) : isError ? (
          <div className="mt-5 rounded-[1.5rem] border border-rose-200 bg-rose-50 py-16 text-center text-sm text-rose-700">Could not load your deck. Please refresh and try again.</div>
        ) : filteredCards.length === 0 ? (
          <div className="mt-5 rounded-[1.5rem] border border-dashed border-border bg-card/70 py-16 text-center text-muted-foreground">
            <Search size={30} className="mx-auto mb-3 opacity-35" />
            <p className="font-display text-lg font-semibold text-foreground">No cards found</p>
            <p className="mt-1 text-sm">Try a broader search or reset the filters.</p>
          </div>
        ) : (
          <>
            <section className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {visibleCards.map((card) => (
                <FlashcardItem key={card.id} card={card} progress={progressByCard.get(card.id)} highlighted={card.id === randomCardId} onSelect={() => selectCard(card.id)} />
              ))}
            </section>
            {visibleCount < filteredCards.length && (
              <div className="mt-6 text-center">
                <Button variant="outline" onClick={() => setVisibleCount((count) => count + INITIAL_VISIBLE_CARDS)} className="min-h-12 rounded-xl bg-card px-6">
                  <Layers3 /> Show more cards
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-card-border bg-card/92 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:hidden">
        <Button onClick={startReview} disabled={filteredCards.length === 0} className="min-h-12 w-full rounded-xl text-sm font-bold shadow-md">
          <BookOpenCheck /> Review due cards <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">{dueCount}</span>
        </Button>
      </div>

      <FlashcardFocusDialog
        card={selectedCard}
        position={selectedCardIndex}
        total={filteredCards.length}
        showAnswer={selectedCard ? revealedCardIds.has(selectedCard.id) : false}
        progress={selectedCard ? progressByCard.get(selectedCard.id) : undefined}
        isSaving={reviewMutation.isPending}
        onReveal={() => { if (selectedCard) setCardRevealed(selectedCard.id, true); }}
        onRate={rateAndAdvance}
        onPrevious={() => moveToCard(selectedCardIndex - 1)}
        onNext={() => moveToCard(selectedCardIndex + 1)}
        onClose={closeSelectedCard}
      />
    </div>
  );
}
