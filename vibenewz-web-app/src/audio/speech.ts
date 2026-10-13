// ============================================================
// speech.ts — the audio player that reads article summaries.
// Uses the browser's built-in text-to-speech (Web Speech API),
// so it's free and needs no API key.
//
// Browser speech can't jump to a time like an mp3, so the summary
// is split into short chunks (about a sentence each). Seeking starts
// speaking again from the nearest word, and the progress line is an
// estimate based on how far through the text we are.
// ============================================================

import { useEffect, useState } from "react";
import { NewsArticle } from "../api";

const synth: SpeechSynthesis | null =
  typeof window !== "undefined" && "speechSynthesis" in window
    ? window.speechSynthesis
    : null;

export const speechSupported = synth !== null;

export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const CHARS_PER_SECOND = 14; // rough speaking pace at 1x, for the timer
const MAX_SUMMARY_CHARS = 500;
const MAX_CHUNK_CHARS = 180;

export type PlayerStatus = "idle" | "playing" | "paused" | "ended";

interface Chunk {
  text: string;
  start: number; // position of this chunk inside the full summary
}

// ---- Player state (one player for the whole app) ---------------------
let article: NewsArticle | null = null;
let playlist: NewsArticle[] = [];
// The stories on the last list page shown (Home or Bookmarks), so audio
// started from an article page can still move to the next/previous one
let browseList: NewsArticle[] = [];
let status: PlayerStatus = "idle";
let rate = 1;
let chunks: Chunk[] = [];
let totalChars = 0;
let position = 0; // where we are when not playing
// While playing: the last known spot and when we were there
let anchorChar = 0;
let anchorAt = 0;
let chunkEnd = 0;
let utteranceToken = 0; // ignores events from cancelled utterances

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((listener) => listener());
}

// ---- What gets read --------------------------------------------------
// "Title. Description. From Source." — description trimmed to a sentence
export function summaryText(item: NewsArticle): string {
  const title = (item.title || "").trim();
  let about = (item.description || item.content || "")
    .replace(/\s+/g, " ")
    .trim();
  if (about.length > MAX_SUMMARY_CHARS) {
    const cut = about.slice(0, MAX_SUMMARY_CHARS);
    const lastStop = cut.lastIndexOf(". ");
    about = lastStop > 100 ? cut.slice(0, lastStop + 1) : `${cut}…`;
  }
  const source = item.source ? `From ${item.source}.` : "";
  return [title.replace(/[.!?]*$/, "."), about, source]
    .filter(Boolean)
    .join(" ");
}

// Split into sentences, then break long sentences at a comma or space
function splitIntoChunks(text: string): Chunk[] {
  const pieces: string[] = [];
  for (const sentence of text.split(/(?<=[.!?…])\s+/)) {
    let rest = sentence;
    while (rest.length > MAX_CHUNK_CHARS) {
      const head = rest.slice(0, MAX_CHUNK_CHARS);
      const comma = head.lastIndexOf(", ");
      const space = head.lastIndexOf(" ");
      const at = comma > 60 ? comma + 1 : space > 0 ? space : MAX_CHUNK_CHARS;
      pieces.push(rest.slice(0, at).trim());
      rest = rest.slice(at).trim();
    }
    if (rest) pieces.push(rest);
  }
  const result: Chunk[] = [];
  let start = 0;
  for (const piece of pieces) {
    result.push({ text: piece, start });
    start += piece.length + 1;
  }
  return result;
}

// ---- Speaking --------------------------------------------------------
function currentPosition(): number {
  if (status !== "playing") return position;
  const spoken = ((Date.now() - anchorAt) / 1000) * CHARS_PER_SECOND * rate;
  return Math.min(chunkEnd, anchorChar + spoken);
}

function silence() {
  utteranceToken++;
  synth?.cancel();
}

