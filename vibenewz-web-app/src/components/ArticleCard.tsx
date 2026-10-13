// The story card used in the Home grid and on Bookmarks.
// Desktop: photo on top, text below.
// Phone:   photo on the left, text on the right (a compact row).
import { View, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import { NewsArticle } from "../api";
import { colors, radius, MOBILE_MAX_WIDTH } from "../theme";
import { Sans, Serif } from "./Typography";
import { SentimentBadge } from "./SentimentBadge";
import { StoryImage } from "./StoryImage";
import { ListenButton } from "../audio/ListenButton";
import { useBookmarks } from "../context/BookmarksContext";
import { useWellbeing } from "../context/WellbeingContext";
import { readMinutes, titleCase } from "../utils/news";

interface Props {
  article: NewsArticle;
  onPress: () => void;
  width?: number;
}

export function ArticleCard({ article, onPress, width }: Props) {
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const { isLiked, toggleLike } = useWellbeing();
  const { width: screenWidth } = useWindowDimensions();
  const mobile = screenWidth < MOBILE_MAX_WIDTH;
  const saved = isBookmarked(article.id);
  const liked = isLiked(article.id);

  const bookmarkButton = (
    <Pressable
      accessibilityLabel={saved ? "Remove bookmark" : "Bookmark story"}
      onPress={(e: any) => {
        e?.stopPropagation?.();
        toggleBookmark(article);
      }}
      style={[
        styles.bookmarkBtn,
        mobile && styles.bookmarkBtnSmall,
        saved && styles.bookmarkBtnActive,
      ]}
    >
      <Feather
        name="bookmark"
        size={mobile ? 14 : 16}
        color={saved ? colors.white : colors.text}
      />
    </Pressable>
  );

  const likeButton = (
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
        size={mobile ? 15 : 16}
        color={liked ? colors.peach : colors.textMuted}
      />
      <Sans style={[styles.likeText, liked && { color: "#B86A22" }]}>
        {liked ? "Liked" : "Like"}
      </Sans>
    </Pressable>
  );

  // ---- Phone: image left, text right ----
  if (mobile) {
    return (
      <Pressable
        onPress={onPress}
        style={[styles.card, styles.rowCard, width ? { width } : null]}
      >
        <StoryImage
          uri={article.image_url}
          seed={article.category || article.title}
          style={styles.rowImage}
        >
          {bookmarkButton}
        </StoryImage>

        <View style={styles.rowBody}>
          <View style={styles.rowMeta}>
            <SentimentBadge sentiment={article.sentiment} size="sm" />
            <Sans style={styles.rowMetaText} numberOfLines={1}>
              {article.category || "General"} · {readMinutes(article)} min
            </Sans>
          </View>

          <Serif style={styles.rowTitle} numberOfLines={3}>
            {article.title}
          </Serif>
          {article.description ? (
            <Sans style={styles.rowDescription} numberOfLines={2}>
              {article.description}
            </Sans>
          ) : null}

          <View style={styles.rowFooter}>
            <Sans style={styles.place} numberOfLines={1}>
              {titleCase(article.country) || article.source}
            </Sans>
            {likeButton}
          </View>
        </View>
      </Pressable>
    );
  }

  // ---- Desktop: image on top (unchanged) ----
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered }: any) => [
        styles.card,
        width ? { width } : null,
        hovered && styles.cardHover,
      ]}
    >
      <StoryImage
        uri={article.image_url}
        seed={article.category || article.title}
        style={styles.image}
      >
        {bookmarkButton}
      </StoryImage>

      <View style={styles.body}>
        <View style={styles.metaRow}>
          <SentimentBadge sentiment={article.sentiment} />
          <Sans style={styles.meta} numberOfLines={1}>
            {article.category || "General"} · {readMinutes(article)} min
          </Sans>
        </View>

        <Serif style={styles.title} numberOfLines={3}>
          {article.title}
        </Serif>
        <Sans style={styles.description} numberOfLines={3}>
          {article.description}
        </Sans>

        <View style={styles.footer}>
          <Sans style={styles.place} numberOfLines={1}>
            {titleCase(article.country) || article.source}
          </Sans>
          <View style={styles.footerActions}>
            <ListenButton article={article} />
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
    transitionDuration: "200ms",
    transitionProperty: "transform, box-shadow",
  } as any,
  cardHover: {
    transform: [{ translateY: -3 }],
    boxShadow: "0 16px 36px rgba(125, 105, 40, 0.12)",
  } as any,
  image: { height: 185, width: "100%" },
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
  bookmarkBtnSmall: {
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
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
  footerActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  likeBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  likeText: { fontSize: 13, color: colors.textMuted },

  // phone row layout
  rowCard: {
    flexDirection: "row",
    width: "100%",
    minHeight: 150,
    borderRadius: 16,
  },
  rowImage: { width: 118, alignSelf: "stretch" },
  rowBody: { flex: 1, paddingHorizontal: 14, paddingVertical: 12 },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  rowMetaText: { fontSize: 11.5, color: colors.textMuted, flexShrink: 1 },
  rowTitle: { fontSize: 17.5, lineHeight: 21, marginBottom: 6 },
  rowDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    marginBottom: 10,
  },
  rowFooter: {
    marginTop: "auto",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
});
