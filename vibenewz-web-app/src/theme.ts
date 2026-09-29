// ============================================================
// theme.ts — the VibeNewz design system.
// ============================================================

// Your five brand colors
export const palette = {
  sunshine: "#FFD54F", // Sunshine yellow
  butter: "#FFE8A1", // Soft butter
  cream: "#FFF7E1", // Warm cream
  peach: "#FFB366", // Peach glow
  green: "#A3B454", // Sunlit green
};

export const colors = {
  ...palette,
  background: palette.cream,
  surface: "#FFFDF7",
  card: "#FFFDF7",
  text: "#3A3423",
  textBody: "#5C5647",
  textMuted: "#7D7763",
  border: "#F1E7C9",
  borderStrong: "#E6D9AE",
  primary: palette.green,
  primaryDark: "#7E8E33", // green text on light backgrounds (more readable)
  primarySoft: "#E3E8BF",
  neutralGreen: "#C7D17F",
  peachSoft: "#FFE4C8",
  forest: "#2E3A1F",
  white: "#FFFFFF",
  positive: palette.green,
  neutral: "#C9A227",
  negative: palette.peach,
  danger: "#C4553B",
};

export const fonts = {
  serif: "Newsreader, Georgia, 'Times New Roman', serif",
  sans: "'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif",
};

export const shadows = {
  card: { boxShadow: "0 12px 32px rgba(125, 105, 40, 0.07)" } as any,
  raised: { boxShadow: "0 18px 44px rgba(90, 75, 25, 0.14)" } as any,
  pill: { boxShadow: "0 4px 14px rgba(125, 105, 40, 0.08)" } as any,
};

export const radius = { sm: 12, md: 18, lg: 24, xl: 30, pill: 999 };

export const NAV_HEIGHT = 78;
export const CONTENT_MAX_WIDTH = 1420;

export function sentimentColor(sentiment: string): string {
  if (sentiment === "POSITIVE") return colors.positive;
  if (sentiment === "NEGATIVE") return colors.negative;
  return colors.neutral;
}

// "NEGATIVE" is shown to people as a softer "Deeper read"
export function sentimentLabel(sentiment: string): string {
  if (sentiment === "POSITIVE") return "Positive";
  if (sentiment === "NEGATIVE") return "Deeper read";
  return "Neutral";
}
