// ============================================================
// newsFetch.js
//
// Talks to NewsData.io, saves new articles into Supabase (running each
// one through the AI sentiment model first), and builds the "balanced
// feed" the Dashboard shows (mostly positive articles, with some
// neutral/negative mixed in).
//
// This mirrors NewsFetchService.java from your old backend.
// ============================================================

const supabase = require("../supabaseClient");
const { getSentiment } = require("./sentiment");

const NEWSDATA_BASE_URL = "https://newsdata.io/api/1/latest";
const CACHE_MINUTES = 30;

// Your app's topic names -> NewsData.io's category names.
// (NewsData.io only understands lowercase category names like "technology".)
const TOPIC_TO_CATEGORY = {
  Technology: "technology",
  Health: "health",
  Environment: "environment",
  Business: "business",
  Politics: "politics",
  Science: "science",
  Sports: "sports",
  // these lean more positive
  Lifestyle: "lifestyle",
  Education: "education",
  Entertainment: "entertainment",
  Food: "food",
  Tourism: "tourism",
};

// Used when the user hasn't picked topics — chosen because they tend
// to carry more uplifting stories than politics or crime.
const DEFAULT_CATEGORIES = [
  "science",
  "environment",
  "health",
  "technology",
  "lifestyle",
];

// A second "good news" search on every fetch, so each refresh brings in
// extra uplifting stories. (NewsData.io allows up to 100 characters here.)
const GOOD_NEWS_QUERY =
  "breakthrough OR celebrates OR record OR rescued OR volunteers OR award OR recovery";

// In-memory cache: username -> when we last fetched for them.
// (This resets if you restart the server — that's fine for a school project.
// A real production app would put this in the database or Redis instead.)
const lastFetchTime = new Map();

function invalidateCacheForUser(username) {
  lastFetchTime.delete(username);
}

// Turns ["Technology", "Health"] into ["technology", "health"].
// NewsData.io's free plan allows at most 5 categories per request.
function topicsToCategories(topics) {
  if (!topics || topics.length === 0) return DEFAULT_CATEGORIES;

  const mapped = topics
    .map((t) => TOPIC_TO_CATEGORY[t])
    .filter((c) => c !== undefined);

  return mapped.slice(0, 5);
}

// force = true skips the 30-minute cache (used by the Refresh button)
async function fetchAndStoreForUser(username, { force = false } = {}) {
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .single();

  if (userError || !user) {
    const err = new Error(`User not found: ${username}`);
    err.status = 404;
    throw err;
  }

  // ── Step 1: skip the (slow, rate-limited) external calls if we
  // already fetched recently for this user — unless forced ──
  const lastFetch = lastFetchTime.get(username);
  const cacheStillValid =
    lastFetch && Date.now() - lastFetch < CACHE_MINUTES * 60 * 1000;

  if (cacheStillValid && !force) {
    console.log(
      `[newsFetch] cache hit for ${username}, skipping NewsData.io call`,
    );
    return buildBalancedFeed();
  }

  // ── Step 2: figure out which categories to ask NewsData.io for ──
  const categories = topicsToCategories(user.topics);
  console.log(
    `[newsFetch] fetching for ${username}, categories:`,
    categories,
    force ? "(forced)" : "",
  );

  // ── Step 3: call NewsData.io twice — your topics, plus a "good news"
  // search in the same topics — and merge them (never throws) ──
  const [topicArticles, goodNewsArticles] = await Promise.all([
    fetchFromNewsData(categories),
    fetchFromNewsData(categories, GOOD_NEWS_QUERY),
  ]);
  const seen = new Set();
  const articles = [...goodNewsArticles, ...topicArticles].filter((a) => {
    if (!a.article_id || seen.has(a.article_id)) return false;
    seen.add(a.article_id);
    return true;
  });
  console.log(
    `[newsFetch] got ${topicArticles.length} topic + ${goodNewsArticles.length} good-news articles`,
  );

  if (articles.length === 0) {
    console.warn(`[newsFetch] NewsData.io returned nothing for ${username}`);
    return buildBalancedFeed();
  }

  // ── Step 4: find which articles we don't have yet (one query, not one per article) ──
  const ids = articles.map((a) => a.article_id).filter(Boolean);
  const { data: existingRows } = await supabase
    .from("news")
    .select("id, article_id, category")
    .in("article_id", ids);
  const existing = new Map((existingRows || []).map((r) => [r.article_id, r]));
  const fresh = articles.filter(
    (a) => a.article_id && !existing.has(a.article_id),
  );

  // Repair articles we saved earlier under the wrong category (e.g. "Top"
  // instead of "Health") so they show up for the topics you follow.
  let repaired = 0;
  for (const a of articles) {
    const row = existing.get(a.article_id);
    if (!row) continue;
    const better = pickCategory(a.category, categories);
    if (better !== row.category && better !== "General") {
      const { error } = await supabase
        .from("news")
        .update({ category: better })
        .eq("id", row.id);
      if (!error) repaired++;
    }
  }
  if (repaired)
    console.log(`[newsFetch] fixed the topic on ${repaired} saved articles`);

  // ── Step 5: score sentiment 2 at a time (faster than one by one, but
  // gentle enough that the free AI model doesn't get overloaded) ──
  const sentiments = await mapWithLimit(fresh, 2, (a) =>
    getSentiment(a.title, a.description),
  );

  // ── Step 6: save them ──
  let newCount = 0;
  for (let i = 0; i < fresh.length; i++) {
    const a = fresh[i];
    const error = await insertArticle({
      article_id: a.article_id,
      title: a.title,
      description: a.description,
      url: a.link,
      source: a.source_name || "NewsData.io",
      category: pickCategory(a.category, categories), // the topic you actually asked for
      image_url: a.image_url || null, // photo for the story cards
      country: firstCountry(a.country), // used by the Global map
      sentiment: sentiments[i],
      published_at: parsePubDate(a.pubDate),
    });
    if (error)
      console.warn(
        `[newsFetch] insert skipped for ${a.article_id}:`,
        error.message,
      );
    else newCount++;
  }

  console.log(
    `[newsFetch] done for ${username}: ${newCount} new, ${articles.length - newCount} already saved or skipped`,
  );
  lastFetchTime.set(username, Date.now());

  return buildBalancedFeed();
}

