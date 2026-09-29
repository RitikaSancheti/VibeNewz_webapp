// ============================================================
// WellbeingContext.tsx
//
// Remembers the "feel" side of the app for each user:
//   • mood check-ins ("How are you feeling?")
//   • which stories they read and for how long (for "Your reading balance")
//   • stories they liked (shown under Bookmarks → Liked)
//
// Saved with AsyncStorage (same as AuthContext), one entry per username.
// ============================================================

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./AuthContext";
import { NewsArticle, Sentiment } from "../api";

export type Mood = "HOPEFUL" | "CALM" | "CURIOUS" | "CONCERNED";

// Each mood changes the ORDER of your feed (nothing is hidden).
// `order` = which sentiments come first.
export const MOODS: {
  key: Mood;
  label: string;
  face: string;
  message: string;
  order: Sentiment[] | null;
}[] = [
  {
    key: "HOPEFUL",
    label: "Hopeful",
    face: "‿",
    message: "Feeling hopeful. We'll keep that in mind.",
    order: null,
  },
  {
    key: "CALM",
    label: "Calm",
    face: "⌒",
    message: "Feeling calm. Gentle stories come first today.",
    order: ["POSITIVE", "NEUTRAL", "NEGATIVE"],
  },
  {
    key: "CURIOUS",
    label: "Curious",
    face: "?",
    message: "Feeling curious. Explainers and fresh ideas first.",
    order: ["NEUTRAL", "POSITIVE", "NEGATIVE"],
  },
  {
    key: "CONCERNED",
    label: "Concerned",
    face: "~",
    message: "Feeling concerned. Heavier stories move to the bottom.",
    order: ["POSITIVE", "NEUTRAL", "NEGATIVE"],
  },
];

export interface ReadEvent {
  id: number;
  sentiment: Sentiment;
  at: number;
  seconds: number;
}

interface WellbeingState {
  mood: Mood | null;
  moodHistory: { mood: Mood; at: number }[];
  reads: ReadEvent[];
  likes: NewsArticle[]; // full article, so the Liked tab can show it
}

const DEFAULT_STATE: WellbeingState = {
  mood: null,
  moodHistory: [],
  reads: [],
  likes: [],
};

interface WellbeingContextType extends WellbeingState {
  ready: boolean;
  setMood: (mood: Mood) => void;
  recordRead: (article: NewsArticle, seconds: number) => void;
  toggleLike: (article: NewsArticle) => void;
  isLiked: (id: number) => boolean;
}

const WellbeingContext = createContext<WellbeingContextType | null>(null);

export function WellbeingProvider({ children }: { children: ReactNode }) {
  const { username } = useAuth();
  const [state, setState] = useState<WellbeingState>(DEFAULT_STATE);
  const [ready, setReady] = useState(false);
  const storageKey = username ? `vibenewz_wellbeing_${username}` : null;

  useEffect(() => {
    setReady(false);
    if (!storageKey) {
      setState(DEFAULT_STATE);
      return;
    }
    AsyncStorage.getItem(storageKey)
      .then((stored) => {
        const saved = stored ? JSON.parse(stored) : {};
        setState({
          mood: saved.mood ?? null,
          moodHistory: saved.moodHistory ?? [],
          reads: saved.reads ?? [],
          likes: Array.isArray(saved.likes) ? saved.likes : [],
        });
      })
      .catch(() => setState(DEFAULT_STATE))
      .finally(() => setReady(true));
  }, [storageKey]);

  const update = useCallback(
    (change: (prev: WellbeingState) => WellbeingState) => {
      setState((prev) => {
        const next = change(prev);
        if (storageKey)
          AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch(
            () => {},
          );
        return next;
      });
    },
    [storageKey],
  );

  const value = useMemo<WellbeingContextType>(
    () => ({
      ...state,
      ready,
      setMood: (mood) =>
        update((prev) => ({
          ...prev,
          mood,
          moodHistory: [...prev.moodHistory, { mood, at: Date.now() }].slice(
            -60,
          ),
        })),
      recordRead: (article, seconds) =>
        update((prev) => ({
          ...prev,
          reads: [
            ...prev.reads,
            {
              id: article.id,
              sentiment: article.sentiment,
              at: Date.now(),
              seconds: Math.min(1800, Math.max(1, Math.round(seconds))),
            },
          ].slice(-500),
        })),
      toggleLike: (article) =>
        update((prev) => ({
          ...prev,
          likes: prev.likes.some((a) => a.id === article.id)
            ? prev.likes.filter((a) => a.id !== article.id)
            : [article, ...prev.likes],
        })),
      isLiked: (id) => state.likes.some((a) => a.id === id),
    }),
    [state, ready, update],
  );

  return (
    <WellbeingContext.Provider value={value}>
      {children}
    </WellbeingContext.Provider>
  );
}

export function useWellbeing() {
  const ctx = useContext(WellbeingContext);
  if (!ctx)
    throw new Error("useWellbeing must be used inside WellbeingProvider");
  return ctx;
}

// ---- Mood ordering (used on Home) ------------------------------------
export function orderByMood(
  articles: NewsArticle[],
  mood: Mood | null,
): NewsArticle[] {
  const byDate = (a: NewsArticle, b: NewsArticle) =>
    new Date(b.published_at || 0).getTime() -
    new Date(a.published_at || 0).getTime();
  const order = MOODS.find((m) => m.key === mood)?.order;
  if (!order) return [...articles].sort(byDate);
  const rank = (s: Sentiment) => order.indexOf(s);
  return [...articles].sort(
    (a, b) => rank(a.sentiment) - rank(b.sentiment) || byDate(a, b),
  );
}

// ---- Reading balance maths ----
const WEEK = 7 * 24 * 60 * 60 * 1000;

export function weeklyBalance(reads: ReadEvent[], now = Date.now()) {
  const thisWeek = reads.filter((r) => r.at > now - WEEK);
  const lastWeek = reads.filter(
    (r) => r.at <= now - WEEK && r.at > now - 2 * WEEK,
  );

  const unique = new Map<number, Sentiment>();
  thisWeek.forEach((r) => unique.set(r.id, r.sentiment));
  const total = unique.size;
  const count = (s: Sentiment) =>
    [...unique.values()].filter((v) => v === s).length;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  const positive = pct(count("POSITIVE"));
  const neutral = pct(count("NEUTRAL"));
  const deeper = total ? 100 - positive - neutral : 0;

  const stressShare = (list: ReadEvent[]) => {
    const all = list.reduce((sum, r) => sum + r.seconds, 0);
    const neg = list
      .filter((r) => r.sentiment === "NEGATIVE")
      .reduce((sum, r) => sum + r.seconds, 0);
    return all ? neg / all : null;
  };
  const now7 = stressShare(thisWeek);
  const prev7 = stressShare(lastWeek);

  let insight: string;
  if (total === 0) {
    insight = "Open a story and we'll start tracking how your reading feels.";
  } else if (now7 === null || prev7 === null || prev7 === 0) {
    insight =
      deeper <= 20
        ? "A gentle week so far. Most of what you read left room to breathe."
        : "You've taken on some heavier stories this week. Remember to pause.";
  } else {
    const change = Math.round(((prev7 - now7) / prev7) * 100);
    insight =
      change >= 0
        ? `You spent ${change}% less time on stressful stories this week.`
        : `You spent ${Math.abs(change)}% more time on stressful stories this week. Be kind to yourself.`;
  }

  return { total, positive, neutral, deeper, insight };
}
