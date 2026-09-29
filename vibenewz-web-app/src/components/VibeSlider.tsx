import { useEffect, useRef, useState } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadows } from "../theme";
import { Sans, Serif } from "./Typography";
import { useWellbeing } from "../context/WellbeingContext";

export function VibeCard() {
  const { vibe, setVibe } = useWellbeing();
  const { width } = useWindowDimensions();
  const stacked = width < 900;

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
          <Serif style={styles.title}>Set today’s vibe</Serif>
          <Sans style={styles.subtitle}>
            Choose how much uplifting news you’d like to see.
          </Sans>
        </View>
      </View>
      <View
        style={[styles.sliderArea, stacked && { width: "100%", marginTop: 20 }]}
      >
        <VibeSlider value={vibe} onCommit={setVibe} />
      </View>
    </View>
  );
}

function VibeSlider({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (v: number) => void;
}) {
  const [local, setLocal] = useState(value);
  const trackRef = useRef<View>(null);

  useEffect(() => setLocal(value), [value]);

  function valueFromEvent(e: any) {
    const node: any = trackRef.current;
    const rect = node?.getBoundingClientRect?.();
    if (!rect) return local;
    const x = (e.nativeEvent.pageX ?? e.nativeEvent.clientX) - rect.left;
    return Math.round(Math.min(100, Math.max(0, (x / rect.width) * 100)));
  }

  function onKeyDown(e: any) {
    const step = e.nativeEvent.shiftKey ? 10 : 2;
    if (e.nativeEvent.key === "ArrowRight" || e.nativeEvent.key === "ArrowUp")
      onCommit(Math.min(100, local + step));
    if (e.nativeEvent.key === "ArrowLeft" || e.nativeEvent.key === "ArrowDown")
      onCommit(Math.max(0, local - step));
  }

  return (
    <View>
      <View style={styles.labels}>
        <Sans style={styles.edgeLabel}>Grounded</Sans>
        <Sans style={styles.valueLabel}>{local}% uplifting</Sans>
        <Sans style={styles.edgeLabel}>Bright</Sans>
      </View>
      <View
        ref={trackRef}
        style={styles.hitArea}
        {...({ focusable: true, onKeyDown } as any)}
        accessibilityRole="adjustable"
        accessibilityLabel="Uplifting news level"
        accessibilityValue={{ min: 0, max: 100, now: local }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => setLocal(valueFromEvent(e))}
        onResponderMove={(e) => setLocal(valueFromEvent(e))}
        onResponderRelease={(e) => onCommit(valueFromEvent(e))}
      >
        <View style={styles.track} pointerEvents="none">
          <View style={[styles.fill, { width: `${local}%` }]} />
        </View>
        <View
          style={[styles.thumb, { left: `${local}%` }]}
          pointerEvents="none"
        />
      </View>
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
  sliderArea: { width: "63%" },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  edgeLabel: { fontSize: 13, color: colors.textBody },
  valueLabel: { fontSize: 13.5, fontWeight: "700", color: colors.primaryDark },
  hitArea: {
    height: 28,
    justifyContent: "center",
    cursor: "pointer",
    outlineStyle: "none",
  } as any,
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primarySoft,
    overflow: "hidden",
  },
  fill: { height: "100%", backgroundColor: colors.primary, borderRadius: 3 },
  thumb: {
    position: "absolute",
    width: 22,
    height: 22,
    marginLeft: -11,
    borderRadius: 11,
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: colors.primary,
    top: 3,
  },
});
