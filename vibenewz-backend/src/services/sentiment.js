// ============================================================
// sentiment.js
//
// Asks a free hosted AI model "is this headline positive, neutral,
// or negative?" and returns one of: "POSITIVE", "NEUTRAL", "NEGATIVE".
//
// This is a straight port of what your Java AiSentimentService.java did.
// The model is hosted on Hugging Face as a "Gradio" app, which works in
// two steps:
//   1. POST the text -> get back a ticket ("event_id")
//   2. GET that ticket a couple seconds later -> read the result
//
// If the model is busy or broken we retry a few times, and if it still
// fails we fall back to a simple word-based guess — never a crash.
// ============================================================

const BASE_URL = process.env.SENTIMENT_API_BASE_URL;
const QUEUE_DELAY_MS = 3000; // how long we wait before checking the result

const MAX_ATTEMPTS = 3; // the free model is often busy — try a few times

async function getSentiment(title, description) {
  const text = `${title || ""}. ${description || ""}`;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const eventId = await postToQueue(text);
      if (eventId) {
        // give the model a moment to process the request
        await sleep(QUEUE_DELAY_MS);

        const rawStream = await fetchResult(eventId);
        const label = parseSseStream(rawStream);

        // A real answer mentions positive/negative/neutral. An error page
        // (e.g. Hugging Face's "500 — Sorry, there is an error on our side")
        // does not — treat that as a failure and try again.
        if (looksLikeModelAnswer(label)) {
          const result = mapToEnum(label);
          console.log(
            `[sentiment] model said: ${result} (${firstLine(label)})`,
          );
          return result;
        }
        console.warn(
          `[sentiment] model returned an error page (attempt ${attempt}/${MAX_ATTEMPTS})`,
        );
      } else {
        console.warn(
          `[sentiment] model is busy (attempt ${attempt}/${MAX_ATTEMPTS})`,
        );
      }
    } catch (err) {
      console.warn(
        `[sentiment] request failed (attempt ${attempt}/${MAX_ATTEMPTS}): ${err.message}`,
      );
    }
    if (attempt < MAX_ATTEMPTS) await sleep(1500 * attempt); // wait a bit longer each time
  }

  // The model never answered — use a simple word-based guess instead of
  // blindly calling every failed article NEUTRAL.
  const guess = keywordSentiment(text);
  console.warn(`[sentiment] model unavailable, word-based guess: ${guess}`);
  return guess;
}

function looksLikeModelAnswer(label) {
  if (!label || /<html|<!doctype/i.test(label)) return false;
  return /positive|negative|neutral/i.test(label);
}

function firstLine(text) {
  return (
    String(text)
      .split("\n")
      .find((l) => l.trim()) || ""
  ).trim();
}

// ---- Backup scorer (only used when the AI model is down) ----------------
// Counts hopeful vs. heavy words in the headline + description.
// Each entry matches the START of a word ("celebrat" → celebrate,
// celebrates, celebration) so "war" won't match "award".
const POSITIVE_WORDS = [
  "breakthrough",
  "celebrat",
  "record-breaking",
  "wins?\\b",
  "won\\b",
  "success",
  "improv",
  "recover",
  "rescu",
  "saved\\b",
  "cure",
  "hope\\b",
  "hopeful",
  "donat",
  "volunteer",
  "restor",
  "thriv",
  "boost",
  "award",
  "milestone",
  "innovat",
  "renewable",
  "clean energy",
  "protect",
  "reunit",
  "kindness",
  "first-ever",
  "discover",
  "joy",
  "inspir",
  "heal",
  "honou?r",
  "achiev",
  "triumph",
  "uplift",
];
const NEGATIVE_WORDS = [
  "kill",
  "dead\\b",
  "death",
  "dies?\\b",
  "died\\b",
  "wars?\\b",
  "attack",
  "crash",
  "flood",
  "fires?\\b",
  "shoot",
  "crisis",
  "collaps",
  "fraud",
  "scandal",
  "lawsuit",
  "arrest",
  "injur",
  "victim",
  "threat",
  "disaster",
  "violen",
  "fear",
  "losses\\b",
  "decline",
  "slump",
  "layoff",
  "recession",
  "outbreak",
  "bomb",
  "abus",
  "corrupt",
  "tariff",
  "warn",
  "conflict",
  "murder",
  "terror",
  "famine",
  "drought",
];
const toRegex = (list) => list.map((w) => new RegExp(`\\b${w}`, "i"));
const POSITIVE_RE = toRegex(POSITIVE_WORDS);
const NEGATIVE_RE = toRegex(NEGATIVE_WORDS);

