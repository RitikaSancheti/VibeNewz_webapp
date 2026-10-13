// ============================================================
// AudioPlayerBar — floating player shown at the bottom of every
// page while an article summary is loaded. Click the line to skip,
// change speed, or move to the previous/next story.
// ============================================================

import { useRef, useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors, shadows } from "../theme";
import { Sans } from "../components/Typography";
import {
  useAudioPlayer,
  togglePlay,
  playNext,
  playPrevious,
  seekTo,
  setSpeed,
  SPEEDS,
  stopSpeaking,
} from "./speech";

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function AudioPlayerBar() {
  const navigation = useNavigation<any>();
  const player = useAudioPlayer();
  const trackRef = useRef<any>(null);

  if (!player.article) return null;
  const { article } = player;
  const playing = player.status === "playing";

  // Turn the click position on the line into a 0–1 fraction
  function onTrackPress(e: any) {
    const rect = trackRef.current?.getBoundingClientRect?.();
    const x = e?.nativeEvent?.clientX ?? e?.nativeEvent?.pageX;
    if (!rect || rect.width === 0 || typeof x !== "number") return;
    seekTo((x - rect.left) / rect.width);
  }

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={[styles.bar, shadows.raised]}>
        <View style={styles.topRow}>
          <Feather name="volume-2" size={15} color={colors.primaryDark} />
          <Pressable
            style={styles.titleBtn}
            accessibilityLabel={`Open story: ${article.title}`}
            onPress={() =>
              navigation.navigate("ArticleDetail", { id: article.id })
            }
          >
            <Sans style={styles.title} numberOfLines={1}>
              {article.title}
            </Sans>
          </Pressable>
          <SpeedMenu rate={player.rate} />
          <Pressable
            onPress={stopSpeaking}
            accessibilityLabel="Close audio player"
            style={styles.iconBtn}
          >
            <Feather name="x" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.bottomRow}>
          <Pressable
            onPress={playPrevious}
            disabled={!player.hasPrevious}
            accessibilityLabel="Previous story"
            style={[styles.iconBtn, !player.hasPrevious && styles.disabled]}
          >
            <Feather name="skip-back" size={18} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={togglePlay}
            accessibilityLabel={playing ? "Pause" : "Play"}
            style={styles.playBtn}
          >
            <Feather
              name={playing ? "pause" : "play"}
              size={18}
              color={colors.white}
            />
          </Pressable>
          <Pressable
            onPress={playNext}
            disabled={!player.hasNext}
            accessibilityLabel="Next story"
            style={[styles.iconBtn, !player.hasNext && styles.disabled]}
          >
            <Feather name="skip-forward" size={18} color={colors.text} />
          </Pressable>

          <Sans style={styles.time}>{formatTime(player.elapsedSeconds)}</Sans>
          <Pressable
            ref={trackRef}
            onPress={onTrackPress}
            accessibilityLabel="Audio progress, click to skip"
            style={styles.track}
          >
            <View style={styles.trackLine}>
              <View
                style={[
                  styles.trackFill,
                  { width: `${player.progress * 100}%` as any },
                ]}
              />
            </View>
            <View
              style={[
                styles.thumb,
                { left: `${player.progress * 100}%` as any },
              ]}
            />
          </Pressable>
          <Sans style={styles.time}>{formatTime(player.totalSeconds)}</Sans>
        </View>
      </View>
    </View>
  );
}

// Speed button that opens a list of speeds to pick from
function SpeedMenu({ rate }: { rate: number }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.speedWrap}>
      {open ? (
        <>
          {/* Clicking anywhere else closes the menu */}
          <Pressable
            style={styles.backdrop}
            onPress={() => setOpen(false)}
            accessibilityLabel="Close speed menu"
          />
          <View style={[styles.menu, shadows.raised]}>
            <Sans style={styles.menuHeading}>Speed</Sans>
            {SPEEDS.map((speed) => {
              const selected = speed === rate;
              return (
                <Pressable
                  key={speed}
                  accessibilityRole="menuitem"
                  accessibilityLabel={`${speed}x speed`}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setSpeed(speed);
                    setOpen(false);
                  }}
                  style={({ hovered }: any) => [
                    styles.menuItem,
                    hovered && { backgroundColor: colors.background },
                    selected && { backgroundColor: colors.primarySoft },
                  ]}
                >
                  <Sans
                    style={[styles.menuText, selected && styles.menuTextOn]}
                  >
                    {speed === 1 ? "1x (normal)" : `${speed}x`}
                  </Sans>
                  {selected ? (
                    <Feather
                      name="check"
                      size={14}
                      color={colors.primaryDark}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
      <Pressable
        style={styles.speedBtn}
        onPress={() => setOpen((o) => !o)}
        accessibilityLabel={`Playback speed ${rate}x, choose a speed`}
        accessibilityState={{ expanded: open }}
      >
        <Sans style={styles.speedText}>{rate}x</Sans>
        <Feather
          name={open ? "chevron-down" : "chevron-up"}
          size={13}
          color={colors.primaryDark}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Leaves room on the right for the "?" help button
  wrapper: {
    position: "absolute",
    left: 16,
    right: 76,
    bottom: 16,
    alignItems: "center",
    zIndex: 60,
  },
  bar: {
    width: "100%",
    maxWidth: 720,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  titleBtn: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontWeight: "600", color: colors.text },
  speedWrap: { position: "relative", zIndex: 2 },
  speedBtn: {
    flexDirection: "row",
    gap: 2,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    minWidth: 48,
    alignItems: "center",
  },
  speedText: { fontSize: 12.5, fontWeight: "700", color: colors.primaryDark },
  // Covers the whole window behind the open menu
  backdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    cursor: "default",
  } as any,
  menu: {
    position: "absolute",
    bottom: "100%",
    right: 0,
    marginBottom: 8,
    width: 150,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
  },
  menuHeading: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  menuText: { fontSize: 14, color: colors.text },
  menuTextOn: { fontWeight: "700", color: colors.primaryDark },
  bottomRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: { padding: 6 },
  disabled: { opacity: 0.3 },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  time: {
    fontSize: 12,
    color: colors.textMuted,
    minWidth: 32,
    textAlign: "center",
  },
  // Tall invisible hit area so the thin line is easy to click
  track: { flex: 1, paddingVertical: 10, justifyContent: "center" },
  trackLine: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  trackFill: { height: "100%", backgroundColor: colors.primary },
  thumb: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: -6,
    backgroundColor: colors.primaryDark,
  },
});
