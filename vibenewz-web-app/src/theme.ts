// A tiny shared style palette so every screen looks consistent.
// Feel free to tweak these colors later — this is intentionally simple.

export const colors = {
  background: "#F5F2EB",
  card: "#FFFFFF",
  text: "#1F2937",
  textMuted: "#6B7280",
  border: "#E5E7EB",
  primary: "#1AAE74", // green, matches your old app's accent
  positive: "#1AAE74",
  neutral: "#B87D12",
  negative: "#D64545",
  danger: "#D64545",
};

export function sentimentColor(sentiment: string): string {
  if (sentiment === "POSITIVE") return colors.positive;
  if (sentiment === "NEGATIVE") return colors.negative;
  return colors.neutral;
}
