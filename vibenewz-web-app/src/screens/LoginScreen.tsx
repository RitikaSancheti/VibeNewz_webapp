import { useState } from "react";
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { getUser, createUser } from "../api";
import { Sans, Serif, Eyebrow } from "../components/Typography";
import { Logo } from "../components/TopNav";
import { colors, fonts, radius, shadows } from "../theme";

export function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    const trimmed = username.trim().toLowerCase();
    if (!trimmed) {
      setError("Please enter a username");
      return;
    }
    setLoading(true);
    setError("");
    try {
      let userData = await getUser(trimmed);
      if (!userData) userData = await createUser(trimmed);
      await login(trimmed, userData);
    } catch {
      setError("Could not connect to the backend. Is your server running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.page}>
      <View style={[styles.card, shadows.raised]}>
        <Logo size={40} />
        <View style={styles.eyebrowRow}>
          <Ionicons
            name="sparkles-outline"
            size={13}
            color={colors.primaryDark}
          />
          <Eyebrow>News that lifts you up</Eyebrow>
        </View>
        <Serif style={styles.title}>Welcome back.</Serif>
        <Sans style={styles.subtitle}>
          News, balanced for how you want to feel today.
        </Sans>

        <Sans style={styles.label}>Username</Sans>
        <TextInput
          style={styles.input}
          placeholder="e.g. maya"
          placeholderTextColor={colors.textMuted}
          value={username}
          onChangeText={setUsername}
          onSubmitEditing={handleLogin}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {error ? <Sans style={styles.error}>{error}</Sans> : null}

        <Pressable
          style={({ hovered }: any) => [
            styles.button,
            hovered && { backgroundColor: colors.primaryDark },
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Sans style={styles.buttonText}>Continue</Sans>
          )}
        </Pressable>
        <Sans style={styles.hint}>
          New here? Just pick a username and we’ll create your space.
        </Sans>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 40,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 36,
    marginBottom: 10,
  },
  title: { fontSize: 52, lineHeight: 56, letterSpacing: -1.5 },
  subtitle: {
    fontSize: 15.5,
    color: colors.textBody,
    marginTop: 10,
    marginBottom: 30,
  },
  label: { fontSize: 12.5, fontWeight: "600", marginBottom: 6 },
  input: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    fontFamily: fonts.sans,
    marginBottom: 12,
  },
  error: { color: colors.danger, marginBottom: 12, fontSize: 13 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  buttonText: { color: colors.white, fontWeight: "700", fontSize: 16 },
  hint: {
    fontSize: 12.5,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 16,
  },
});