// Inserts one article. If the news table doesn't have the new
// image_url / country columns yet, saves the article without them
// (and tells you in the terminal how to fix it) instead of losing it.
let warnedMissingColumns = false;
async function insertArticle(row) {
  let { error } = await supabase.from("news").insert(row);
  if (error && /image_url|country/i.test(error.message)) {
    if (!warnedMissingColumns) {
      warnedMissingColumns = true;
      console.warn(
        "[newsFetch] Your news table is missing the image_url / country columns. " +
          "Run the two 'alter table news add column ...' lines from sql/schema.sql in the Supabase SQL editor. " +
          "Saving articles without photos/countries until then.",
      );
    }
    const { image_url, country, ...rest } = row;
    ({ error } = await supabase.from("news").insert(rest));
  }
  return error;
}

// Runs `fn` over `items` with at most `limit` running at the same time
async function mapWithLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}

// query (optional) = extra keyword search, e.g. the good-news words above
async function fetchFromNewsData(categories, query) {
  const url =
    `${NEWSDATA_BASE_URL}?apikey=${encodeURIComponent(process.env.NEWSDATA_API_KEY)}` +
    `&language=en&category=${encodeURIComponent(categories.join(","))}` +
    (query ? `&q=${encodeURIComponent(query)}` : "");

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    const json = await response.json().catch(() => null);

    if (!response.ok || !json) {
      // NewsData.io puts the reason in json.results.message (e.g. rate limit, bad key)
      const reason = json?.results?.message || json?.message || "";
      console.warn(
        `[newsFetch] NewsData.io returned status ${response.status} ${reason}`,
      );
      return [];
    }
    if (json.status !== "success" || !Array.isArray(json.results)) {
      console.warn(
        "[newsFetch] NewsData.io response was not successful:",
        json.status,
        json?.results?.message || "",
      );
      return [];
    }

    // Only keep English articles that actually have a title + description —
    // the sentiment model needs both to work.
    return json.results.filter(
      (a) =>
        a.title &&
        a.description &&
        a.language &&
        (a.language === "en" || a.language.startsWith("english")),
    );
  } catch (err) {
    // Network problem, timeout, DNS… — don't crash the request
    console.warn(`[newsFetch] could not reach NewsData.io: ${err.message}`);
    return [];
  }
}

// NewsData.io gives each article a LIST of categories, e.g. ["top", "health"].
// We save just one, so pick the one that matches the topics we searched
// for — otherwise the article would be saved as "Top" and hidden from a
// feed that only shows "Health".
function pickCategory(categoryList, wanted) {
  const list = (categoryList || []).map((c) => String(c).toLowerCase());
  const match =
    list.find((c) => wanted.includes(c)) ||
    list.find((c) => c !== "top" && c !== "other");
  if (!match) return "General";
  return match.charAt(0).toUpperCase() + match.slice(1);
}

// NewsData.io sends country as a list, e.g. ["philippines"] -> "Philippines"
function firstCountry(countryList) {
  if (!countryList || countryList.length === 0) return null;
  return countryList[0].replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function parsePubDate(pubDate) {
  if (!pubDate) return new Date().toISOString();
  const parsed = new Date(pubDate.replace(" ", "T") + "Z");
  return isNaN(parsed.getTime())
    ? new Date().toISOString()
    : parsed.toISOString();
}

// Builds a mixed feed: mostly positive articles, with some neutral and
// negative mixed in, newest first. Same 12 / 4 / 4 split your Java
// backend used.
async function buildBalancedFeed() {
  const [positive, neutral, negative] = await Promise.all([
    topNBySentiment("POSITIVE", 12),
    topNBySentiment("NEUTRAL", 4),
    topNBySentiment("NEGATIVE", 4),
  ]);

  const combined = [...positive, ...neutral, ...negative];
  combined.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
  return combined;
}

async function topNBySentiment(sentiment, n) {
  const { data, error } = await supabase
    .from("news")
    .select("*")
    .eq("sentiment", sentiment)
    .order("published_at", { ascending: false })
    .limit(n);

  if (error) {
    console.error(
      `[newsFetch] failed to load ${sentiment} articles:`,
      error.message,
    );
    return [];
  }
  return data;
}

module.exports = { fetchAndStoreForUser, invalidateCacheForUser };
