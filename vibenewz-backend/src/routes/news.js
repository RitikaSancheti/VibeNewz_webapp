// routes/news.js

const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");
const { getSentiment } = require("../services/sentiment");
const { fetchAndStoreForUser } = require("../services/newsFetch");

// GET /api/news — every article, newest first
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("news")
    .select("*")
    .order("published_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/news/filter/:sentiment — e.g. /api/news/filter/POSITIVE
router.get("/filter/:sentiment", async (req, res) => {
  const sentiment = req.params.sentiment.toUpperCase();
  if (!["POSITIVE", "NEUTRAL", "NEGATIVE"].includes(sentiment)) {
    return res.status(400).json({
      error: "Invalid sentiment. Use: POSITIVE, NEUTRAL, or NEGATIVE",
    });
  }

  const { data, error } = await supabase
    .from("news")
    .select("*")
    .eq("sentiment", sentiment)
    .order("published_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── Analytics — must come BEFORE "/:id" so "analytics" isn't read as an id ──

// GET /api/news/analytics/counts -> { POSITIVE: 22, NEUTRAL: 14, NEGATIVE: 9, TOTAL: 45 }
router.get("/analytics/counts", async (req, res) => {
  const countFor = async (sentiment) => {
    const { count, error } = await supabase
      .from("news")
      .select("*", { count: "exact", head: true })
      .eq("sentiment", sentiment);
    if (error) throw error;
    return count || 0;
  };

  try {
    const [positive, neutral, negative, total] = await Promise.all([
      countFor("POSITIVE"),
      countFor("NEUTRAL"),
      countFor("NEGATIVE"),
      supabase
        .from("news")
        .select("*", { count: "exact", head: true })
        .then((r) => r.count || 0),
    ]);

    res.json({
      POSITIVE: positive,
      NEUTRAL: neutral,
      NEGATIVE: negative,
      TOTAL: total,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/news/analytics/categories -> [ { category: "Technology", count: 12 }, ... ]
router.get("/analytics/categories", async (req, res) => {
  const { data, error } = await supabase.from("news").select("category");
  if (error) return res.status(500).json({ error: error.message });

  const counts = {};
  for (const row of data) {
    const cat = row.category || "General";
    counts[cat] = (counts[cat] || 0) + 1;
  }

  const result = Object.entries(counts).map(([category, count]) => ({
    category,
    count,
  }));
  res.json(result);
});

// GET /api/news/analytics/trend -> last 7 days, grouped by day + sentiment
router.get("/analytics/trend", async (req, res) => {
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from("news")
    .select("published_at, sentiment")
    .gte("published_at", sevenDaysAgo);

  if (error) return res.status(500).json({ error: error.message });

  const byDay = {};
  for (const row of data) {
    const day = row.published_at.slice(0, 10); // "2026-09-19"
    if (!byDay[day]) byDay[day] = { day, positive: 0, neutral: 0, serious: 0 };

    if (row.sentiment === "POSITIVE") byDay[day].positive++;
    else if (row.sentiment === "NEUTRAL") byDay[day].neutral++;
    else if (row.sentiment === "NEGATIVE") byDay[day].serious++;
  }

  res.json(Object.values(byDay).sort((a, b) => a.day.localeCompare(b.day)));
});

// GET /api/news/fetch/:username — pull fresh articles from NewsData.io for this user's topics
router.get("/fetch/:username", async (req, res) => {
  try {
    // ?force=1 skips the 30-minute cache (the app's Refresh button sends this)
    const news = await fetchAndStoreForUser(req.params.username, {
      force: req.query.force === "1",
    });
    res.json(news);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

// DELETE /api/news/old/:days — remove articles older than N days
router.delete("/old/:days", async (req, res) => {
  const days = parseInt(req.params.days, 10);
  const cutoff = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: toDelete, error: findError } = await supabase
    .from("news")
    .select("id")
    .lt("published_at", cutoff);

  if (findError) return res.status(500).json({ error: findError.message });
  if (toDelete.length === 0)
    return res.json({ message: "No old articles found" });

  const { error: deleteError } = await supabase
    .from("news")
    .delete()
    .lt("published_at", cutoff);

  if (deleteError) return res.status(500).json({ error: deleteError.message });
  res.json({
    message: `Removed ${toDelete.length} articles older than ${days} days`,
  });
});

// GET /api/news/:id — single article
router.get("/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("news")
    .select("*")
    .eq("id", req.params.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Article not found" });
  res.json(data);
});

// POST /api/news — create an article. If no sentiment given, the AI decides it.
router.post("/", async (req, res) => {
  const article = req.body;

  if (!article.sentiment) {
    article.sentiment = await getSentiment(article.title, article.description);
  }
  if (!article.published_at) {
    article.published_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("news")
    .insert(article)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PUT /api/news/:id — update an article
router.put("/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("news")
    .update(req.body)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/news/:id
router.delete("/:id", async (req, res) => {
  const { error } = await supabase
    .from("news")
    .delete()
    .eq("id", req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: `Deleted news article with id: ${req.params.id}` });
});

module.exports = router;
