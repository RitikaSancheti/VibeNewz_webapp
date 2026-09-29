import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Pressable,
  TextInput,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { colors, fonts, shadows, NAV_HEIGHT } from "../theme";
import { Sans, Serif } from "./Typography";
import { SentimentBadge } from "./SentimentBadge";
import { useAuth } from "../context/AuthContext";
import { NewsArticle, getUserFeed } from "../api";
import { initialsFor } from "../utils/news";

export const NAV_ITEMS: {
  route: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}[] = [
  { route: "Home", label: "Home", icon: "home" },
  { route: "GlobalMap", label: "Global map", icon: "globe" },
  { route: "Bookmarks", label: "Bookmarks", icon: "bookmark" },
  { route: "Wellbeing", label: "My wellbeing", icon: "trending-up" },
];

export function Logo({
  size = 30,
  showText = true,
}: {
  size?: number;
  showText?: boolean;
}) {
  return (
    <View style={styles.logoRow}>
      <View
        style={[
          styles.logoMark,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        <Ionicons name="sparkles" size={size * 0.5} color={colors.text} />
      </View>
      {showText ? <Serif style={styles.logoText}>VibeNewz</Serif> : null}
    </View>
  );
}

export function TopNav() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { width } = useWindowDimensions();
  const { username, user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const compact = width < 980;
  const tiny = width < 560;

  const initials = initialsFor(user?.first_name, user?.last_name, username);
  const fullName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    `@${username}`;

  function go(name: string) {
    setMenuOpen(false);
    setSearchOpen(false);
    navigation.navigate(name);
  }

  return (
    <View style={styles.bar}>
      <View style={[styles.inner, tiny && { paddingHorizontal: 16 }]}>
        <Pressable
          onPress={() => go("Home")}
          accessibilityLabel="VibeNewz home"
        >
          <Logo showText={!tiny} />
        </Pressable>

        <View style={[styles.links, compact && { gap: 2 }]}>
          {NAV_ITEMS.map((item) => {
            const active = route.name === item.route;
            return (
              <Pressable
                key={item.route}
                onPress={() => go(item.route)}
                accessibilityLabel={item.label}
                style={({ hovered }: any) => [
                  styles.link,
                  compact && { paddingHorizontal: 12 },
                  hovered &&
                    !active && { backgroundColor: "rgba(255,232,161,0.45)" },
                  active && [styles.linkActive, shadows.pill],
                ]}
              >
                <Feather
                  name={item.icon}
                  size={16}
                  color={active ? colors.primaryDark : colors.textBody}
                />
                {!compact ? (
                  <Sans
                    style={[
                      styles.linkText,
                      active && { color: colors.primaryDark },
                    ]}
                  >
                    {item.label}
                  </Sans>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.right}>
          <Pressable
            style={styles.iconBtn}
            onPress={() => {
              setMenuOpen(false);
              setSearchOpen((o) => !o);
            }}
            accessibilityLabel="Search stories"
          >
            <Feather name="search" size={19} color={colors.text} />
          </Pressable>
          <Pressable
            style={styles.avatar}
            onPress={() => {
              setSearchOpen(false);
              setMenuOpen((o) => !o);
            }}
            accessibilityLabel="Open profile menu"
          >
            <Sans style={styles.avatarText}>{initials}</Sans>
          </Pressable>
        </View>
      </View>

      {menuOpen || searchOpen ? (
        <Pressable
          style={styles.backdrop}
          onPress={() => {
            setMenuOpen(false);
            setSearchOpen(false);
          }}
        />
      ) : null}

      {menuOpen ? (
        <View style={[styles.dropdown, shadows.raised]}>
          <View style={styles.menuHeader}>
            <View
              style={[
                styles.avatar,
                { width: 42, height: 42, borderRadius: 21 },
              ]}
            >
              <Sans style={styles.avatarText}>{initials}</Sans>
            </View>
            <View style={{ flex: 1 }}>
              <Sans style={styles.menuName} numberOfLines={1}>
                {fullName}
              </Sans>
              <Sans style={styles.menuEmail} numberOfLines={1}>
                {user?.email || "Add your email in Preferences"}
              </Sans>
            </View>
          </View>
          <View style={styles.divider} />
          <Pressable
            style={({ hovered }: any) => [
              styles.menuRow,
              hovered && styles.menuRowHover,
            ]}
            onPress={() => go("Profile")}
          >
            <Feather name="settings" size={17} color={colors.text} />
            <View style={{ flex: 1 }}>
              <Sans style={styles.menuRowTitle}>Preferences</Sans>
              <Sans style={styles.menuRowSub}>Vibe, topics and boundaries</Sans>
            </View>
            <Feather name="chevron-right" size={17} color={colors.text} />
          </Pressable>
          <Pressable
            style={({ hovered }: any) => [
              styles.menuRow,
              hovered && styles.menuRowHover,
            ]}
            onPress={() => {
              setMenuOpen(false);
              logout();
            }}
          >
            <Feather name="log-out" size={17} color={colors.danger} />
            <Sans
              style={[styles.menuRowTitle, { color: colors.danger, flex: 1 }]}
            >
              Log out
            </Sans>
          </Pressable>
        </View>
      ) : null}

      {searchOpen ? (
        <SearchPanel
          onOpen={(id) => {
            setSearchOpen(false);
            navigation.navigate("ArticleDetail", { id });
          }}
        />
      ) : null}
    </View>
  );
}

// Search dropdown: searches the user's feed by title / description
function SearchPanel({ onOpen }: { onOpen: (id: number) => void }) {
  const { username } = useAuth();
  const [query, setQuery] = useState("");
  const [articles, setArticles] = useState<NewsArticle[] | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (username)
      getUserFeed(username)
        .then(setArticles)
        .catch(() => setArticles([]));
  }, [username]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !articles) return [];
    return articles
      .filter((a) =>
        `${a.title} ${a.description} ${a.category} ${a.country || ""}`
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 6);
  }, [query, articles]);

  return (
    <View style={[styles.dropdown, styles.searchPanel, shadows.raised]}>
      <View style={styles.searchRow}>
        <Feather name="search" size={17} color={colors.textMuted} />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          placeholder="Search stories, topics or places"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />
      </View>
      {articles === null ? (
        <ActivityIndicator
          color={colors.primary}
          style={{ marginVertical: 16 }}
        />
      ) : query.trim() && results.length === 0 ? (
        <Sans style={styles.searchEmpty}>
          No stories match “{query.trim()}”.
        </Sans>
      ) : (
        results.map((a) => (
          <Pressable
            key={a.id}
            onPress={() => onOpen(a.id)}
            style={({ hovered }: any) => [
              styles.searchResult,
              hovered && styles.menuRowHover,
            ]}
          >
            <SentimentBadge sentiment={a.sentiment} size="sm" />
            <Sans style={styles.searchTitle} numberOfLines={2}>
              {a.title}
            </Sans>
          </Pressable>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: NAV_HEIGHT,
    zIndex: 100,
    backgroundColor: "rgba(255, 247, 225, 0.86)",
    backdropFilter: "blur(14px)",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  } as any,
  inner: {
    height: "100%",
    width: "100%",
    maxWidth: 1540,
    alignSelf: "center",
    paddingHorizontal: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoMark: {
    backgroundColor: colors.sunshine,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { fontSize: 29, fontWeight: "600", letterSpacing: -0.5 },
  links: { flexDirection: "row", alignItems: "center", gap: 6 },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 999,
  },
  linkActive: { backgroundColor: colors.surface },
  linkText: { fontSize: 15, fontWeight: "500", color: colors.textBody },
  right: { flexDirection: "row", alignItems: "center", gap: 18 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.sunshine,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 12.5, fontWeight: "700", color: colors.text },
  backdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  } as any,
  dropdown: {
    position: "absolute",
    top: NAV_HEIGHT - 6,
    right: 24,
    width: 316,
    zIndex: 2,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
  },
  menuName: { fontSize: 15, fontWeight: "600", color: colors.text },
  menuEmail: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 6 },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 12,
    borderRadius: 12,
  },
  menuRowHover: { backgroundColor: colors.cream },
  menuRowTitle: { fontSize: 14, fontWeight: "600", color: colors.text },
  menuRowSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  searchPanel: { width: 420, maxWidth: "92%" as any, right: 80 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.cream,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.sans,
    outlineStyle: "none",
  } as any,
  searchEmpty: { padding: 14, fontSize: 14, color: colors.textMuted },
  searchResult: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
  },
  searchTitle: { flex: 1, fontSize: 14, color: colors.text },
});
