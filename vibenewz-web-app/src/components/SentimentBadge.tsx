import { View, StyleSheet } from "react-native";
import { Sans } from "./Typography";
import { colors, sentimentLabel } from "../theme";
import { Sentiment } from "../api";

export function SentimentBadge({
  sentiment,
  size = "md",
}: {
  sentiment: Sentiment;
  size?: "sm" | "md";
}) {
  const isDeeper = sentiment === "NEGATIVE";
  return (
    <View
      style={[
        styles.badge,
        size === "sm" && styles.small,
        { backgroundColor: isDeeper ? colors.peachSoft : colors.butter },
      ]}
    >
      <Sans
        style={[
          styles.text,
          size === "sm" && { fontSize: 11 },
          isDeeper && { color: "#9A5A1C" },
        ]}
      >
        {sentimentLabel(sentiment)}
      </Sans>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  small: { paddingHorizontal: 8, paddingVertical: 4 },
  text: { fontSize: 12, fontWeight: "700", color: "#6E6A2C" },
});
