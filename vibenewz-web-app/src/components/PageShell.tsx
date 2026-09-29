import { ReactNode, useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { TopNav } from "./TopNav";
import { Sans, Serif, Eyebrow } from "./Typography";
import { colors, shadows, NAV_HEIGHT, CONTENT_MAX_WIDTH } from "../theme";

export function PageShell({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const gutter = width < 700 ? 16 : width < 1100 ? 32 : 56;

  return (
    <View style={styles.page}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: NAV_HEIGHT + 34,
          paddingBottom: 96,
          paddingHorizontal: gutter,
        }}
      >
        <View style={styles.column}>{children}</View>
      </ScrollView>
      <TopNav />
      <HelpButton />
    </View>
  );
}

export function PageHeader({
  icon,
  eyebrow,
  title,
  subtitle,
  right,
}: {
  icon: keyof typeof Feather.glyphMap;
  eyebrow: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  const { width } = useWindowDimensions();
  const titleSize = width < 700 ? 46 : width < 1100 ? 62 : 78;
  return (
    <View style={styles.header}>
      <View style={{ flex: 1, minWidth: 260 }}>
        <View style={styles.eyebrowRow}>
          <Feather name={icon} size={13} color={colors.primaryDark} />
          <Eyebrow>{eyebrow}</Eyebrow>
        </View>
        <Serif
          style={[
            styles.title,
            { fontSize: titleSize, lineHeight: titleSize * 1.02 },
          ]}
        >
          {title}
        </Serif>
        {subtitle ? <Sans style={styles.subtitle}>{subtitle}</Sans> : null}
      </View>
      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  );
}

export function OutlinePill({ label }: { label: string }) {
  return (
    <View style={styles.outlinePill}>
      <Sans style={styles.outlinePillText}>{label}</Sans>
    </View>
  );
}

function HelpButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open ? (
        <View style={[styles.helpCard, shadows.raised]}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Serif style={{ fontSize: 20 }}>How VibeNewz works</Serif>
            <Pressable
              onPress={() => setOpen(false)}
              accessibilityLabel="Close help"
            >
              <Feather name="x" size={18} color={colors.text} />
            </Pressable>
          </View>
          <Sans style={styles.helpText}>
            • Slide “Set today’s vibe” to choose how uplifting your feed is.
          </Sans>
          <Sans style={styles.helpText}>
            • Check in with your mood — it gently shapes what you see.
          </Sans>
          <Sans style={styles.helpText}>
            • Save stories with the bookmark button, explore regions on the
            Global map.
          </Sans>
          <Sans style={styles.helpText}>
            • My wellbeing shows your reading balance and app analytics.
          </Sans>
        </View>
      ) : null}
      <Pressable
        style={[styles.helpBtn, shadows.pill]}
        onPress={() => setOpen((o) => !o)}
        accessibilityLabel="Help"
      >
        <Sans style={{ fontSize: 18, color: colors.text }}>?</Sans>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  column: { width: "100%", maxWidth: CONTENT_MAX_WIDTH, alignSelf: "center" },
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: 24,
    marginBottom: 40,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  title: { letterSpacing: -2, color: colors.text },
  subtitle: {
    fontSize: 17,
    lineHeight: 26,
    color: colors.textBody,
    marginTop: 18,
    maxWidth: 640,
  },
  headerRight: { paddingBottom: 6 },
  outlinePill: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  outlinePillText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primaryDark,
  },
  helpBtn: {
    position: "absolute",
    right: 22,
    bottom: 22,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },
  helpCard: {
    position: "absolute",
    right: 22,
    bottom: 76,
    width: 320,
    maxWidth: "90%" as any,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    zIndex: 50,
  },
  helpText: { fontSize: 13.5, lineHeight: 20, marginTop: 6 },
});
