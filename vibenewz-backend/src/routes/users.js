// ============================================================
// routes/users.js
//
// Everything under /api/users
// ============================================================

const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");
const { invalidateCacheForUser } = require("../services/newsFetch");

// Small helper: look up a user by username, or send a 404 and return null.
async function findUserOrRespond404(username, res) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: error.message });
    return null;
  }
  if (!data) {
    res.status(404).json({ error: `User not found: ${username}` });
    return null;
  }
  return data;
}

// GET /api/users
router.get("/", async (req, res) => {
  const { data, error } = await supabase.from("users").select("*");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/users/by-auth/:authId — look up a user by Supabase auth UUID.
// Called by the client immediately after a Supabase sign-in so the app
// can load the public.users profile (username, topics, etc.).
router.get("/by-auth/:authId", async (req, res) => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("auth_id", req.params.authId)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "No profile for this auth user" });
  res.json(data);
});

// GET /api/users/:username
router.get("/:username", async (req, res) => {
  const user = await findUserOrRespond404(req.params.username, res);
  if (user) res.json(user);
});

// POST /api/users — create a new user profile.
// Accepts { username, auth_id? }. auth_id links to Supabase auth.users.
router.post("/", async (req, res) => {
  const { username, auth_id } = req.body;
  if (!username) return res.status(400).json({ error: "username is required" });

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existing) {
    return res
      .status(409)
      .json({ error: `Username already exists: ${username}` });
  }

  const insert = { username, preferred_sentiment: "POSITIVE" };
  if (auth_id) insert.auth_id = auth_id;

  const { data, error } = await supabase
    .from("users")
    .insert(insert)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PUT /api/users/:username/account — update name/email/location
router.put("/:username/account", async (req, res) => {
  const user = await findUserOrRespond404(req.params.username, res);
  if (!user) return;

  const { firstName, lastName, email, location } = req.body;
  const updates = {};
  if (firstName !== undefined) updates.first_name = firstName;
  if (lastName !== undefined) updates.last_name = lastName;
  if (email !== undefined) updates.email = email;
  if (location !== undefined) updates.location = location;

  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PUT /api/users/:username/topics — replace the user's whole topic list
router.put("/:username/topics", async (req, res) => {
  const user = await findUserOrRespond404(req.params.username, res);
  if (!user) return;

  const { topics } = req.body;

  const { data, error } = await supabase
    .from("users")
    .update({ topics: topics || [] })
    .eq("id", user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // topics changed, so the next Dashboard load should fetch fresh news
  invalidateCacheForUser(req.params.username);

  res.json(data);
});

// PUT /api/users/:username/sentiment — set preferred sentiment filter
router.put("/:username/sentiment", async (req, res) => {
  const user = await findUserOrRespond404(req.params.username, res);
  if (!user) return;

  const sentiment = (req.body.sentiment || "").toUpperCase();
  if (!["POSITIVE", "NEUTRAL", "NEGATIVE"].includes(sentiment)) {
    return res.status(400).json({
      error: "Invalid sentiment. Use: POSITIVE, NEUTRAL, or NEGATIVE",
    });
  }

  const { data, error } = await supabase
    .from("users")
    .update({ preferred_sentiment: sentiment })
    .eq("id", user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── Bookmarks ──────────────────────────────────────────────

// GET /api/users/:username/bookmarks
router.get("/:username/bookmarks", async (req, res) => {
  const user = await findUserOrRespond404(req.params.username, res);
  if (!user) return;

  const { data, error } = await supabase
    .from("user_bookmarks")
    .select("news(*)")
    .eq("user_id", user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map((row) => row.news));
});

// POST /api/users/:username/bookmarks/:newsId
router.post("/:username/bookmarks/:newsId", async (req, res) => {
  const user = await findUserOrRespond404(req.params.username, res);
  if (!user) return;

  const { data: existing } = await supabase
    .from("user_bookmarks")
    .select("*")
    .eq("user_id", user.id)
    .eq("news_id", req.params.newsId)
    .maybeSingle();

  if (existing) {
    return res.status(409).json({ error: "Article is already bookmarked" });
  }

  const { error } = await supabase
    .from("user_bookmarks")
    .insert({ user_id: user.id, news_id: req.params.newsId });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "Bookmarked" });
});

// DELETE /api/users/:username/bookmarks/:newsId
router.delete("/:username/bookmarks/:newsId", async (req, res) => {
  const user = await findUserOrRespond404(req.params.username, res);
  if (!user) return;

  const { error } = await supabase
    .from("user_bookmarks")
    .delete()
    .eq("user_id", user.id)
    .eq("news_id", req.params.newsId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "Bookmark removed" });
});

// ── Muted keywords ─────────────────────────────────────────

// GET /api/users/:username/muted
router.get("/:username/muted", async (req, res) => {
  const user = await findUserOrRespond404(req.params.username, res);
  if (!user) return;

  const { data, error } = await supabase
    .from("muted_keywords")
    .select("*")
    .eq("user_id", user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/users/:username/muted
router.post("/:username/muted", async (req, res) => {
  const user = await findUserOrRespond404(req.params.username, res);
  if (!user) return;

  const keyword = (req.body.keyword || "").trim().toLowerCase();
  if (!keyword)
    return res.status(400).json({ error: "keyword field is required" });

  const { data: existing } = await supabase
    .from("muted_keywords")
    .select("id")
    .eq("user_id", user.id)
    .ilike("keyword", keyword)
    .maybeSingle();

  if (existing) {
    return res.status(409).json({ error: `Keyword already muted: ${keyword}` });
  }

  const { data, error } = await supabase
    .from("muted_keywords")
    .insert({ user_id: user.id, keyword })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/users/:username/muted/:keywordId
router.delete("/:username/muted/:keywordId", async (req, res) => {
  const user = await findUserOrRespond404(req.params.username, res);
  if (!user) return;

  const { error } = await supabase
    .from("muted_keywords")
    .delete()
    .eq("id", req.params.keywordId)
    .eq("user_id", user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "Keyword unmuted" });
});

// ── Filtered feed (mute + topics applied) ─────────────────

// GET /api/users/:username/feed
router.get("/:username/feed", async (req, res) => {
  const user = await findUserOrRespond404(req.params.username, res);
  if (!user) return;

  const feed = await buildFilteredFeed(user, null);
  res.json(feed);
});

// GET /api/users/:username/feed/:sentiment
router.get("/:username/feed/:sentiment", async (req, res) => {
  const user = await findUserOrRespond404(req.params.username, res);
  if (!user) return;

  const sentiment = req.params.sentiment.toUpperCase();
  if (!["POSITIVE", "NEUTRAL", "NEGATIVE"].includes(sentiment)) {
    return res.status(400).json({
      error: "Invalid sentiment. Use: POSITIVE, NEUTRAL, or NEGATIVE",
    });
  }

  const feed = await buildFilteredFeed(user, sentiment);
  res.json(feed);
});

async function buildFilteredFeed(user, sentiment) {
  let query = supabase
    .from("news")
    .select("*")
    .order("published_at", { ascending: false });
  if (sentiment) query = query.eq("sentiment", sentiment);

  const { data: articles, error } = await query;
  if (error) throw error;

  const { data: mutedRows } = await supabase
    .from("muted_keywords")
    .select("keyword")
    .eq("user_id", user.id);
  const mutedKeywords = (mutedRows || []).map((r) => r.keyword.toLowerCase());

  let result = articles;

  // Remove articles containing any muted keyword in the title or description
  if (mutedKeywords.length > 0) {
    result = result.filter((article) => {
      const text = `${article.title} ${article.description}`.toLowerCase();
      return !mutedKeywords.some((keyword) => text.includes(keyword));
    });
  }

  // If the user picked specific topics, only show articles in those categories
  if (user.topics && user.topics.length > 0) {
    result = result.filter((article) => user.topics.includes(article.category));
  }

  // The main feed is balanced to be mostly uplifting. (Asking for one
  // sentiment, e.g. /feed/NEGATIVE, still returns all of that sentiment.)
  if (!sentiment) result = balanceFeed(result, user.preferred_sentiment);

  return result;
}
// For each preference: which sentiment leads the feed, which comes second,
// and which comes third.
const FEED_ORDER = {
  POSITIVE: ["POSITIVE", "NEUTRAL", "NEGATIVE"],
  NEUTRAL: ["NEUTRAL", "POSITIVE", "NEGATIVE"],
  NEGATIVE: ["NEGATIVE", "NEUTRAL", "POSITIVE"],
};

// Keeps every story of the preferred sentiment (default POSITIVE), then adds
// a smaller helping of the other two — roughly 70% / 20% / 10% — so the feed
// leans the way the user chose without hiding the world entirely.
function balanceFeed(articles, preferred) {
  const [first, second, third] = FEED_ORDER[preferred] || FEED_ORDER.POSITIVE;
  const pick = (s) => articles.filter((a) => a.sentiment === s);

  const main = pick(first);
  const secondCap = Math.max(3, Math.round(main.length * 0.3));
  const thirdCap = Math.max(1, Math.round(main.length * 0.15));

  const byNewest = (a, b) =>
    new Date(b.published_at) - new Date(a.published_at);
  return [
    ...main,
    ...pick(second).slice(0, secondCap),
    ...pick(third).slice(0, thirdCap),
  ].sort(byNewest);
}

module.exports = router;
