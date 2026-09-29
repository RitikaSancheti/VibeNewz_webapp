import { useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  SentimentCounts,
  CategoryCount,
  TrendDay,
  getSentimentCounts,
  getCategoryDistribution,
  getSentimentTrend,
} from "../api";
import { PageShell, PageHeader } from "../components/PageShell";
import {
  MoodCheckInCard,
  ReadingBalanceCard,
} from "../components/WellbeingCards";
import { Sans, Serif, Eyebrow } from "../components/Typography";
import { MOODS, useWellbeing } from "../context/WellbeingContext";
import { colors, radius, shadows } from "../theme";

export function WellbeingScreen() {
  const { width } = useWindowDimensions();
  const [counts, setCounts] = useState<SentimentCounts | null>(null);
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [trend, setTrend] = useState<TrendDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      Promise.all([
        getSentimentCounts(),
        getCategoryDistribution(),
        getSentimentTrend(),
      ])
        .then(([c, cats, t]) => {
          setCounts(c);
          setCategories([...cats].sort((a, b) => b.count - a.count));
          setTrend(t);
          setError("");
        })
        .catch(() =>
          setError(
            "Couldn't load analytics. Check that the backend is running.",
          ),
        )
        .finally(() => setLoading(false));
    }, []),
  );

  const twoCol = width >= 900;
  const threeCol = width >= 1200;

  return (
    <PageShell>
      <PageHeader
        icon="trending-up"
        eyebrow="Your balance"
        title="My wellbeing"
        subtitle="Check in with yourself, see the balance of what you read, and how today’s news landscape looks."
      />

      <View style={[styles.row, !twoCol && { flexDirection: "column" }]}>
        <View style={styles.col}>
          <MoodCheckInCard />
        </View>
        <View style={styles.col}>
          <ReadingBalanceCard />
        </View>
        {threeCol ? (
          <View style={styles.col}>
            <MoodWeek />
          </View>
        ) : null}
      </View>
      {!threeCol ? (
        <View style={{ marginTop: 20 }}>
          <MoodWeek />
        </View>
      ) : null}

      <View style={{ marginTop: 64, marginBottom: 26 }}>
        <Eyebrow style={{ marginBottom: 12 }}>App analytics</Eyebrow>
        <Serif style={[styles.sectionTitle, width < 700 && { fontSize: 34 }]}>
          The news landscape
        </Serif>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : error ? (
        <Sans style={{ color: colors.danger }}>{error}</Sans>
      ) : (
        <>
          <View style={[styles.row, !twoCol && { flexDirection: "column" }]}>
            <View style={styles.col}>
              <SentimentBreakdown counts={counts} />
            </View>
            <View style={styles.col}>
              <CategoryCard categories={categories} />
            </View>
          </View>
          <View style={{ marginTop: 20 }}>
            <TrendCard trend={trend} />
          </View>
        </>
      )}
    </PageShell>
  );
}

