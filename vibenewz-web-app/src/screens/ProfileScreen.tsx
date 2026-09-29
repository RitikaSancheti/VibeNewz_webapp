import { useEffect, useState, ReactNode, ComponentProps } from "react";
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import {
  MutedKeyword,
  getMutedKeywords,
  addMutedKeyword,
  removeMutedKeyword,
  updateAccountInfo,
  updateTopics,
} from "../api";
import { PageShell, PageHeader } from "../components/PageShell";
import { Sans, Serif, Eyebrow } from "../components/Typography";
import { colors, fonts, radius, shadows } from "../theme";

// Topics marked ☀ tend to bring more uplifting stories
const ALL_TOPICS = [
  "Science",
  "Environment",
  "Health",
  "Technology",
  "Lifestyle",
  "Education",
  "Entertainment",
  "Food",
  "Tourism",
  "Business",
  "Sports",
  "Politics",
];
const UPLIFTING_TOPICS = [
  "Science",
  "Environment",
  "Health",
  "Lifestyle",
  "Education",
  "Food",
  "Tourism",
];

function Card({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <View style={[styles.card, shadows.card]}>
      <Eyebrow style={{ marginBottom: 10 }}>{eyebrow}</Eyebrow>
      <Serif style={styles.cardTitle}>{title}</Serif>
      {subtitle ? <Sans style={styles.cardSubtitle}>{subtitle}</Sans> : null}
      <View style={{ marginTop: 18 }}>{children}</View>
    </View>
  );
}

function Field(props: ComponentProps<typeof TextInput> & { label: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={{ flex: 1, minWidth: 200 }}>
      <Sans style={styles.label}>{label}</Sans>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, style]}
        {...rest}
      />
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ hovered }: any) => [
        styles.primaryBtn,
        hovered && { backgroundColor: colors.primaryDark },
        disabled && { opacity: 0.6 },
      ]}
    >
      <Sans style={styles.primaryBtnText}>{label}</Sans>
    </Pressable>
  );
}

