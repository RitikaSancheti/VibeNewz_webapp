// Your library: "Saved" (bookmarks, from the backend) and
// "Liked" (stories you hearted, saved on this device).
import { useCallback, useEffect, useState } from "react";
import { View, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useBookmarks } from "../context/BookmarksContext";
import { useWellbeing } from "../context/WellbeingContext";
import { PageShell, PageHeader, OutlinePill } from "../components/PageShell";
import { ArticleCard } from "../components/ArticleCard";
import { Sans, Serif } from "../components/Typography";
import { colors, radius, shadows } from "../theme";

type Tab = "saved" | "liked";

export function BookmarksScreen({ navigation, route }: any) {
  const { bookmarks, loading, refresh } = useBookmarks();
  const { likes } = useWellbeing();
  const [tab, setTab] = useState<Tab>(
    route?.params?.tab === "liked" ? "liked" : "saved",
  );
  const [gridWidth, setGridWidth] = useState(0);

  // Opening "Liked stories" from the profile menu switches to that tab
  useEffect(() => {
    if (route?.params?.tab === "liked" || route?.params?.tab === "saved")
      setTab(route.params.tab);
  }, [route?.params?.tab]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  function switchTab(next: Tab) {
    setTab(next);
    navigation.setParams({ tab: next });
  }

  const list = tab === "saved" ? bookmarks : likes;
  const columns = gridWidth > 1000 ? 3 : gridWidth > 600 ? 2 : 1;
  const gap = 20;
  const cardWidth = gridWidth
    ? Math.min(462, (gridWidth - gap * (columns - 1)) / columns)
    : undefined;

  return (
    <PageShell>
      <PageHeader
        icon="bookmark"
        eyebrow="Your library"
        title="Bookmarks"
        subtitle="A quiet place for stories you want to return to."
        right={
          <OutlinePill
            label={`${bookmarks.length} saved · ${likes.length} liked`}
          />
        }
      />

      <View style={styles.tabs} accessibilityRole="tablist">
        <TabButton
          label="Saved"
          icon="bookmark"
          count={bookmarks.length}
          active={tab === "saved"}
          onPress={() => switchTab("saved")}
        />
        <TabButton
          label="Liked"
          icon="heart"
          count={likes.length}
          active={tab === "liked"}
          onPress={() => switchTab("liked")}
        />
      </View>

      <View
        style={styles.grid}
        onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}
      >
        {tab === "saved" && loading && bookmarks.length === 0 ? (
          <ActivityIndicator color={colors.primary} />
        ) : list.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Feather
                name={tab === "saved" ? "bookmark" : "heart"}
                size={22}
                color={colors.primaryDark}
              />
            </View>
            <Serif style={{ fontSize: 26, marginBottom: 6 }}>
              {tab === "saved" ? "Nothing saved yet" : "No liked stories yet"}
            </Serif>
            <Sans
              style={{
                color: colors.textMuted,
                textAlign: "center",
                marginBottom: 18,
              }}
            >
              {tab === "saved"
                ? "Tap the bookmark on any story to keep it here."
                : "Tap the heart on any story you enjoyed and it will appear here."}
            </Sans>
            <Pressable
              style={styles.emptyBtn}
              onPress={() => navigation.navigate("Home")}
            >
              <Sans style={{ color: colors.white, fontWeight: "700" }}>
                Browse today’s stories
              </Sans>
            </Pressable>
          </View>
        ) : (
          list.map((item) => (
            <ArticleCard
              key={item.id}
              article={item}
              width={cardWidth}
              onPress={() =>
                navigation.navigate("ArticleDetail", { id: item.id })
              }
            />
          ))
        )}
      </View>
    </PageShell>
  );
}

function TabButton({
  label,
  icon,
  count,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={({ hovered }: any) => [
        styles.tab,
        hovered && !active && { backgroundColor: "rgba(255,232,161,0.5)" },
        active && [styles.tabActive, shadows.pill],
      ]}
    >
      <Feather
        name={icon}
        size={15}
        color={active ? colors.primaryDark : colors.textBody}
      />
      <Sans style={[styles.tabText, active && { color: colors.primaryDark }]}>
        {label}
      </Sans>
      <View
        style={[styles.count, active && { backgroundColor: colors.butter }]}
      >
        <Sans style={styles.countText}>{count}</Sans>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    alignSelf: "flex-start",
    gap: 4,
    padding: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,232,161,0.35)",
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: -12,
    marginBottom: 28,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  tabActive: { backgroundColor: colors.surface },
  tabText: { fontSize: 14, fontWeight: "600", color: colors.textBody },
  count: {
    minWidth: 22,
    paddingHorizontal: 6,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: { fontSize: 11.5, fontWeight: "700", color: colors.text },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 20 },
  empty: {
    width: "100%",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 56,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.butter,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyBtn: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
});
