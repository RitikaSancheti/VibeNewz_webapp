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
// If anything goes wrong (network hiccup, model is asleep, weird
// response) we just return "NEUTRAL" instead of crashing — a bad
// sentiment guess is fine, a crashed server is not.
// ============================================================

const BASE_URL = process.env.SENTIMENT_API_BASE_URL;
const QUEUE_DELAY_MS = 3000; // how long we wait before checking the result

async function getSentiment(title, description) {
  const text = `${title || ""}. ${description || ""}`;

  try {
    const eventId = await postToQueue(text);
    if (!eventId) {
      console.warn("[sentiment] no event_id returned, defaulting to NEUTRAL");
      return "NEUTRAL";
    }

    // give the model a moment to process the request
    await sleep(QUEUE_DELAY_MS);

    const rawStream = await fetchResult(eventId);
    const label = parseSseStream(rawStream);
    console.log(`[sentiment] model said: "${label}"`);
    return mapToEnum(label);
  } catch (err) {
    console.error(
      "[sentiment] request failed, defaulting to NEUTRAL:",
      err.message,
    );
    return "NEUTRAL";
  }
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
// The bug that was here before: we returned on the FIRST "data:" line we
// found, which is usually that early, empty/partial "generating" event —
// not the model's actual answer. Since that text never contains the word
// "positive" or "negative", every article silently fell through to the
// NEUTRAL default, even though the model itself was working fine.
//
// Fix: read through the WHOLE stream and keep the LAST "data:" line —
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
// The model's real output looks like this (confirmed from the actual
// Space UI):
//   POSITIVE — 42.3% confidence
//
//   Negative  36.9%
//   Neutral   20.8%
//   Positive  42.3%
//
// IMPORTANT: all three words show up in that text, every time (it's a
// full confidence breakdown, not just the winner). Testing the whole
// blob at once for "does it contain the word positive" was matching
// "positive" almos
