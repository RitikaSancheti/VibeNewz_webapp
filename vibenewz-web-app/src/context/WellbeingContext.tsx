// ============================================================
// WellbeingContext.tsx — vibe slider, mood check-ins, reading
// history (for "Your reading balance") and likes, saved per user.
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

export const MOODS: {
  key: Mood;
  label: string;
  face: string;
  message: string;
  vibeShift: number;
}[] = [
  // vibeShift nudges how uplifting the feed is (in % points)
  {
    key: "HOPEFUL",
    label: "Hopeful",
    face: "‿",
    message: "Feeling hopeful. We'll keep that in mind.",
    vibeShift: 0,
  },
  {
    key: "CALM",
    label: "Calm",
    face: "⌒",
    message: "Feeling calm. We'll keep things gentle today.",
    vibeShift: 5,
  },
  {
    key: "CURIOUS",
    label: "Curious",
    face: "?",
    message: "Feeling curious. Expect a few more explainers.",
    vibeShift: -10,
  },
  {
    key: "CONCERNED",
    label: "Concerned",
    face: "~",
    message: "Feeling concerned. We'll lean a little brighter for you.",
    vibeShift: 10,
  },
];

export interface ReadEvent {
  id: number;
  sentiment: Sentiment;
  at: number;
  seconds: number;
}

interface WellbeingState {
  vibe: number;
  mood: Mood | null;
  moodHistory: { mood: Mood; at: number }[];
  reads: ReadEvent[];
  liked: number[];
}

const DEFAULT_STATE: WellbeingState = {
  vibe: 76,
  mood: null,
  moodHistory: [],
  reads: [],
  liked: [],
};

interface WellbeingContextType extends WellbeingState {
  ready: boolean;
  upliftingShare: number;
  setVibe: (value: number) => void;
  setMood: (mood: Mood) => void;
  recordRead: (article: NewsArticle, seconds: number) => void;
  toggleLike: (id: number) => void;
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
      .then((stored) =>
        setState(
          stored ? { ...DEFAULT_STATE, ...JSON.parse(stored) } : DEFAULT_STATE,
        ),
      )
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

  const value = useMemo<WellbeingContextType>(() => {
    const shift = MOODS.find((m) => m.key === state.mood)?.vibeShift || 0;
    return {
      ...state,
      ready,
      upliftingShare: Math.min(100, Math.max(0, state.vibe + shift)) / 100,
      setVibe: (vibe) =>
        update((prev) => ({ ...prev, vibe: Math.round(vibe) })),
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
      toggleLike: (id) =>
        update((prev) => ({
          ...prev,
          liked: prev.liked.includes(id)
            ? prev.liked.filter((x) => x !== id)
            : [...prev.liked, id],
        })),
      isLiked: (id) => state.liked.includes(id),
    };
  }, [state, ready, update]);

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
