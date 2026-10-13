import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { NewsArticle } from "../api";
import { colors, radius } from "../theme";
import { Sans, Serif } from "./Typography";
import { SentimentBadge } from "./SentimentBadge";
import { StoryImage } from "./StoryImage";
import { useBookmarks } from "../context/BookmarksContext";
import { useWellbeing } from "../context/WellbeingContext";
import { readMinutes, titleCase } from "../utils/news";

interface Props {
  article: NewsArticle;
  onPress: () => void;
  width?: number | string;
  wide?: boolean;
}

export function ArticleCard({ article, onPress, width, wide }: Props) {
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const { isLiked, toggleLike } = useWellbeing();
  const saved = isBookmarked(article.id);
  const liked = isLiked(article.id);

  return (
    <Pressable
      onPress={onPress}
      style={({ hovered }: any) => [
        styles.card,
        wide && styles.cardWide,
        width != null ? { width } : null,
        hovered && styles.cardHover,
      ]}
    >
      <StoryImage
        uri={article.image_url}
        seed={article.category || article.title}
        style={wide ? styles.imageWide : styles.image}
      >
        <Pressable
          accessibilityLabel={saved ? "Remove bookmark" : "Bookmark story"}
          onPress={(e: any) => {
            e?.stopPropagation?.();
            toggleBookmark(article);
          }}
          style={[styles.bookmarkBtn, saved && styles.bookmarkBtnActive]}
        >
          <Feather
            name="bookmark"
            size={16}
            color={saved ? colors.white : colors.text}
          />
        </Pressable>
      </StoryImage>

      <View style={styles.body}>
        <View style={styles.metaRow}>
          <SentimentBadge sentiment={article.sentiment} />
          <Sans style={styles.meta} numberOfLines={1}>
            {article.category || "General"} · {readMinutes(article)} min
          </Sans>
        </View>

        <Serif style={[styles.title, wide && styles.titleWide]} numberOfLines={3}>
          {article.title}
        </Serif>
        <Sans style={styles.description} numberOfLines={3}>
          {article.description}
        </Sans>

        <View style={styles.footer}>
          <Sans style={styles.place} numberOfLines={1}>
            {titleCase(article.country) || article.source}
          </Sans>
          <Pressable
            accessibilityLabel={liked ? "Unlike" : "Like"}
            onPress={(e: any) => {
              e?.stopPropagation?.();
              toggleLike(article);
            }}
            style={styles.likeBtn}
          >
            <Feather
              name="heart"
              size={16}
              color={liked ? colors.peach : colors.textMuted}
            />
            <Sans style={[styles.likeText, liked && { color: "#B86A22" }]}>
              {liked ? "Liked" : "Like"}
            </Sans>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    height: 420,
    boxSizing: "border-box",
    transitionDuration: "200ms",
    transitionProperty: "box-shadow",
  } as any,
  cardHover: {
    boxShadow: "0 16px 36px rgba(125, 105, 40, 0.12)",
  } as any,
  cardWide: { flexDirection: "row", height: 268 },
  image: { height: 168, width: "100%" },
  imageWide: { width: "42%", height: "100%", minHeight: 0 },
  titleWide: { fontSize: 28, lineHeight: 32 },
  bookmarkBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,253,247,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  bookmarkBtnActive: { backgroundColor: colors.primary },
  body: { padding: 20, flex: 1 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  meta: { fontSize: 13, color: colors.textMuted, flexShrink: 1 },
  title: { fontSize: 22, lineHeight: 26, marginBottom: 12 },
  description: {
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.textMuted,
    marginBottom: 18,
  },
  footer: {
    marginTop: "auto",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  place: { fontSize: 13, color: colors.textMuted, flexShrink: 1 },
  likeBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  likeText: { fontSize: 13, color: colors.textMuted },
});
