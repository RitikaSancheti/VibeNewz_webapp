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
};

const DEFAULT_CATEGORIES = ["technology", "health", "science", "business", "politics"];

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

async function fetchAndStoreForUser(username) {
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
  // already fetched recently for this user ──
  const lastFetch = lastFetchTime.get(username);
  const cacheStillValid =
    lastFetch && Date.now() - lastFetch < CACHE_MINUTES * 60 * 1000;

  if (cacheStillValid) {
    console.log(`[newsFetch] cache hit for ${username}, skipping NewsData.io call`);
    return buildBalancedFeed();
  }

  // ── Step 2: figure out which categories to ask NewsData.io for ──
  const categories = topicsToCategories(user.topics);
  console.log(`[newsFetch] fetching for ${username}, categories:`, categories);

  // ── Step 3: call NewsData.io ──
  const articles = await fetchFromNewsData(categories);

  if (articles.length === 0) {
    console.warn(`[newsFetch] NewsData.io returned nothing for ${username}`);
    return buildBalancedFeed();
  }

  // ── Step 4: save each new article (skip ones we already have) ──
  let newCount = 0;
  let skipCount = 0;

  for (const article of articles) {
    if (!article.article_id) continue;

    const { data: existing } = await supabase
      .from("news")
      .select("id")
      .eq("article_id", article.article_id)
      .maybeSingle();

    if (existing) {
      skipCount++;
      continue;
    }

    const sentiment = await getSentiment(article.title, article.description);

    const { error: insertError } = await supabase.from("news").insert({
      article_id: article.article_id,
      title: article.title,
      description: article.description,
      url: article.link,
      source: article.source_name || "NewsData.io",
      category: firstCategory(article.category),
      sentiment,
      published_at: parsePubDate(article.pubDate),
    });

    if (insertError) {
      // Most likely a duplicate that slipped in between our check and
      // this insert (two requests at once) — safe to ignore.
      console.warn(`[newsFetch] insert skipped for ${article.article_id}:`, insertError.message);
      skipCount++;
    } else {
      newCount++;
    }
  }

  console.log(`[newsFetch] done for ${username}: ${newCount} new, ${skipCount} skipped`);
  lastFetchTime.set(username, Date.now());

  return buildBalancedFeed();
}

async function fetchFromNewsData(categories) {
  const url =
    `${NEWSDATA_BASE_URL}?apikey=${encodeURIComponent(process.env.NEWSDATA_API_KEY)}` +
    `&language=en&category=${encodeURIComponent(categories.join(","))}`;

  const response = await fetch(url);
  if (!response.ok) {
    console.warn(`[newsFetch] NewsData.io returned status ${response.status}`);
    return [];
  }

  const json = await response.json();
  if (json.status !== "success" || !Array.isArray(json.results)) {
    console.warn("[newsFetch] NewsData.io response was not successful:", json.status);
    return [];
  }

  // Only keep English articles that actually have a title + description —
  // the sentiment model needs both to work.
  return json.results.filter(
    (a) =>
      a.title &&
      a.description &&
      a.language &&
      (a.language === "en" || a.language.startsWith("english"))
  );
}

function firstCategory(categoryList) {
  if (!categoryList || categoryList.length === 0) return "General";
  const cat = categoryList[0];
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

function parsePubDate(pubDate) {
  if (!pubDate) return new Date().toISOString();
  const parsed = new Date(pubDate.replace(" ", "T") + "Z");
  return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
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
    console.error(`[newsFetch] failed to load ${sentiment} articles:`, error.message);
    return [];
  }
  return data;
}

module.exports = { fetchAndStoreForUser, invalidateCacheForUser };
