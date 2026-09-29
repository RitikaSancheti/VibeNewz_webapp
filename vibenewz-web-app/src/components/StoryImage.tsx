import { useState, ReactNode } from "react";
import { View, Image, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const GRADIENTS: [string, string][] = [
  ["#A3B454", "#5F6E2A"],
  ["#FFD54F", "#FFB366"],
  ["#C7D17F", "#7E8E33"],
  ["#FFE8A1", "#A3B454"],
  ["#FFB366", "#C9763A"],
];

function pick(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++)
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

interface Props {
  uri?: string | null;
  seed: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

export function StoryImage({ uri, seed, style, children }: Props) {
  const [failed, setFailed] = useState(false);
  const [from, to] = pick(seed || "vibe");
  const gradientId = `g-${from.slice(1)}-${to.slice(1)}`;

  return (
    <View style={[styles.wrap, style]}>
      {uri && !failed ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <View style={StyleSheet.absoluteFill}>
          <svg
            width="100%"
            height="100%"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={from} />
                <stop offset="100%" stopColor={to} />
              </linearGradient>
            </defs>
            <rect width="100" height="100" fill={`url(#${gradientId})`} />
            <circle cx="85" cy="15" r="30" fill="#FFFFFF" opacity="0.12" />
            <circle cx="10" cy="95" r="25" fill="#FFFFFF" opacity="0.08" />
          </svg>
          <View style={styles.iconWrap}>
            <Ionicons
              name="sparkles-outline"
              size={34}
              color="rgba(255,255,255,0.75)"
            />
          </View>
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden", backgroundColor: "#E9E3C8" },
  iconWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
