// ============================================================
// DashboardScreen.tsx — the "Home" page.
// Greeting → today's vibe meter → featured story + sidebar
// (mood, reading balance, muted keywords) → story grid.
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useWellbeing, orderByMood } from "../context/WellbeingContext";
import {
  NewsArticle,
  getUserFeed,
  fetchLiveNews,
  getMutedKeywords,
} from "../api";
import { PageShell } from "../components/PageShell";
import { ArticleCard } from "../components/ArticleCard";
import { StoryImage } from "../components/StoryImage";
import { VibeMeter } from "../components/VibeMeter";
import {
  MoodCheckInCard,
  ReadingBalanceCard,
  MutedKeywordsCard,
} from "../components/WellbeingCards";
import { Sans, Serif, Eyebrow } from "../components/Typography";
import { colors, radius, shadows } from "../theme";
import { greetingForNow } from "../utils/news";

const PAGE_SIZE = 6;

export function DashboardScreen({ navigation }: any) {
  const { username, user } = useAuth();
  const { mood } = useWellbeing();
  const { width } = useWindowDimensions();

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [muted, setMuted] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(""); // feed couldn't load at all
  const [refreshError, setRefreshError] = useState(""); // refresh failed, but we still have stories
  const [refreshNote, setRefreshNote] = useState(""); // "4 new stories added" after a refresh
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [, setClock] = useState(0); // re-renders the "Updated 2 min ago" label
  const [hasAutoFetched, setHasAutoFetched] = useState(false);
  const [category, setCategory] = useState("For you");
  const [showAll, setShowAll] = useState(false);
  const [gridWidth, setGridWidth] = useState(0);

  const wide = width >= 1180;
  const topics = user?.topics || [];
  const topicsKey = topics.join("|");
  const lastTopicsKey = useRef<string | null>(null);
  const refreshingRef = useRef(false);
  const articlesRef = useRef<NewsArticle[]>([]);
  articlesRef.current = articles;

  // ---- Data (same endpoints as before) ----
  const loadFeed = useCallback(async () => {
    if (!username) return [] as NewsArticle[];
    try {
      const [data, mutedRows] = await Promise.all([
        getUserFeed(username),
        getMutedKeywords(username).catch(() => []),
      ]);
      setArticles(data);
      setMuted(mutedRows.map((m) => m.keyword));
      setError("");
      setLastUpdated(Date.now());
      return data;
    } catch (e: any) {
      setError(
        `Couldn't load your feed. ${e?.message || "Check that the backend is running."}`,
      );
      return [] as NewsArticle[];
    }
  }, [username]);

  // Pull new articles from NewsData.io, then reload the feed.
  //  force = true  → Refresh button: skip the server's 30-minute cache
  //  quiet = true  → background refresh: no spinner, no error banner
  async function onRefresh(force = true, quiet = false) {
    if (!username || refreshingRef.current) return;
    refreshingRef.current = true;
    const before = new Set(articlesRef.current.map((a) => a.id));
    let fetched = false;
    if (!quiet) {
      setRefreshing(true);
      setRefreshError("");
      setRefreshNote("");
    }
    try {
      await fetchLiveNews(username, force);
      fetched = true;
    } catch (e: any) {
      if (!quiet)
        setRefreshError(
          `Couldn't fetch new stories: ${e?.message || "the backend didn't respond"}.`,
        );
    } finally {
      // Always reload what's saved, even if fetching new stories failed
      const data = await loadFeed();
      const added = data.filter((a) => !before.has(a.id)).length;
      if (fetched && !quiet) {
        setCategory("For you"); // so the new stories aren't hidden behind a topic chip
        setRefreshNote(
          added > 0
            ? `${added} new ${added === 1 ? "story" : "stories"} added to your feed.`
            : "You're up to date. No new stories for your topics right now.",
        );
      }
      refreshingRef.current = false;
      setRefreshing(false);
      setLoading(false);
    }
  }

  // Hide the "new stories" note after a few seconds
  useEffect(() => {
    if (!refreshNote) return;
    const t = setTimeout(() => setRefreshNote(""), 8000);
    return () => clearTimeout(t);
  }, [refreshNote]);

  // Reload every time Home is shown, so changes made in Preferences
  // (topics, muted keywords) show up straight away. If the topics
  // changed, also fetch fresh news for the new topics.
  // While Home is open it also keeps itself up to date:
  //   • every minute  → re-read the saved feed (cheap, no API credits)
  //   • every 30 min  → ask the server for new stories (uses its cache)
  useFocusEffect(
    useCallback(() => {
      const topicsChanged =
        lastTopicsKey.current !== null && lastTopicsKey.current !== topicsKey;
      lastTopicsKey.current = topicsKey;
      if (topicsChanged) {
        setCategory("For you");
        onRefresh(true);
      } else {
        loadFeed().finally(() => setLoading(false));
      }

      const feedTimer = setInterval(() => {
        if (!refreshingRef.current) loadFeed();
      }, 60 * 1000);
      const liveTimer = setInterval(
        () => onRefresh(false, true),
        30 * 60 * 1000,
      );
      const clockTimer = setInterval(() => setClock((c) => c + 1), 30 * 1000);
      return () => {
        clearInterval(feedTimer);
        clearInterval(liveTimer);
        clearInterval(clockTimer);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadFeed, topicsKey]),
  );

  // First visit with an empty feed → fetch live news automatically
  useEffect(() => {
    if (!loading && !hasAutoFetched && articles.length === 0 && !error) {
      setHasAutoFetched(true);
      onRefresh(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, articles.length, hasAutoFetched]);

  const updatedLabel = lastUpdated ? `Updated ${timeAgo(lastUpdated)}` : "";

  // ---- Mood gently re-orders the feed (nothing is hidden) ----
  const ordered = useMemo(() => orderByMood(articles, mood), [articles, mood]);
  const featured = useMemo(
    () =>
      ordered.find((a) => a.sentiment === "POSITIVE" && a.image_url) ||
      ordered.find((a) => a.sentiment === "POSITIVE") ||
      ordered[0],
    [ordered],
  );
  const rest = useMemo(
    () => ordered.filter((a) => a.id !== featured?.id),
    [ordered, featured],
  );

  // Chips = the topics saved in Preferences. If none are saved,
  // fall back to the categories that are actually in the feed.
  const categories = useMemo(() => {
    if (topics.length) return ["For you", ...topics];
    const counts: Record<string, number> = {};
    rest.forEach((a) => {
      const c = a.category || "General";
      counts[c] = (counts[c] || 0) + 1;
    });
    return [
      "For you",
      ...Object.keys(counts)
        .sort((a, b) => counts[b] - counts[a])
        .slice(0, 5),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rest, topicsKey]);

  useEffect(() => {
    if (!categories.includes(category)) setCategory("For you");
  }, [categories, category]);

  const filtered =
    category === "For you"
      ? rest
      : rest.filter((a) => (a.category || "General") === category);
  const visible = showAll ? filtered : filtered.slice(0, PAGE_SIZE);

  const columns = gridWidth > 860 ? 3 : gridWidth > 540 ? 2 : 1;
  const gap = 20;
  const cardWidth = gridWidth
    ? (gridWidth - gap * (columns - 1)) / columns
    : undefined;

  const openArticle = (id: number) =>
    navigation.navigate("ArticleDetail", { id });

  // ---- Pieces ----
  const today = new Date();
  const name = user?.first_name || username || "friend";
  const greetingSize = width < 700 ? 48 : width < 1100 ? 64 : 80;

  const sideItem =
    !wide && width >= 800 ? { flexGrow: 1, flexBasis: 320 } : null;
  const sidebar = (
    <View
      style={[
        styles.sidebar,
        !wide && styles.sidebarStacked,
        !wide && width < 800 && { flexDirection: "column" },
      ]}
    >
      <View style={sideItem}>
        <MoodCheckInCard />
      </View>
      <View style={sideItem}>
        <ReadingBalanceCard />
      </View>
      <View style={sideItem}>
        <MutedKeywordsCard
          keywords={muted}
          onManage={() => navigation.navigate("Profile")}
        />
      </View>
    </View>
  );

  const storiesSection = (
    <View style={{ marginTop: 56 }}>
      <View style={styles.sectionHeader}>
        <View style={{ flexShrink: 1 }}>
          <Eyebrow style={{ marginBottom: 12 }}>Curated for your vibe</Eyebrow>
          <Serif style={[styles.sectionTitle, width < 700 && { fontSize: 34 }]}>
            Good news, thoughtfully chosen
          </Serif>
        </View>
        <View style={styles.sectionActions}>
          {updatedLabel && !refreshing ? (
            <Sans style={styles.updated}>{updatedLabel}</Sans>
          ) : null}
          <Pressable
            onPress={() => onRefresh(true)}
            disabled={refreshing}
            style={styles.linkBtn}
            accessibilityLabel="Refresh news"
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={colors.primaryDark} />
            ) : (
              <Feather name="refresh-cw" size={14} color={colors.primaryDark} />
            )}
            <Sans style={styles.linkBtnText}>
              {refreshing ? "Refreshing…" : "Refresh"}
            </Sans>
          </Pressable>
          {filtered.length > PAGE_SIZE ? (
            <Pressable
              onPress={() => setShowAll((s) => !s)}
              style={styles.linkBtn}
            >
              <Sans style={styles.linkBtnText}>
                {showAll ? "Show fewer" : "See all stories"}
              </Sans>
              <Feather
                name={showAll ? "chevron-up" : "chevron-right"}
                size={16}
                color={colors.primaryDark}
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      {refreshError && !refreshing ? (
        <View style={styles.refreshError}>
          <Feather name="alert-circle" size={15} color={colors.danger} />
          <Sans style={styles.refreshErrorText}>
            {refreshError} Showing your saved stories.
          </Sans>
          <Pressable
            onPress={() => setRefreshError("")}
            accessibilityLabel="Dismiss"
          >
            <Feather name="x" size={15} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : null}

      {refreshNote && !refreshing ? (
        <View style={styles.refreshNote}>
          <Feather name="check-circle" size={15} color={colors.primaryDark} />
          <Sans style={styles.refreshNoteText}>{refreshNote}</Sans>
        </View>
      ) : null}

      {refreshing ? (
        <Sans style={styles.note}>
          Fetching the latest articles and scoring their sentiment. This can
          take up to a minute when the AI model is busy.
        </Sans>
      ) : null}

      <View style={styles.chips}>
        {categories.map((c) => {
          const active = c === category;
          return (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              style={({ hovered }: any) => [
                styles.chip,
                hovered && !active && { borderColor: colors.primary },
                active && styles.chipActive,
              ]}
            >
              <Sans
                style={[styles.chipText, active && { color: colors.white }]}
              >
                {c}
              </Sans>
            </Pressable>
          );
        })}
      </View>

      <View
        style={styles.grid}
        onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}
      >
        {visible.length === 0 ? (
          <Sans style={styles.empty}>
            {refreshing
              ? "Loading stories for your topics…"
              : category === "For you"
                ? "No stories here yet. Tap Refresh to fetch the latest."
                : `No ${category} stories yet. Tap Refresh to fetch the latest.`}
          </Sans>
        ) : (
          visible.map((a) => (
            <ArticleCard
              key={a.id}
              article={a}
              width={cardWidth}
              onPress={() => openArticle(a.id)}
            />
          ))
        )}
      </View>
    </View>
  );

  return (
    <PageShell>
      {/* Greeting */}
      <View style={styles.greetingRow}>
        <View style={{ flexShrink: 1 }}>
          <View style={styles.eyebrowRow}>
            <Ionicons
              name="sparkles-outline"
              size={13}
              color={colors.primaryDark}
            />
            <Eyebrow>Your daily balance</Eyebrow>
          </View>
          <Serif
            style={[
              styles.greeting,
              { fontSize: greetingSize, lineHeight: greetingSize * 1.05 },
            ]}
          >
            {greetingForNow(today)}, {name}.
          </Serif>
          <Sans style={styles.lede}>
            Here’s what’s moving the world forward today.
          </Sans>
        </View>
        {width >= 700 ? (
          <View style={styles.dateBlock}>
            <Sans style={styles.weekday}>
              {today.toLocaleDateString(undefined, { weekday: "long" })}
            </Sans>
            <Serif style={styles.date}>
              {today.toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
              })}
            </Serif>
          </View>
        ) : null}
      </View>

      <VibeMeter articles={articles} />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : error && articles.length === 0 ? (
        <View style={[styles.errorBox]}>
          <Sans style={styles.errorText}>{error}</Sans>
          <Pressable onPress={() => onRefresh(true)} style={styles.errorBtn}>
            <Sans style={{ color: colors.white, fontWeight: "700" }}>
              Try again
            </Sans>
          </Pressable>
        </View>
      ) : wide ? (
        <View style={styles.twoCol}>
          <View style={{ flex: 1, minWidth: 0 }}>
            {featured ? (
              <FeaturedStory
                article={featured}
                onPress={() => openArticle(featured.id)}
              />
            ) : null}
            {storiesSection}
          </View>
          {sidebar}
        </View>
      ) : (
        <View>
          {featured ? (
            <FeaturedStory
              article={featured}
              onPress={() => openArticle(featured.id)}
            />
          ) : null}
          {sidebar}
          {storiesSection}
        </View>
      )}
    </PageShell>
  );
}

// Big hero card with the day's featured positive story
function FeaturedStory({
  article,
  onPress,
}: {
  article: NewsArticle;
  onPress: () => void;
}) {
  const { width } = useWindowDimensions();
  const long = article.title.length > 70;
  const titleSize = width < 700 ? 36 : long ? 50 : 70;

  return (
    <Pressable onPress={onPress} style={[styles.featured, shadows.card]}>
      <StoryImage
        uri={article.image_url}
        seed={article.category || article.title}
        style={StyleSheet.absoluteFill}
      />
      {/* dark green fade so white text stays readable */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <svg
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <defs>
            <linearGradient id="featuredFade" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={colors.forest} stopOpacity="0.92" />
              <stop offset="45%" stopColor={colors.forest} stopOpacity="0.6" />
              <stop offset="80%" stopColor={colors.forest} stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill="url(#featuredFade)" />
        </svg>
      </View>

      <View style={[styles.featuredContent, width < 700 && { padding: 24 }]}>
        <View
          style={[styles.featuredTop, width < 700 && { left: 24, top: 24 }]}
        >
          <View style={styles.featuredBadge}>
            <Sans style={styles.featuredBadgeText}>
              {article.sentiment === "POSITIVE"
                ? "Positive"
                : article.sentiment === "NEUTRAL"
                  ? "Neutral"
                  : "Deeper read"}
            </Sans>
          </View>
          <Sans style={styles.featuredKicker}>Today’s featured story</Sans>
        </View>

        <Serif
          style={[
            styles.featuredTitle,
            { fontSize: titleSize, lineHeight: titleSize * 1.0 },
          ]}
          numberOfLines={5}
        >
          {article.title}
        </Serif>
        {article.description ? (
          <Sans style={styles.featuredDesc} numberOfLines={3}>
            {article.description}
          </Sans>
        ) : null}

        <Pressable
          onPress={onPress}
          style={({ hovered }: any) => [
            styles.readBtn,
            hovered && { backgroundColor: colors.butter },
          ]}
        >
          <Sans style={styles.readBtnText}>Read the story</Sans>
          <Feather name="chevron-right" size={16} color={colors.primaryDark} />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  greetingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 24,
    marginBottom: 32,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  greeting: { letterSpacing: -2.5 },
  lede: { fontSize: 17, color: colors.textBody, marginTop: 20 },
  dateBlock: {
    borderLeftWidth: 1,
    borderLeftColor: colors.borderStrong,
    paddingLeft: 28,
    paddingVertical: 6,
    alignItems: "flex-end",
  },
  weekday: { fontSize: 14, color: colors.textBody, marginBottom: 4 },
  date: { fontSize: 22 },
  twoCol: { flexDirection: "row", gap: 40, alignItems: "flex-start" },
  sidebar: { width: 362, gap: 20 },
  sidebarStacked: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "stretch",
    marginTop: 24,
  },
  featured: {
    height: 526,
    borderRadius: radius.xl,
    overflow: "hidden",
    backgroundColor: colors.forest,
  },
  featuredContent: {
    flex: 1,
    paddingTop: 26,
    paddingHorizontal: 74,
    paddingBottom: 26,
    justifyContent: "center",
    maxWidth: 720,
  },
  featuredTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    position: "absolute",
    top: 26,
    left: 74,
  } as any,
  featuredBadge: {
    backgroundColor: colors.butter,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  featuredBadgeText: { fontSize: 12, fontWeight: "700", color: "#6E6A2C" },
  featuredKicker: { fontSize: 13.5, color: "rgba(255,255,255,0.92)" },
  featuredTitle: {
    color: colors.white,
    letterSpacing: -2,
    maxWidth: 560,
    marginTop: 36,
  },
  featuredDesc: {
    fontSize: 17,
    lineHeight: 27,
    color: "rgba(255,255,255,0.9)",
    marginTop: 34,
    maxWidth: 460,
  },
  readBtn: {
    marginTop: 30,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 999,
  },
  readBtnText: { fontSize: 14.5, fontWeight: "700", color: colors.primaryDark },
  sectionHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 16,
    marginBottom: 26,
  },
  sectionTitle: { fontSize: 46, lineHeight: 52, letterSpacing: -1 },
  sectionActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    paddingBottom: 6,
  },
  linkBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  linkBtnText: { fontSize: 14, fontWeight: "600", color: colors.primaryDark },
  updated: { fontSize: 12.5, color: colors.textMuted },
  refreshError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.peachSoft,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginTop: -8,
    marginBottom: 18,
  },
  refreshErrorText: { flex: 1, fontSize: 13, color: "#7A4718" },
  refreshNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginTop: -8,
    marginBottom: 18,
  },
  refreshNoteText: {
    flex: 1,
    fontSize: 13,
    color: "#4F5A1F",
    fontWeight: "600",
  },
  note: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: -10,
    marginBottom: 18,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, fontWeight: "600", color: colors.text },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 20 },
  empty: { color: colors.textMuted, paddingVertical: 30 },
  errorBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 32,
    alignItems: "center",
    gap: 16,
  },
  errorText: { color: colors.danger, textAlign: "center" },
  errorBtn: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
});

// "just now", "3 min ago", "2 h ago"
function timeAgo(ts: number) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)} h ago`;
}
