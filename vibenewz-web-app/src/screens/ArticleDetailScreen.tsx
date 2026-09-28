import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { NewsArticle, getNewsById, addBookmark, removeBookmark, getBookmarks } from "../api";
import { SentimentBadge } from "../components/SentimentBadge";
import { colors } from "../theme";

export function ArticleDetailScreen({ route }: any) {
  const { id } = route.params;
  const { username } = useAuth();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getNewsById(id);
        setArticle(data);

        if (username) {
          const bookmarks = await getBookmarks(username);
          setIsBookmarked(bookmarks.some((b) => b.id === data.id));
        }
      } catch {
        // article failed to load — screen will just show nothing below
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, username]);

  async function toggleBookmark() {
    if (!username || !article) return;
    try {
      if (isBookmarked) {
        await removeBookmark(username, article.id);
      } else {
        await addBookmark(username, article.id);
      }
      setIsBookmarked(!isBookmarked);
    } catch {
      // already bookmarked / already removed — safe to ignore for this simple app
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!article) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Article not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <SentimentBadge sentiment={article.sentiment} />

      <Text style={styles.title}>{article.title}</Text>
      <Text style={styles.meta}>
        {article.source}
        {article.category ? ` · ${article.category}` : ""}
      </Text>

      <Text style={styles.body}>{article.content || article.description}</Text>

      <TouchableOpacity style={styles.bookmarkButton} onPress={toggleBookmark}>
        <Text style={styles.bookmarkButtonText}>
          {isBookmarked ? "★ Remove bookmark" : "☆ Bookmark this article"}
        </Text>
      </TouchableOpacity>

      {article.url ? (
        <TouchableOpacity onPress={() => Linking.openURL(article.url)}>
          <Text style={styles.link}>Read full article on {article.source} →</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 16,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
    marginBottom: 24,
  },
  bookmarkButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  bookmarkButtonText: {
    fontWeight: "700",
    color: colors.text,
  },
  link: {
    color: colors.primary,
    fontWeight: "600",
    textAlign: "center",
  },
  error: {
    color: colors.danger,
  },
});
