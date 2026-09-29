import { Text, TextProps, StyleSheet } from "react-native";
import { colors, fonts } from "../theme";

export function Sans({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.sans, style]} />;
}

export function Serif({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.serif, style]} />;
}

// Small uppercase green label, e.g. "YOUR DAILY BALANCE"
export function Eyebrow({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.sans, styles.eyebrow, style]} />;
}

const styles = StyleSheet.create({
  sans: { fontFamily: fonts.sans, color: colors.textBody },
  serif: { fontFamily: fonts.serif, color: colors.text, fontWeight: "500" },
  eyebrow: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: colors.primaryDark,
  },
});