function MoodWeek() {
  const { moodHistory } = useWellbeing();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    const next = d.getTime() + 24 * 60 * 60 * 1000;
    const entries = moodHistory.filter(
      (m) => m.at >= d.getTime() && m.at < next,
    );
    const last = entries[entries.length - 1];
    return {
      date: d,
      mood: last ? MOODS.find((m) => m.key === last.mood) : undefined,
    };
  });
  const checkIns = moodHistory.filter(
    (m) => m.at > Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).length;

  return (
    <View style={[styles.card, shadows.card]}>
      <Eyebrow style={{ marginBottom: 10 }}>Last 7 days</Eyebrow>
      <Serif style={styles.cardTitle}>Your mood this week</Serif>
      <Sans style={[styles.muted, { marginTop: 8 }]}>
        {checkIns === 0
          ? "No check-ins yet this week."
          : `${checkIns} check-in${checkIns === 1 ? "" : "s"} this week.`}
      </Sans>
      <View style={styles.weekRow}>
        {days.map(({ date, mood }) => (
          <View key={date.toISOString()} style={styles.dayCol}>
            <View style={[styles.dayFace, !mood && styles.dayFaceEmpty]}>
              <Sans style={styles.dayFaceText}>{mood ? mood.face : ""}</Sans>
            </View>
            <Sans style={styles.dayLabel}>
              {date.toLocaleDateString(undefined, { weekday: "narrow" })}
            </Sans>
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        {MOODS.map((m) => (
          <Sans key={m.key} style={styles.legendItem}>
            {m.face} {m.label}
          </Sans>
        ))}
      </View>
    </View>
  );
}

function Bar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <View style={styles.barRow}>
      <Sans style={styles.barLabel} numberOfLines={1}>
        {label}
      </Sans>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            { width: `${percent}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Sans style={styles.barValue}>{value}</Sans>
    </View>
  );
}

function SentimentBreakdown({ counts }: { counts: SentimentCounts | null }) {
  const total = counts?.TOTAL || 0;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const items = [
    { label: "Positive", value: counts?.POSITIVE || 0, color: colors.primary },
    {
      label: "Neutral",
      value: counts?.NEUTRAL || 0,
      color: colors.neutralGreen,
    },
    {
      label: "Deeper reads",
      value: counts?.NEGATIVE || 0,
      color: colors.peach,
    },
  ];
  return (
    <View style={[styles.card, shadows.card]}>
      <Eyebrow style={{ marginBottom: 10 }}>All stories</Eyebrow>
      <Serif style={styles.cardTitle}>Sentiment breakdown</Serif>
      <View style={styles.statRow}>
        <View>
          <Serif style={styles.bigNumber}>{total}</Serif>
          <Sans style={styles.muted}>articles analysed</Sans>
        </View>
        <View>
          <Serif style={[styles.bigNumber, { color: colors.primaryDark }]}>
            {pct(counts?.POSITIVE || 0)}%
          </Serif>
          <Sans style={styles.muted}>uplifting</Sans>
        </View>
      </View>
      {items.map((i) => (
        <Bar
          key={i.label}
          label={i.label}
          value={i.value}
          total={total}
          color={i.color}
        />
      ))}
    </View>
  );
}

function CategoryCard({ categories }: { categories: CategoryCount[] }) {
  const max = Math.max(1, ...categories.map((c) => c.count));
  return (
    <View style={[styles.card, shadows.card]}>
      <Eyebrow style={{ marginBottom: 10 }}>Topics</Eyebrow>
      <Serif style={[styles.cardTitle, { marginBottom: 20 }]}>
        By category
      </Serif>
      {categories.length === 0 ? (
        <Sans style={styles.muted}>No articles yet.</Sans>
      ) : (
        categories
          .slice(0, 8)
          .map((c) => (
            <Bar
              key={c.category}
              label={c.category}
              value={c.count}
              total={max}
              color={colors.sunshine}
            />
          ))
      )}
    </View>
  );
}

function TrendCard({ trend }: { trend: TrendDay[] }) {
  const max = Math.max(
    1,
    ...trend.map((d) => d.positive + d.neutral + d.serious),
  );
  const chartHeight = 180;
  return (
    <View style={[styles.card, shadows.card]}>
      <Eyebrow style={{ marginBottom: 10 }}>Past 7 days</Eyebrow>
      <Serif style={styles.cardTitle}>Sentiment trend</Serif>
      <View style={[styles.legend, { marginTop: 12 }]}>
        {[
          ["Positive", colors.primary],
          ["Neutral", colors.neutralGreen],
          ["Deeper reads", colors.peach],
        ].map(([label, color]) => (
          <View
            key={label}
            style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: color,
              }}
            />
            <Sans style={styles.legendItem}>{label}</Sans>
          </View>
        ))}
      </View>
      {trend.length === 0 ? (
        <Sans style={[styles.muted, { marginTop: 20 }]}>
          No articles published in the past week.
        </Sans>
      ) : (
        <View style={[styles.trendChart, { height: chartHeight + 30 }]}>
          {trend.map((d) => {
            const total = d.positive + d.neutral + d.serious;
            const h = (n: number) => (n / max) * chartHeight;
            return (
              <View key={d.day} style={styles.trendCol}>
                <Sans style={styles.trendTotal}>{total}</Sans>
                <View style={styles.trendStack}>
                  <View
                    style={{
                      height: h(d.serious),
                      backgroundColor: colors.peach,
                    }}
                  />
                  <View
                    style={{
                      height: h(d.neutral),
                      backgroundColor: colors.neutralGreen,
                    }}
                  />
                  <View
                    style={{
                      height: h(d.positive),
                      backgroundColor: colors.primary,
                    }}
                  />
                </View>
                <Sans style={styles.trendDay}>
                  {new Date(d.day + "T12:00:00").toLocaleDateString(undefined, {
                    weekday: "short",
                  })}
                </Sans>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 20, alignItems: "stretch" },
  col: { flex: 1, minWidth: 0 },
  sectionTitle: { fontSize: 46, lineHeight: 52, letterSpacing: -1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 28,
    flex: 1,
  },
  cardTitle: { fontSize: 26, lineHeight: 30 },
  muted: { fontSize: 13, color: colors.textMuted },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 26,
    marginBottom: 22,
  },
  dayCol: { alignItems: "center", gap: 8 },
  dayFace: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  dayFaceEmpty: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  dayFaceText: { fontSize: 15, fontWeight: "700", color: colors.text },
  dayLabel: { fontSize: 12, color: colors.textMuted },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  legendItem: { fontSize: 12.5, color: colors.textBody },
  statRow: { flexDirection: "row", gap: 40, marginTop: 18, marginBottom: 24 },
  bigNumber: { fontSize: 44, lineHeight: 48 },
  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  barLabel: { width: 110, fontSize: 13.5, color: colors.text },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: colors.cream,
    borderRadius: 999,
    overflow: "hidden",
    marginHorizontal: 10,
  },
  barFill: { height: "100%", borderRadius: 999 },
  barValue: {
    width: 34,
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    textAlign: "right",
  },
  trendChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 14,
    marginTop: 24,
  },
  trendCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
  },
  trendTotal: { fontSize: 12, color: colors.textMuted, marginBottom: 6 },
  trendStack: {
    width: "100%",
    maxWidth: 56,
    borderRadius: 10,
    overflow: "hidden",
  },
  trendDay: { fontSize: 12, color: colors.textMuted, marginTop: 8 },
});
