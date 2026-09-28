import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  FlatList,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import {
  MutedKeyword,
  getMutedKeywords,
  addMutedKeyword,
  removeMutedKeyword,
  updateAccountInfo,
  updateTopics,
} from "../api";
import { colors } from "../theme";

const ALL_TOPICS = [
  "Technology",
  "Science",
  "Environment",
  "Health",
  "Business",
  "Politics",
  "Sports",
];

export function ProfileScreen() {
  const { username, user, updateUser, logout } = useAuth();

  // ── Account info ──────────────────────────────────────
  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [location, setLocation] = useState(user?.location || "");
  const [savingAccount, setSavingAccount] = useState(false);

  // ── Topics ────────────────────────────────────────────
  const [selectedTopics, setSelectedTopics] = useState<string[]>(user?.topics || []);
  const [savingTopics, setSavingTopics] = useState(false);

  // ── Muted keywords ────────────────────────────────────
  const [keywords, setKeywords] = useState<MutedKeyword[]>([]);
  const [keywordInput, setKeywordInput] = useState("");

  useEffect(() => {
    if (!username) return;
    getMutedKeywords(username).then(setKeywords).catch(() => {});
  }, [username]);

  async function saveAccountInfo() {
    if (!username) return;
    setSavingAccount(true);
    try {
      const updated = await updateAccountInfo(username, { firstName, lastName, email, location });
      await updateUser(updated);
    } finally {
      setSavingAccount(false);
    }
  }

  function toggleTopic(topic: string) {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  }

  async function saveTopics() {
    if (!username) return;
    setSavingTopics(true);
    try {
      const updated = await updateTopics(username, selectedTopics);
      await updateUser(updated);
    } finally {
      setSavingTopics(false);
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.header}>Profile</Text>
      <Text style={styles.username}>@{username}</Text>

      {/* ── Account info ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        <TextInput style={styles.input} placeholder="First name" value={firstName} onChangeText={setFirstName} />
        <TextInput style={styles.input} placeholder="Last name" value={lastName} onChangeText={setLastName} />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput style={styles.input} placeholder="Location" value={location} onChangeText={setLocation} />
        <TouchableOpacity style={styles.saveButton} onPress={saveAccountInfo} disabled={savingAccount}>
          <Text style={styles.saveButtonText}>{savingAccount ? "Saving..." : "Save account info"}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Topics ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Topics you follow</Text>
        <View style={styles.topicsWrap}>
          {ALL_TOPICS.map((topic) => {
            const active = selectedTopics.includes(topic);
            return (
              <TouchableOpacity
                key={topic}
                style={[styles.topicChip, active && styles.topicChipActive]}
                onPress={() => toggleTopic(topic)}
              >
                <Text style={[styles.topicText, active && styles.topicTextActive]}>{topic}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity style={styles.saveButton} onPress={saveTopics} disabled={savingTopics}>
          <Text style={styles.saveButtonText}>{savingTopics ? "Saving..." : "Save topics"}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Muted keywords ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Muted keywords</Text>
        <Text style={styles.cardSubtitle}>
          Articles containing these words are hidden from your feed.
        </Text>

        <View style={styles.keywordInputRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="e.g. election"
            value={keywordInput}
            onChangeText={setKeywordInput}
            onSubmitEditing={handleAddKeyword}
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAddKeyword}>
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={keywords}
          keyExtractor={(item) => String(item.id)}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.keywordRow}>
              <Text style={styles.keywordText}>{item.keyword}</Text>
              <TouchableOpacity onPress={() => handleRemoveKeyword(item.id)}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.cardSubtitle}>No muted keywords yet.</Text>}
        />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutButtonText}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { fontSize: 24, fontWeight: "800", color: colors.text },
  username: { fontSize: 14, color: colors.textMuted, marginBottom: 16 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: colors.textMuted, marginBottom: 12 },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  saveButtonText: { color: "#fff", fontWeight: "700" },
  topicsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  topicChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  topicChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  topicText: { fontSize: 13, color: colors.text, fontWeight: "600" },
  topicTextActive: { color: "#fff" },
  keywordInputRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  addButton: {
    backgroundColor: colors.text,
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  addButtonText: { color: "#fff", fontWeight: "700" },
  keywordRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  keywordText: { fontSize: 14, color: colors.text },
  removeText: { fontSize: 13, color: colors.danger, fontWeight: "600" },
  logoutButton: {
    alignItems: "center",
    paddingVertical: 14,
    marginBottom: 40,
  },
  logoutButtonText: { color: colors.danger, fontWeight: "700" },
});