export function ProfileScreen() {
  const { username, user, updateUser, logout } = useAuth();
  const { width } = useWindowDimensions();

  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [location, setLocation] = useState(user?.location || "");
  const [accountStatus, setAccountStatus] = useState<
    "" | "saving" | "saved" | "error"
  >("");

  const [selectedTopics, setSelectedTopics] = useState<string[]>(
    user?.topics || [],
  );
  const [topicStatus, setTopicStatus] = useState<
    "" | "saving" | "saved" | "error"
  >("");

  const [keywords, setKeywords] = useState<MutedKeyword[]>([]);
  const [keywordInput, setKeywordInput] = useState("");

  useEffect(() => {
    if (!username) return;
    getMutedKeywords(username)
      .then(setKeywords)
      .catch(() => {});
  }, [username]);

  async function saveAccountInfo() {
    if (!username) return;
    setAccountStatus("saving");
    try {
      const updated = await updateAccountInfo(username, {
        firstName,
        lastName,
        email,
        location,
      });
      await updateUser(updated);
      setAccountStatus("saved");
    } catch {
      setAccountStatus("error");
    }
  }

  // NewsData.io's free plan accepts at most 5 topics per search
  function toggleTopic(topic: string) {
    setTopicStatus("");
    setSelectedTopics((prev) =>
      prev.includes(topic)
        ? prev.filter((t) => t !== topic)
        : prev.length >= 5
          ? prev
          : [...prev, topic],
    );
  }

  async function saveTopics() {
    if (!username) return;
    setTopicStatus("saving");
    try {
      const updated = await updateTopics(username, selectedTopics);
      await updateUser(updated);
      setTopicStatus("saved");
    } catch {
      setTopicStatus("error");
    }
  }

  async function handleAddKeyword() {
    if (!username || !keywordInput.trim()) return;
    try {
      const added = await addMutedKeyword(username, keywordInput.trim());
      setKeywords((prev) => [...prev, added]);
      setKeywordInput("");
    } catch {
      // already muted — nothing to do
    }
  }

  async function handleRemoveKeyword(id: number) {
    if (!username) return;
    await removeMutedKeyword(username, id);
    setKeywords((prev) => prev.filter((k) => k.id !== id));
  }

  const statusText = (s: string) =>
    s === "saved"
      ? "Saved ✓"
      : s === "error"
        ? "Couldn't save. Is the backend running?"
        : "";

  const twoCol = width >= 1000;

  return (
    <PageShell>
      <PageHeader
        icon="settings"
        eyebrow="Preferences"
        title="Vibe, topics and boundaries"
        subtitle={`Signed in as @${username}. Tune what reaches you, and what doesn’t.`}
      />

      <View style={[styles.row, !twoCol && { flexDirection: "column" }]}>
        <View style={{ flex: 1, gap: 20 }}>
          <Card
            eyebrow="Account"
            title="About you"
            subtitle="Your first name is used in your daily greeting."
          >
            <View style={styles.fieldRow}>
              <Field
                label="First name"
                placeholder="Maya"
                value={firstName}
                onChangeText={setFirstName}
              />
              <Field
                label="Last name"
                placeholder="Santos"
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
            <View style={styles.fieldRow}>
              <Field
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Field
                label="Location"
                placeholder="Toronto"
                value={location}
                onChangeText={setLocation}
              />
            </View>
            <View style={styles.actionRow}>
              <PrimaryButton
                label={
                  accountStatus === "saving" ? "Saving…" : "Save account info"
                }
                onPress={saveAccountInfo}
                disabled={accountStatus === "saving"}
              />
              <Sans
                style={[
                  styles.status,
                  accountStatus === "error" && { color: colors.danger },
                ]}
              >
                {statusText(accountStatus)}
              </Sans>
            </View>
          </Card>

          <Card
            eyebrow="Topics"
            title="Topics you follow"
            subtitle="Pick up to 5. Topics marked ☀ usually bring more uplifting stories. Leave all unselected for our uplifting mix."
          >
            <View style={styles.topicsWrap}>
              {ALL_TOPICS.map((topic) => {
                const active = selectedTopics.includes(topic);
                return (
                  <Pressable
                    key={topic}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => toggleTopic(topic)}
                  >
                    {active ? (
                      <Feather name="check" size={14} color={colors.white} />
                    ) : null}
                    <Sans
                      style={[
                        styles.chipText,
                        active && { color: colors.white },
                      ]}
                    >
                      {UPLIFTING_TOPICS.includes(topic) ? "☀ " : ""}
                      {topic}
                    </Sans>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.actionRow}>
              <PrimaryButton
                label={topicStatus === "saving" ? "Saving…" : "Save topics"}
                onPress={saveTopics}
                disabled={topicStatus === "saving"}
              />
              <Sans
                style={[
                  styles.status,
                  topicStatus === "error" && { color: colors.danger },
                ]}
              >
                {statusText(topicStatus)}
              </Sans>
            </View>
          </Card>
        </View>

        <View style={{ flex: twoCol ? 0.8 : 1, gap: 20 }}>
          <Card
            eyebrow="Boundaries"
            title="Muted keywords"
            subtitle="Stories containing these words are hidden from your feed."
          >
            <View style={styles.keywordInputRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="e.g. election"
                placeholderTextColor={colors.textMuted}
                value={keywordInput}
                onChangeText={setKeywordInput}
                onSubmitEditing={handleAddKeyword}
              />
              <Pressable style={styles.addButton} onPress={handleAddKeyword}>
                <Feather name="plus" size={16} color={colors.white} />
                <Sans style={{ color: colors.white, fontWeight: "700" }}>
                  Add
                </Sans>
              </Pressable>
            </View>

            {keywords.length === 0 ? (
              <Sans style={styles.cardSubtitle}>No muted keywords yet.</Sans>
            ) : (
              <View style={styles.topicsWrap}>
                {keywords.map((k) => (
                  <View key={k.id} style={styles.keywordChip}>
                    <Sans style={styles.keywordText}>{k.keyword}</Sans>
                    <Pressable
                      onPress={() => handleRemoveKeyword(k.id)}
                      accessibilityLabel={`Unmute ${k.keyword}`}
                    >
                      <Feather name="x" size={14} color="#9A5A1C" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </Card>

          <View style={[styles.card, shadows.card, styles.logoutCard]}>
            <View style={{ flex: 1 }}>
              <Serif style={{ fontSize: 22 }}>Taking a break?</Serif>
              <Sans style={styles.cardSubtitle}>
                You can sign back in with the same username any time.
              </Sans>
            </View>
            <Pressable style={styles.logoutButton} onPress={logout}>
              <Feather name="log-out" size={16} color={colors.danger} />
              <Sans style={{ color: colors.danger, fontWeight: "700" }}>
                Log out
              </Sans>
            </Pressable>
          </View>
        </View>
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 20, alignItems: "flex-start" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 28,
  },
  cardTitle: { fontSize: 26, lineHeight: 30 },
  cardSubtitle: { fontSize: 13.5, color: colors.textMuted, marginTop: 6 },
  fieldRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 14,
  },
  label: {
    fontSize: 12.5,
    fontWeight: "600",
    color: colors.textBody,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14.5,
    color: colors.text,
    fontFamily: fonts.sans,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 6,
  },
  status: { fontSize: 13, color: colors.primaryDark, fontWeight: "600" },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 13,
  },
  primaryBtnText: { color: colors.white, fontWeight: "700", fontSize: 14 },
  topicsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cream,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13.5, color: colors.text, fontWeight: "600" },
  keywordInputRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.text,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  keywordChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.peachSoft,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  keywordText: { fontSize: 13.5, color: "#7A4718", fontWeight: "600" },
  logoutCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#F0C9B8",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
});
