// "Today's vibe" card — a READ-ONLY meter that shows how the stories
// currently in your feed feel (positive / neutral / deeper reads).
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadows } from "../theme";
import { Sans, Serif } from "./Typography";
import { NewsArticle } from "../api";

export function feedVibe(articles: NewsArticle[]) {
  const total = articles.length;
  const count = (s: string) => articles.filter((a) => a.sentiment === s).length;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const positive = pct(count("POSITIVE"));
  const neutral = pct(count("NEUTRAL"));
  const deeper = total ? 100 - positive - neutral : 0;

  let mood = "Waiting for stories";
  if (total) {
    if (positive >= 75) mood = "Bright";
    else if (positive >= 55) mood = "Mostly uplifting";
    else if (positive >= 35) mood = "Balanced";
    else mood = "Grounded";
  }
  return { total, positive, neutral, deeper, mood };
}

export function VibeMeter({ articles }: { articles: NewsArticle[] }) {
  const { width } = useWindowDimensions();
  const stacked = width < 900;
  const v = feedVibe(articles);

  return (
    <View
      style={[
        styles.card,
        shadows.card,
        stacked && { flexDirection: "column", alignItems: "stretch", gap: 0 },
      ]}
    >
      <View style={styles.left}>
        <View style={styles.iconCircle}>
          <Ionicons
            name="sparkles-outline"
            size={20}
            color={colors.primaryDark}
          />
        </View>
        <View style={{ flexShrink: 1 }}>
          <Serif style={styles.title}>Today’s vibe: {v.mood}</Serif>
          <Sans style={styles.subtitle}>
            {v.total
              ? `How the ${v.total} ${v.total === 1 ? "story" : "stories"} in your feed feel right now.`
              : "We’ll measure your feed as soon as stories arrive."}
          </Sans>
        </View>
      </View>

      <View
        style={[styles.meterArea, stacked && { width: "100%", marginTop: 20 }]}
      >
        <View style={styles.labels}>
          <Sans style={styles.edgeLabel}>Grounded</Sans>
          <Sans style={styles.valueLabel}>{v.positive}% uplifting</Sans>
          <Sans style={styles.edgeLabel}>Bright</Sans>
        </View>

        <View
          style={styles.meter}
          accessibilityRole="progressbar"
          accessibilityLabel="Share of uplifting stories in your feed"
          accessibilityValue={{ min: 0, max: 100, now: v.positive }}
        >
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${v.positive}%` }]} />
          </View>
          {v.total ? (
            <View style={[styles.marker, { left: `${v.positive}%` }]} />
          ) : null}
        </View>

        <View style={styles.breakdown}>
          <Legend color={colors.primary} label="Positive" value={v.positive} />
          <Legend
            color={colors.neutralGreen}
            label="Neutral"
            value={v.neutral}
          />
          <Legend color={colors.peach} label="Deeper reads" value={v.deeper} />
        </View>
      </View>
    </View>
  );
}

function Legend({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Sans style={styles.legendText}>
        {label} <Sans style={styles.legendValue}>{value}%</Sans>
      </Sans>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 24,
    paddingHorizontal: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 40,
    marginBottom: 40,
  },
  left: { flexDirection: "row", alignItems: "center", gap: 20, flexShrink: 1 },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.butter,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 23, marginBottom: 6 },
  subtitle: { fontSize: 14.5, color: colors.textBody },
  meterArea: { width: "60%" },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  edgeLabel: { fontSize: 13, color: colors.textBody },
  valueLabel: { fontSize: 13.5, fontWeight: "700", color: colors.primaryDark },
  meter: { height: 28, justifyContent: "center" },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primarySoft,
    overflow: "hidden",
  },
  fill: { height: "100%", backgroundColor: colors.primary, borderRadius: 3 },
  marker: {
    position: "absolute",
    width: 20,
    height: 20,
    marginLeft: -10,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: colors.primary,
    top: 4,
  },
  breakdown: { flexDirection: "row", flexWrap: "wrap", gap: 18, marginTop: 6 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 12.5, color: colors.textBody },
  legendValue: { fontSize: 12.5, fontWeight: "700", color: colors.text },
});
