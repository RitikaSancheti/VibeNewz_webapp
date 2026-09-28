import { View, Text, StyleSheet } from "react-native";
import { colors, sentimentColor } from "../theme";
import { Sentiment } from "../api";

export function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  const color = sentimentColor(sentiment);
  const label = sentiment.charAt(0) + sentiment.slice(1).toLowerCase();

  return (
    <View style={[styles.badge, { backgroundColor: color + "22" }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
});