function keywordSentiment(text) {
  const t = String(text);
  const pos = POSITIVE_RE.filter((re) => re.test(t)).length;
  const neg = NEGATIVE_RE.filter((re) => re.test(t)).length;
  if (pos > neg) return "POSITIVE";
  if (neg > pos) return "NEGATIVE";
  return "NEUTRAL";
}

// Step 1: submit the text, get back an event_id
async function postToQueue(text) {
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: [text] }),
  });

  if (!response.ok) {
    console.warn(`[sentiment] POST failed with status ${response.status}`);
    return null;
  }

  const json = await response.json();
  return json.event_id || null;
}

// Step 2: fetch the streamed result for that event_id
async function fetchResult(eventId) {
  const response = await fetch(`${BASE_URL}/${eventId}`, {
    headers: { Accept: "text/event-stream" },
  });
  return response.text();
}

// The response looks like Server-Sent Events, and Gradio sends SEVERAL
// of these as the model works — e.g. a "generating" event with a partial
// answer, followed later by the real one:
//   event: generating
//   data: [""]
//   event: complete
//   data: ["Positive — 94.2% confidence"]
//
// We read through the WHOLE stream and keep the LAST "data:" line —
// that's the final "complete" event with the real result.
function parseSseStream(rawStream) {
  if (!rawStream) return "";

  let lastResult = null;

  for (const line of rawStream.split("\n")) {
    if (line.startsWith("data: ")) {
      const jsonArrayText = line.slice(6).trim();
      try {
        const arr = JSON.parse(jsonArrayText);
        if (Array.isArray(arr) && arr.length > 0 && arr[0]) {
          lastResult = String(arr[0]);
        }
      } catch {
        // not valid JSON on this line, keep looking
      }
    }
  }

  return lastResult !== null ? lastResult : rawStream;
}

// Turns whatever text the model said into one of our three fixed values.
//
// The model's real output looks like this:
//   🔴 NEGATIVE  —  75.8% confidence
//
//   🔴 Negative   75.8%
//   🟡 Neutral    6.6%
//   🟢 Positive   17.6%
//
// All three words show up every time (it's a full breakdown), so:
//   1. If the first line is the "... confidence" winner line, use it.
//   2. Otherwise pick the label with the highest % in the breakdown.
//   3. Otherwise look for a plain word, and fall back to NEUTRAL.
function mapToEnum(label) {
  if (!label) return "NEUTRAL";
  const text = String(label);
  const firstLine = (
    text.split("\n").find((l) => l.trim()) || ""
  ).toLowerCase();
  const pick = (line) =>
    line.includes("positive")
      ? "POSITIVE"
      : line.includes("negative")
        ? "NEGATIVE"
        : line.includes("neutral")
          ? "NEUTRAL"
          : null;

  // 1. The winner line, e.g. "POSITIVE — 42.3% confidence"
  if (firstLine.includes("confidence") && pick(firstLine))
    return pick(firstLine);

  // 2. Otherwise pick the label with the highest % in the breakdown
  const scores = {};
  const re = /(positive|negative|neutral)[^0-9\n]*([0-9]+(?:\.[0-9]+)?)\s*%/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    scores[m[1].toUpperCase()] = parseFloat(m[2]);
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  if (best) return best[0];

  // 3. A plain one-word answer like "positive"
  return pick(firstLine) || "NEUTRAL";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { getSentiment, mapToEnum, keywordSentiment };
