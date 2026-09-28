import { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { NewsArticle, getBookmarks } from "../api";
import { ArticleCard } from "../components/ArticleCard";
import { colors } from "../theme";

export function BookmarksScreen({ navigation }: any) {
  const { username } = useAuth();
  const [bookmarks, setBookmarks] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  // useFocusEffect re-loads bookmarks every time this tab is opened,
  // so removing a bookmark on the detail screen shows up here right away.
  useFocusEffect(
    useCallback(() => {
      if (!username) return;
      setLoading(true);
      getBookmarks(username)
        .then(setBookmarks)
        .finally(() => setLoading(false));
    }, [username])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Bookmarks</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={bookmarks}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No bookmarks yet. Tap the ☆ on an article to save it here.
            </Text>
          }
          renderItem={({ item }) => (
            <ArticleCard
              article={item}
              onPress={() => navigation.navigate("ArticleDetail", { id: item.id })}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 16,
  },
  empty: {
    textAlign: "center",
    color: colors.textMuted,
    marginTop: 40,
  },
});
