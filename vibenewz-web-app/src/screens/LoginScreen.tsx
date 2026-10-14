import { useState, useRef } from "react";
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { getUser, createUser } from "../api";
import { Sans, Serif, Eyebrow } from "../components/Typography";
import { Logo } from "../components/TopNav";
import { colors, fonts, radius, shadows } from "../theme";

type Tab = "signin" | "signup";

export function LoginScreen() {
  const { login, loginAsGuest } = useAuth();
  const [tab, setTab] = useState<Tab>("signin");

  // Sign-in fields
  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");
  const [siShowPw, setSiShowPw] = useState(false);

  // Sign-up fields
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suConfirm, setSuConfirm] = useState("");
  const [suUsername, setSuUsername] = useState("");
  const [suShowPw, setSuShowPw] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Animated underline for tab indicator
  const tabAnim = useRef(new Animated.Value(0)).current;

  function switchTab(t: Tab) {
    setTab(t);
    setError("");
    setSuccessMsg("");
    Animated.spring(tabAnim, {
      toValue: t === "signin" ? 0 : 1,
      useNativeDriver: false,
    }).start();
  }

  async function handleSignIn() {
    const email = siEmail.trim().toLowerCase();
    const password = siPassword;
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword(
        { email, password }
      );
      if (authError) {
        setError(authError.message);
        return;
      }
      // AuthContext.onAuthStateChange will load the user automatically
      // after Supabase fires the SIGNED_IN event. Nothing else needed.
    } catch {
      setError("Could not connect. Check your network and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp() {
    const email = suEmail.trim().toLowerCase();
    const password = suPassword;
    const confirm = suConfirm;
    const username = suUsername.trim().toLowerCase();

    if (!email || !password || !confirm || !username) {
      setError("All fields are required.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      setError("Username: 3–20 chars, letters / numbers / underscores only.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      // 1. Create Supabase Auth user
      const { data: authData, error: authError } =
        await supabase.auth.signUp({ email, password });
      if (authError) {
        setError(authError.message);
        return;
      }

      const authId = authData.user?.id;
      if (!authId) {
        setError("Sign-up failed. Please try again.");
        return;
      }

      // 2. Create the public.users row via backend
      try {
        const appUser = await createUser(username, authId);
        login(appUser.username, appUser);
      } catch (e: any) {
        // Username already taken — clean up the auth user and surface the error
        await supabase.auth.signOut();
        setError(
          e?.message?.includes("already")
            ? "That username is already taken. Please pick another."
            : "Account created but profile setup failed. Please try again."
        );
      }
    } catch {
      setError("Could not connect. Check your network and try again.");
    } finally {
      setLoading(false);
    }
  }

  const tabIndicatorLeft = tabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "50%"],
  });

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Brand header ── */}
        <View style={styles.brand}>
          <Logo size={44} />
          <View style={styles.taglineRow}>
            <Ionicons name="sparkles-outline" size={13} color={colors.primaryDark} />
            <Eyebrow style={styles.tagline}>News that lifts you up</Eyebrow>
          </View>
          <Serif style={styles.headline}>Your daily{"\n"}vibe check.</Serif>
          <Sans style={styles.subline}>
            News, balanced for how you want to feel today.
          </Sans>
        </View>

        {/* ── Card ── */}
        <View style={[styles.card, shadows.raised]}>
          {/* Tab bar */}
          <View style={styles.tabBar}>
            <View style={styles.tabTrack}>
              <Animated.View style={[styles.tabIndicator, { left: tabIndicatorLeft }]} />
              <Pressable style={styles.tabBtn} onPress={() => switchTab("signin")}>
                <Sans
                  style={[
                    styles.tabLabel,
                    tab === "signin" && styles.tabLabelActive,
                  ]}
                >
                  Sign in
                </Sans>
              </Pressable>
              <Pressable style={styles.tabBtn} onPress={() => switchTab("signup")}>
                <Sans
                  style={[
                    styles.tabLabel,
                    tab === "signup" && styles.tabLabelActive,
                  ]}
                >
                  Create account
                </Sans>
              </Pressable>
            </View>
          </View>

          {/* ── Sign In form ── */}
          {tab === "signin" && (
            <View style={styles.form}>
              <Field
                label="Email"
                icon="mail-outline"
                placeholder="you@example.com"
                value={siEmail}
                onChangeText={setSiEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Field
                label="Password"
                icon="lock-closed-outline"
                placeholder="••••••••"
                value={siPassword}
                onChangeText={setSiPassword}
                secureTextEntry={!siShowPw}
                autoCapitalize="none"
                trailing={
                  <Pressable onPress={() => setSiShowPw((v) => !v)}>
                    <Ionicons
                      name={siShowPw ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color={colors.textMuted}
                    />
                  </Pressable>
                }
              />

              {error ? <ErrorText>{error}</ErrorText> : null}

              <SubmitButton loading={loading} onPress={handleSignIn}>
                Sign in
              </SubmitButton>
            </View>
          )}

          {/* ── Sign Up form ── */}
          {tab === "signup" && (
            <View style={styles.form}>
              <Field
                label="Username"
                icon="person-outline"
                placeholder="e.g. maya"
                value={suUsername}
                onChangeText={setSuUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Field
                label="Email"
                icon="mail-outline"
                placeholder="you@example.com"
                value={suEmail}
                onChangeText={setSuEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Field
                label="Password"
                icon="lock-closed-outline"
                placeholder="Min. 6 characters"
                value={suPassword}
                onChangeText={setSuPassword}
                secureTextEntry={!suShowPw}
                autoCapitalize="none"
                trailing={
                  <Pressable onPress={() => setSuShowPw((v) => !v)}>
                    <Ionicons
                      name={suShowPw ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color={colors.textMuted}
                    />
                  </Pressable>
                }
              />
              <Field
                label="Confirm password"
                icon="lock-closed-outline"
                placeholder="Re-enter password"
                value={suConfirm}
                onChangeText={setSuConfirm}
                secureTextEntry={!suShowPw}
                autoCapitalize="none"
              />

              {error ? <ErrorText>{error}</ErrorText> : null}
              {successMsg ? (
                <Sans style={styles.success}>{successMsg}</Sans>
              ) : null}

              <SubmitButton loading={loading} onPress={handleSignUp}>
                Create account
              </SubmitButton>

              <Sans style={styles.terms}>
                By creating an account you agree to our Terms of Service and
                Privacy Policy.
              </Sans>
            </View>
          )}
        </View>

        {/* ── Divider ── */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Sans style={styles.dividerText}>or</Sans>
          <View style={styles.dividerLine} />
        </View>

        {/* ── Guest button ── */}
        <Pressable
          style={({ pressed }: any) => [
            styles.guestBtn,
            pressed && styles.guestBtnPressed,
          ]}
          onPress={loginAsGuest}
        >
          <Ionicons
            name="compass-outline"
            size={18}
            color={colors.textBody}
            style={{ marginRight: 8 }}
          />
          <Sans style={styles.guestText}>Browse as guest</Sans>
        </Pressable>

        <Sans style={styles.guestNote}>
          Guest sessions are not saved. Sign up to unlock bookmarks,
          preferences, and your personal feed.
        </Sans>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Small shared sub-components ──────────────────────────────

interface FieldProps {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: React.ComponentProps<typeof TextInput>["keyboardType"];
  autoCapitalize?: React.ComponentProps<typeof TextInput>["autoCapitalize"];
  autoCorrect?: boolean;
  trailing?: React.ReactNode;
}

function Field({
  label,
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoCorrect,
  trailing,
}: FieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <Sans style={styles.fieldLabel}>{label}</Sans>
      <View style={styles.inputRow}>
        <Ionicons
          name={icon}
          size={16}
          color={colors.textMuted}
          style={styles.inputIcon}
        />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? "none"}
          autoCorrect={autoCorrect ?? false}
        />
        {trailing ? <View style={styles.inputTrailing}>{trailing}</View> : null}
      </View>
    </View>
  );
}

function SubmitButton({
  loading,
  onPress,
  children,
}: {
  loading: boolean;
  onPress: () => void;
  children: string;
}) {
  return (
    <Pressable
      style={({ hovered, pressed }: any) => [
        styles.submitBtn,
        (hovered || pressed) && { backgroundColor: colors.primaryDark },
      ]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Sans style={styles.submitText}>{children}</Sans>
      )}
    </Pressable>
  );
}

function ErrorText({ children }: { children: string }) {
  return (
    <View style={styles.errorWrap}>
      <Ionicons name="alert-circle-outline" size={14} color={colors.danger} />
      <Sans style={styles.errorText}>{children}</Sans>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    paddingVertical: 48,
  },

  // Brand header
  brand: {
    width: "100%",
    maxWidth: 460,
    marginBottom: 28,
  },
  taglineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 20,
    marginBottom: 8,
  },
  tagline: { color: colors.primaryDark },
  headline: {
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -1.5,
    marginBottom: 8,
  },
  subline: {
    fontSize: 15,
    color: colors.textBody,
    lineHeight: 22,
  },

  // Card
  card: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },

  // Tab bar
  tabBar: {
    padding: 8,
    backgroundColor: colors.cream,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabTrack: {
    flexDirection: "row",
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    position: "relative",
    height: 44,
  },
  tabIndicator: {
    position: "absolute",
    top: 3,
    bottom: 3,
    width: "50%",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  tabLabel: {
    fontSize: 13.5,
    fontWeight: "600",
    color: colors.textMuted,
  },
  tabLabelActive: {
    color: colors.white,
  },

  // Form
  form: {
    padding: 28,
    gap: 4,
  },
  fieldWrap: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textBody,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.sans,
    height: "100%",
  },
  inputTrailing: {
    marginLeft: 8,
    padding: 4,
  },

  // Error / success
  errorWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    backgroundColor: "#FEF0ED",
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#F8C9C0",
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    flex: 1,
  },
  success: {
    color: colors.primaryDark,
    fontSize: 13,
    marginBottom: 10,
    backgroundColor: colors.primarySoft,
    padding: 10,
    borderRadius: radius.sm,
  },
  terms: {
    fontSize: 11.5,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 17,
  },

  // Submit button
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  submitText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 15.5,
  },

  // Divider
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    maxWidth: 460,
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderStrong,
  },
  dividerText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "500",
  },

  // Guest
  guestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: 460,
    paddingVertical: 14,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  guestBtnPressed: {
    backgroundColor: colors.cream,
  },
  guestText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textBody,
  },
  guestNote: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    maxWidth: 360,
    lineHeight: 18,
    marginTop: 14,
  },
});
