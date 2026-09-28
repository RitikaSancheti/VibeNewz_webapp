import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import {
  SentimentCounts,
  CategoryCount,
  getSentimentCounts,
  getCategoryDistribution,
} from "../api";
import { colors } from "../theme";

// A simple horizontal bar — no charting library needed, just a colored
// View whose width is a percentage of the total.
function Bar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${percent}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.barValue}>{value}</Text>
    </View>
  );
}

export function AnalyticsScreen() {
  const [counts, setCounts] = useState<SentimentCounts | null>(null);
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getSentimentCounts(), getCategoryDistribution()])
      .then(([countsData, categoryData]) => {
        setCounts(countsData);
        setCategories(categoryData.sort((a, b) => b.count - a.count));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const total = counts?.TOTAL || 0;
  const maxCategoryCount = Math.max(1, ...categories.map((c) => c.count));

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.header}>Analytics</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sentiment breakdown</Text>
        <Text style={styles.totalText}>{total} articles total</Text>
        <Bar label="Positive" value={counts?.POSITIVE || 0} total={total} color={colors.positive} />
        <Bar label="Neutral" value={counts?.NEUTRAL || 0} total={total} color={colors.neutral} />
        <Bar label="Negative" value={counts?.NEGATIVE || 0} total={total} color={colors.negative} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>By category</Text>
        {categories.length === 0 ? (
          <Text style={styles.empty}>No articles yet.</Text>
        ) : (
          categories.map((c) => (
            <Bar
              key={c.category}
              label={c.category}
              value={c.count}
              total={maxCategoryCount}
              color={colors.primary}
            />
          ))
        )}
      </View>
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
  header: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  totalText: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 16,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  barLabel: {
    width: 80,
    fontSize: 13,
    color: colors.text,
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: colors.background,
    borderRadius: 999,
    overflow: "hidden",
    marginHorizontal: 8,
  },
  barFill: {
    height: "100%",
    borderRadius: 999,
  },
  barValue: {
    width: 30,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "right",
  },
  empty: {
    color: colors.textMuted,
  },
});
