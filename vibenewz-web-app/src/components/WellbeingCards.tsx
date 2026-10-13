import { View, Pressable, StyleSheet } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { colors, radius, shadows } from "../theme";
import { Sans, Serif, Eyebrow } from "./Typography";
import {
  MOODS,
  useWellbeing,
  weeklyBalance,
} from "../context/WellbeingContext";
import { useAuth } from "../context/AuthContext";
import { Sentiment, updatePreferredSentiment } from "../api";

import {useState} from "react";

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
// ---- Feed preference slider (My wellbeing) ------------------------------
// Three stops, left to right. The stop you pick leads your feed; the other
// two still appear in smaller amounts (the backend decides the mix).
const FEED_STOPS: { key: Sentiment; label: string; message: string }[] = [
  {
    key: "POSITIVE",
    label: "Positive",
    message: "Uplifting stories lead your feed, with a few others mixed in.",
  },
  {
    key: "NEUTRAL",
    label: "Neutral",
    message: "Balanced, factual stories lead your feed, with a few others mixed in.",
  },
  {
    key: "NEGATIVE",
    label: "Deeper reads",
    message: "Heavier stories lead your feed, with a few others mixed in.",
  },
];

export function FeedPreferenceCard() {
  const { username, user, updateUser } = useAuth();
  const [status, setStatus] = useState<"" | "saving" | "saved" | "error">("");

  const current = user?.preferred_sentiment || "POSITIVE";
  const index = Math.max(
    0,
    FEED_STOPS.findIndex((s) => s.key === current),
  );

  async function choose(sentiment: Sentiment) {
    if (!username) return;
    setStatus("saving");
    try {
      // Save on the server, then update the copy of the user kept in the app
      // so the slider (and the Home feed) see the new choice straight away.
      const updated = await updatePreferredSentiment(username, sentiment);
      await updateUser(updated);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <View style={[styles.card, shadows.card]}>
      <CardHeader
        eyebrow="Your feed"
        title="What kind of news do you want?"
        icon="sliders"
      />
      <Sans style={styles.body}>
        Choose what leads your feed. The other kinds still show up in smaller
        amounts, so you’re never stuck in a bubble.
      </Sans>

      <View style={styles.sliderWrap}>
        <View style={styles.sliderTrack}>
          <View style={[styles.sliderFill, { width: `${index * 50}%` }]} />
        </View>
        <View style={styles.stopsRow}>
          {FEED_STOPS.map((s, i) => (
            <Pressable
              key={s.key}
              onPress={() => choose(s.key)}
              accessibilityRole="radio"
              accessibilityState={{ selected: i === index }}
              accessibilityLabel={`Show me ${s.label.toLowerCase()} stories first`}
              style={styles.stop}
            >
              <View
                style={[
                  styles.stopDot,
                  i <= index && styles.stopDotOn,
                  i === index && styles.stopDotCurrent,
                ]}
              />
              <Sans
                style={[
                  styles.stopLabel,
                  i === index && { fontWeight: "700", color: colors.primaryDark },
                ]}
              >
                {s.label}
              </Sans>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.callout}>
        <Ionicons
          name="sparkles-outline"
          size={14}
          color={colors.primaryDark}
        />
        <Sans style={styles.calloutText}>
          {status === "error"
            ? "Couldn’t save that. Is the backend running?"
            : status === "saved"
              ? "Saved. Your Home feed will use this next time it loads."
              : FEED_STOPS[index].message}
        </Sans>
      </View>
    </View>
  );
}

// ---- Muted keywords (shown on Home) -------------------------------------
export function MutedKeywordsCard({
  keywords,
  onManage,
}: {
  keywords: string[];
  onManage: () => void;
}) {
  return (
    <View style={[styles.card, shadows.card]}>
      <CardHeader
        eyebrow="Your boundaries"
        title="Muted keywords"
        icon="eye-off"
      />
      <Sans style={styles.body}>
        {keywords.length
          ? "Stories mentioning these words are hidden from your feed."
          : "Nothing is muted. Add words you’d rather not see in Preferences."}
      </Sans>
      {keywords.length ? (
        <View style={styles.mutedWrap}>
          {keywords.map((k) => (
            <View key={k} style={styles.mutedChip}>
              <Feather name="eye-off" size={12} color="#9A5A1C" />
              <Sans style={styles.mutedText}>{k}</Sans>
            </View>
          ))}
        </View>
      ) : null}
      <Pressable
        onPress={onManage}
        style={styles.manageLink}
        accessibilityLabel="Manage muted keywords"
      >
        <Sans style={styles.manageText}>
          {keywords.length ? "Manage muted keywords" : "Add a muted keyword"}
        </Sans>
        <Feather name="chevron-right" size={15} color={colors.primaryDark} />
      </Pressable>
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
  mutedWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  mutedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.peachSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  mutedText: { fontSize: 12.5, fontWeight: "600", color: "#7A4718" },
  manageLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
  },
 
  manageText: { fontSize: 13.5, fontWeight: "600", color: colors.primaryDark },
  sliderWrap: { marginTop: 4, marginBottom: 22 },
  // The line runs from the centre of the first dot to the centre of the last
  // one (each of the 3 stops takes a third of the width).
  sliderTrack: {
    position: "absolute",
    top: 9,
    left: "16.666%",
    right: "16.666%",
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primarySoft,
    overflow: "hidden",
  },
  sliderFill: { height: "100%", backgroundColor: colors.primary },
  stopsRow: { flexDirection: "row" },
  stop: { flex: 1, alignItems: "center", gap: 8 },
  stopDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: colors.primarySoft,
  },
  stopDotOn: { borderColor: colors.primary },
  stopDotCurrent: { backgroundColor: colors.primary },
  stopLabel: { fontSize: 13, color: colors.textBody },
});
