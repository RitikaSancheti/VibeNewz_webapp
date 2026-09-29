import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Linking,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { NewsArticle, getNewsById } from "../api";
import { useBookmarks } from "../context/BookmarksContext";
import { useWellbeing } from "../context/WellbeingContext";
import { PageShell } from "../components/PageShell";
import { StoryImage } from "../components/StoryImage";
import { SentimentBadge } from "../components/SentimentBadge";
import { Sans, Serif } from "../components/Typography";
import { colors, radius } from "../theme";
import { readMinutes, titleCase } from "../utils/news";

export function ArticleDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const { width } = useWindowDimensions();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const { recordRead, isLiked, toggleLike } = useWellbeing();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getNewsById(id)
      .then(setArticle)
      .catch(() => setArticle(null))
      .finally(() => setLoading(false));
  }, [id]);

  // Track how long the story is on screen — feeds "Your reading balance".
  const recordRef = useRef(recordRead);
  recordRef.current = recordRead;
  useFocusEffect(
    useCallback(() => {
      if (!article) return;
      const openedAt = Date.now();
      return () => recordRef.current(article, (Date.now() - openedAt) / 1000);
    }, [article]),
  );

  function goBack() {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate("Home");
  }

  const titleSize = width < 700 ? 36 : 54;

  return (
    <PageShell>
      <View style={styles.column}>
        <Pressable onPress={goBack} style={styles.back}>
          <Feather name="arrow-left" size={16} color={colors.primaryDark} />
          <Sans style={styles.backText}>Back</Sans>
        </Pressable>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : !article ? (
          <Sans style={{ color: colors.danger, marginTop: 20 }}>
            Article not found.
          </Sans>
        ) : (
          <>
            <View style={styles.metaRow}>
              <SentimentBadge sentiment={article.sentiment} />
              <Sans style={styles.meta}>
                {article.category || "General"} · {readMinutes(article)} min
                read
              </Sans>
            </View>

            <Serif
              style={[
                styles.title,
                { fontSize: titleSize, lineHeight: titleSize * 1.05 },
              ]}
            >
              {article.title}
            </Serif>
            <Sans style={styles.source}>
              {article.source}
              {article.country ? `  ·  ${titleCase(article.country)}` : ""}
              {article.published_at
                ? `  ·  ${new Date(article.published_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}`
                : ""}
            </Sans>

            <StoryImage
              uri={article.image_url}
              seed={article.category || article.title}
              style={styles.hero}
            />

            <Sans style={styles.body}>
              {article.content || article.description}
            </Sans>

            <View style={styles.actions}>
              {article.url ? (
                <Pressable
                  onPress={() => Linking.openURL(article.url)}
                  style={({ hovered }: any) => [
                    styles.primaryBtn,
                    hovered && { backgroundColor: colors.primaryDark },
                  ]}
                >
                  <Sans style={styles.primaryBtnText}>
                    Read full article on {article.source}
                  </Sans>
                  <Feather
                    name="external-link"
                    size={15}
                    color={colors.white}
                  />
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => toggleBookmark(article)}
                style={[
                  styles.ghostBtn,
                  isBookmarked(article.id) && styles.ghostBtnActive,
                ]}
              >
                <Feather
                  name="bookmark"
                  size={16}
                  color={isBookmarked(article.id) ? colors.white : colors.text}
                />
                <Sans
                  style={[
                    styles.ghostText,
                    isBookmarked(article.id) && { color: colors.white },
                  ]}
                >
                  {isBookmarked(article.id) ? "Saved" : "Bookmark"}
                </Sans>
              </Pressable>
              <Pressable
                onPress={() => toggleLike(article.id)}
                style={styles.ghostBtn}
              >
                <Feather
                  name="heart"
                  size={16}
                  color={isLiked(article.id) ? colors.peach : colors.text}
                />
                <Sans style={styles.ghostText}>
                  {isLiked(article.id) ? "Liked" : "Like"}
                </Sans>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  column: { width: "100%", maxWidth: 860, alignSelf: "center" },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    marginBottom: 28,
  },
  backText: { fontSize: 14, fontWeight: "600", color: colors.primaryDark },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  meta: { fontSize: 13.5, color: colors.textMuted },
  title: { letterSpacing: -1.5 },
  source: { fontSize: 14, color: colors.textMuted, marginTop: 16 },
  hero: {
    height: 380,
    width: "100%",
    borderRadius: radius.lg,
    marginTop: 30,
    marginBottom: 30,
  },
  body: { fontSize: 18, lineHeight: 30, color: colors.text, marginBottom: 32 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  primaryBtnText: { color: colors.white, fontWeight: "700", fontSize: 14.5 },
  ghostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  ghostBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  ghostText: { fontWeight: "600", color: colors.text, fontSize: 14 },
});