// Start speaking from a character position (snapped back to a word start)
function speakFrom(at: number) {
  if (!synth || chunks.length === 0) return;
  silence();
  const token = utteranceToken;

  let index = chunks.findIndex((c) => at < c.start + c.text.length + 1);
  if (index === -1) index = chunks.length - 1;
  const chunk = chunks[index];
  let local = Math.max(
    0,
    Math.min(chunk.text.length, Math.round(at - chunk.start)),
  );
  if (local > 0) local = chunk.text.lastIndexOf(" ", local) + 1;
  const base = chunk.start + local;

  status = "playing";
  anchorChar = base;
  anchorAt = Date.now();
  chunkEnd = chunk.start + chunk.text.length;
  notify();

  const utterance = new SpeechSynthesisUtterance(chunk.text.slice(local));
  utterance.rate = rate;
  utterance.onboundary = (e) => {
    if (token !== utteranceToken) return;
    anchorChar = base + e.charIndex;
    anchorAt = Date.now();
  };
  utterance.onend = () => {
    if (token !== utteranceToken) return;
    const next = chunks[index + 1];
    if (next) {
      speakFrom(next.start);
    } else {
      status = "ended";
      position = totalChars;
      notify();
    }
  };
  utterance.onerror = (e) => {
    if (token !== utteranceToken) return;
    if (e.error === "interrupted" || e.error === "canceled") return;
    position = currentPosition();
    status = "paused";
    notify();
  };

  // Chrome sometimes drops speech queued right after cancel(), so wait a tick
  setTimeout(() => {
    if (token === utteranceToken) synth.speak(utterance);
  }, 30);
}

// ---- Controls --------------------------------------------------------

// Load an article and start from the beginning. `list` is the set of
// stories Previous/Next move through (e.g. the cards on the page).
export function playArticle(item: NewsArticle, list?: NewsArticle[]) {
  if (!synth) return;
  const has = (l: NewsArticle[]) => l.some((a) => a.id === item.id);
  if (list && has(list)) playlist = list;
  else if (has(playlist)) {
    // keep the current list
  } else if (has(browseList)) playlist = browseList;
  else playlist = [item];
  article = item;
  chunks = splitIntoChunks(summaryText(item));
  const last = chunks[chunks.length - 1];
  totalChars = last ? last.start + last.text.length : 0;
  position = 0;
  speakFrom(0);
}

export function pause() {
  if (status !== "playing") return;
  position = currentPosition();
  silence();
  status = "paused";
  notify();
}

export function resume() {
  if (!article) return;
  if (status === "ended" || position >= totalChars) position = 0;
  speakFrom(position);
}

export function togglePlay() {
  if (status === "playing") pause();
  else resume();
}

// Close the player completely
export function stopSpeaking() {
  silence();
  article = null;
  status = "idle";
  position = 0;
  notify();
}

// Jump to a spot on the progress line (0 = start, 1 = end)
export function seekTo(fraction: number) {
  if (!article) return;
  const target = Math.max(0, Math.min(1, fraction)) * totalChars;
  if (status === "playing") {
    speakFrom(target);
  } else {
    position = target;
    status = "paused";
    notify();
  }
}

export function setSpeed(newRate: number) {
  const at = currentPosition();
  rate = newRate;
  if (status === "playing") speakFrom(at);
  else notify();
}

function playlistIndex() {
  return article ? playlist.findIndex((a) => a.id === article!.id) : -1;
}

export function playNext() {
  const next = playlist[playlistIndex() + 1];
  if (next) playArticle(next);
}

export function playPrevious() {
  const i = playlistIndex();
  if (i > 0) playArticle(playlist[i - 1]);
}

// ---- Hooks -----------------------------------------------------------

// Everything the player bar needs; re-renders while audio plays
export function useAudioPlayer() {
  const [, rerender] = useState(0);

  useEffect(() => {
    const listener = () => rerender((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  // Move the progress line along while speaking
  useEffect(() => {
    if (status !== "playing") return;
    const timer = setInterval(() => rerender((n) => n + 1), 250);
    return () => clearInterval(timer);
  }, [status]);

  const index = playlistIndex();
  const secondsPerChar = 1 / (CHARS_PER_SECOND * rate);
  return {
    article,
    status,
    rate,
    progress: totalChars ? currentPosition() / totalChars : 0,
    elapsedSeconds: currentPosition() * secondsPerChar,
    totalSeconds: totalChars * secondsPerChar,
    hasPrevious: index > 0,
    hasNext: index !== -1 && index < playlist.length - 1,
  };
}

// For a Listen button on one article
export function useArticleAudio(
  item: NewsArticle | null,
  list?: NewsArticle[],
) {
  const [, rerender] = useState(0);

  useEffect(() => {
    const listener = () => rerender((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  // Remember the list this button is shown in, for Previous/Next
  useEffect(() => {
    if (list && list.length) browseList = list;
  }, [list]);

  const isCurrent = !!item && article?.id === item.id;
  const playing = isCurrent && status === "playing";

  function toggle() {
    if (!item) return;
    if (isCurrent) togglePlay();
    else playArticle(item, list);
  }

  return { supported: speechSupported, playing, toggle };
}
