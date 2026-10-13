import { Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { NewsArticle } from "../api";
import { colors } from "../theme";
import { Sans } from "../components/Typography";
import { useArticleAudio } from "./speech";

interface Props {
  article: NewsArticle;
  // "compact" sits in the article card footer, "pill" on the detail page
  variant?: "compact" | "pill";
}

export function ListenButton({ article, variant = "compact" }: Props) {
  const { supported, playing, toggle } = useArticleAudio(article);
  if (!supported) return null;

  const isPill = variant === "pill";
  const label = playing ? "Stop" : isPill ? "Listen to summary" : "Listen";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        playing ? "Stop audio summary" : "Play audio summary of this story"
      }
      onPress={(e: any) => {
        e?.stopPropagation?.();
        toggle();
      }}
      style={[
        isPill ? styles.pill : styles.compact,
        isPill && playing && styles.pillActive,
      ]}
    >
      <Feather
        name={playing ? "square" : "volume-2"}
        size={16}
        color={
          isPill
            ? playing
              ? colors.white
              : colors.text
            : playing
              ? colors.primaryDark
              : colors.textMuted
        }
      />
      <Sans
        style={[
          isPill ? styles.pillText : styles.compactText,
          playing && (isPill ? { color: colors.white } : styles.compactActive),
        ]}
      >
        {label}
      </Sans>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  compact: { flexDirection: "row", alignItems: "center", gap: 6 },
  compactText: { fontSize: 13, color: colors.textMuted },
  compactActive: { color: colors.primaryDark, fontWeight: "600" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { fontWeight: "600", color: colors.text, fontSize: 14 },
});
