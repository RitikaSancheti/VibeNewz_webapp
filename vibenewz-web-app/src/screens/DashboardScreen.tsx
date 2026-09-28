import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import {
  NewsArticle,
  Sentiment,
  getUserFeed,
  getUserFeedBySentiment,
  fetchLiveNews,
} from "../api";
import { ArticleCard } from "../components/ArticleCard";
import { colors } from "../theme";

type FilterOption = "ALL" | Sentiment;

const FILTERS: { key: FilterOption; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "POSITIVE", label: "Positive" },
  { key: "NEUTRAL", label: "Neutral" },
  { key: "NEGATIVE", label: "Negative" },
];

export function DashboardScreen({ navigation }: any) {
  const { username } = useAuth();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [filter, setFilter] = useState<FilterOption>("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [hasAutoFetched, setHasAutoFetched] = useState(false);

  const loadFeed = useCallback(
    async (selectedFilter: FilterOption) => {
      if (!username) return [] as NewsArticle[];
      try {
        const data =
          selectedFilter === "ALL"
            ? await getUserFeed(username)
            : await getUserFeedBySentiment(username, selectedFilter);
        setArticles(data);
        setError("");
        return data;
      } catch {
        setError("Couldn't load your feed. Check that the backend is running.");
        return [] as NewsArticle[];
      }
    },
    [username],
  );

  useEffect(() => {
    setLoading(true);
    loadFeed(filter).finally(() => setLoading(false));
  }, [filter, loadFeed]);

  // The very first time someone lands on an empty feed (a brand new user,
  // or the news table hasn't been filled yet), automatically go fetch
  // live articles instead of making them find the refresh button.
  useEffect(() => {
    if (
      !loading &&
      !hasAutoFetched &&
      articles.length === 0 &&
      filter === "ALL"
    ) {
      setHasAutoFetched(true);
      onRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, articles.length, hasAutoFetched, filter]);

  // Triggers a fresh NewsData.io fetch (the server caches it for 30
  // minutes, so this is safe to call often — it won't burn through your
  // API credits). On mobile this also runs from pull-to-refresh; on web,
  // the button below is the only way to trigger it since there's no drag
  // gesture on a website.
  async function onRefresh() {
    if (!username) return;
    setRefreshing(true);
    setError("");
    try {
      await fetchLiveNews(username);
      await loadFeed(filter);
    } catch {
      setError("Couldn't refresh. Check that the backend is running.");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Your Feed</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.refreshButtonText}>Refresh news</Text>
          )}
        </TouchableOpacity>
      </View>

      {refreshing ? (
        <Text style={styles.refreshingNote}>
          Fetching the latest articles and scoring sentiment — this can take up
          to a minute the first time.
        </Text>
      ) : null}

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterChip,
              filter === f.key && styles.filterChipActive,
            ]}
            onPress={() => setFilter(f.key)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f.key && styles.filterTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {refreshing
                ? "Loading your first batch of articles..."
                : 'No articles yet — tap "Refresh news" above to fetch the latest.'}
            </Text>
          }
          renderItem={({ item }) => (
            <ArticleCard
              article={item}
              onPress={() =>
                navigation.navigate("ArticleDetail", { id: item.id })
              }
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  header: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
  },
  refreshButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    minWidth: 100,
    alignItems: "center",
  },
  refreshButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  refreshingNote: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
  },
  filterTextActive: {
    color: "#fff",
  },
  error: {
    color: colors.danger,
    textAlign: "center",
    marginTop: 40,
  },
  empty: {
    textAlign: "center",
    color: colors.textMuted,
    marginTop: 40,
  },
});
