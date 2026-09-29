import { useCallback, useState } from "react";
import { View, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useBookmarks } from "../context/BookmarksContext";
import { PageShell, PageHeader, OutlinePill } from "../components/PageShell";
import { ArticleCard } from "../components/ArticleCard";
import { Sans, Serif } from "../components/Typography";
import { colors, radius } from "../theme";

export function BookmarksScreen({ navigation }: any) {
  const { bookmarks, loading, refresh } = useBookmarks();
  const [gridWidth, setGridWidth] = useState(0);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

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
        right={<OutlinePill label={`${bookmarks.length} saved`} />}
      />

      <View
        style={styles.grid}
        onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}
      >
        {loading && bookmarks.length === 0 ? (
          <ActivityIndicator color={colors.primary} />
        ) : bookmarks.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Feather name="bookmark" size={22} color={colors.primaryDark} />
            </View>
            <Serif style={{ fontSize: 26, marginBottom: 6 }}>
              Nothing saved yet
            </Serif>
            <Sans
              style={{
                color: colors.textMuted,
                textAlign: "center",
                marginBottom: 18,
              }}
            >
              Tap the bookmark on any story to keep it here.
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
          bookmarks.map((item) => (
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

const styles = StyleSheet.create({
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
