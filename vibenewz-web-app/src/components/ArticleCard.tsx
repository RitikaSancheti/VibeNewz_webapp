import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { NewsArticle } from "../api";
import { colors } from "../theme";
import { SentimentBadge } from "./SentimentBadge";

interface Props {
  article: NewsArticle;
  onPress: () => void;
}

export function ArticleCard({ article, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.headerRow}>
        <SentimentBadge sentiment={article.sentiment} />
        {article.category ? <Text style={styles.category}>{article.category}</Text> : null}
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {article.title}
      </Text>

      <Text style={styles.description} numberOfLines={2}>
        {article.description}
      </Text>

      <Text style={styles.source}>{article.source}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  category: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "600",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 8,
  },
  source: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: "italic",
  },
});
