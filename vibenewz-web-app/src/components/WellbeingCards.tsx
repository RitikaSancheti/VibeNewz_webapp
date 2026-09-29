import { View, Pressable, StyleSheet } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { colors, radius, shadows } from "../theme";
import { Sans, Serif, Eyebrow } from "./Typography";
import {
  MOODS,
  useWellbeing,
  weeklyBalance,
} from "../context/WellbeingContext";

function CardHeader({
  eyebrow,
  title,
  icon,
}: {
  eyebrow: string;
  title: string;
  icon: keyof typeof Feather.glyphMap;
}) {
  return (
    <View style={styles.headerRow}>
      <View style={{ flex: 1 }}>
        <Eyebrow style={{ marginBottom: 10 }}>{eyebrow}</Eyebrow>
        <Serif style={styles.cardTitle}>{title}</Serif>
      </View>
      <View style={styles.headerIcon}>
        <Feather name={icon} size={19} color="#D6A42E" />
      </View>
    </View>
  );
}

export function MoodCheckInCard() {
  const { mood, setMood } = useWellbeing();
  const selected = MOODS.find((m) => m.key === mood);

  return (
    <View style={[styles.card, shadows.card]}>
      <CardHeader
        eyebrow="Mindful check-in"
        title="How are you feeling?"
        icon="heart"
      />
      <Sans style={styles.body}>
        Pause for a moment. Your response gently shapes your feed.
      </Sans>

      <View style={styles.moodRow}>
        {MOODS.map((m) => {
          const active = m.key === mood;
          return (
            <Pressable
              key={m.key}
              onPress={() => setMood(m.key)}
              accessibilityLabel={`I feel ${m.label.toLowerCase()}`}
              style={({ hovered }: any) => [
                styles.moodTile,
                hovered && !active && { backgroundColor: "#FFF1CC" },
                active && styles.moodTileActive,
              ]}
            >
              <View style={styles.face}>
                <Sans style={styles.faceText}>{m.face}</Sans>
              </View>
              <Sans
                style={[
                  styles.moodLabel,
                  active && { fontWeight: "700", color: colors.primaryDark },
                ]}
              >
                {m.label}
              </Sans>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.callout}>
        <Ionicons
          name="sparkles-outline"
          size={14}
          color={colors.primaryDark}
        />
        <Sans style={styles.calloutText}>
          {selected
            ? selected.message
            : "Pick whatever fits. There’s no wrong answer."}
        </Sans>
      </View>
    </View>
  );
}

export function ReadingBalanceCard() {
  const { reads } = useWellbeing();
  const b = weeklyBalance(reads);

  const rows = [
    { label: "Positive", value: b.positive, color: colors.primary },
    { label: "Neutral", value: b.neutral, color: colors.neutralGreen },
    { label: "Deeper reads", value: b.deeper, color: colors.peach },
  ];

  return (
    <View style={[styles.card, shadows.card]}>
      <CardHeader
        eyebrow="This week"
        title="Your reading balance"
        icon="trending-up"
      />
      <View style={styles.balanceRow}>
        <Donut segments={rows} total={b.total} />
        <View style={{ flex: 1, gap: 14 }}>
          {rows.map((r) => (
            <View key={r.label} style={styles.legendRow}>
              <View style={[styles.dot, { backgroundColor: r.color }]} />
              <Sans style={styles.legendLabel}>{r.label}</Sans>
              <Sans style={styles.legendValue}>{r.value}%</Sans>
            </View>
          ))}
        </View>
      </View>
      <View style={[styles.callout, { marginTop: 24 }]}>
        <Sans style={styles.calloutText}>{b.insight}</Sans>
      </View>
    </View>
  );
}

// Plain SVG donut chart (no chart library needed)
function Donut({
  segments,
  total,
}: {
  segments: { value: number; color: string }[];
  total: number;
}) {
  const size = 112;
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <View style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={colors.primarySoft}
          strokeWidth={stroke}
        />
        {total > 0 &&
          segments.map((s, i) => {
            const len = (s.value / 100) * c;
            const el = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );
            offset += len;
            return el;
          })}
      </svg>
      <View style={styles.donutCenter}>
        <Serif style={{ fontSize: 26, lineHeight: 28 }}>{total}</Serif>
        <Sans style={{ fontSize: 10.5, color: colors.textMuted }}>
          {total === 1 ? "story" : "stories"}
        </Sans>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 28,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.butter,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 26, lineHeight: 30 },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textBody,
    marginBottom: 20,
  },
  moodRow: { flexDirection: "row", gap: 8, marginBottom: 18 },
  moodTile: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: "transparent",
    gap: 6,
  },
  moodTileActive: { backgroundColor: colors.butter, borderColor: "#F3C74A" },
  face: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  faceText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 18,
  },
  moodLabel: { fontSize: 11.5, color: colors.textBody },
  callout: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.butter,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  calloutText: { fontSize: 12.5, lineHeight: 18, color: "#6B6433", flex: 1 },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
    marginTop: 8,
  },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  legendLabel: { flex: 1, fontSize: 12.5, color: colors.textBody },
  legendValue: { fontSize: 12.5, fontWeight: "700", color: colors.text },
  donutCenter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
