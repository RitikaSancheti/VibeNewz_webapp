// ============================================================
// GlobalMapScreen.tsx — explore positive stories on a 3D globe.
// Every country with a positive story gets a glowing pin.
// Click a pin (or a region chip) to see its stories on the right.
// ============================================================

import { useEffect, useMemo, useState } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { NewsArticle, getUserFeedBySentiment } from "../api";
import { PageShell, PageHeader, OutlinePill } from "../components/PageShell";
import { Globe, GlobePin } from "../components/Globe";
import { StoryImage } from "../components/StoryImage";
import { SentimentBadge } from "../components/SentimentBadge";
import { Sans, Serif } from "../components/Typography";
import { colors, radius, shadows } from "../theme";
import { titleCase } from "../utils/news";
import {
  REGIONS,
  Region,
  REGION_CENTERS,
  countryInfo,
} from "../utils/countries";

export function GlobalMapScreen({ navigation }: any) {
  const { username } = useAuth();
  const { width } = useWindowDimensions();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [region, setRegion] = useState<Region>("Asia Pacific");
  const [index, setIndex] = useState(0);
  const [focus, setFocus] = useState<{
    lat: number;
    lng: number;
    id: number;
  } | null>(null);

  useEffect(() => {
    if (!username) return;
    getUserFeedBySentiment(username, "POSITIVE")
      .then(setArticles)
      .catch(() =>
        setError("Couldn't load stories. Check that the backend is running."),
      )
      .finally(() => setLoading(false));
  }, [username]);

  // Group stories by region (only stories whose country we can place)
  const byRegion = useMemo(() => {
    const groups: Record<Region, NewsArticle[]> = {
      "Asia Pacific": [],
      Africa: [],
      Europe: [],
      Americas: [],
    };
    articles.forEach((a) => {
      const info = countryInfo(a.country);
      if (info) groups[info.region].push(a);
    });
    return groups;
  }, [articles]);

  // One pin per country
  const pins = useMemo<GlobePin[]>(() => {
    const map = new Map<string, GlobePin>();
    articles.forEach((a) => {
      const info = countryInfo(a.country);
      if (!info || !a.country) return;
      const key = a.country.toLowerCase().trim();
      const existing = map.get(key);
      if (existing) existing.count++;
      else
        map.set(key, {
          key,
          label: titleCase(a.country),
          lat: info.lat,
          lng: info.lng,
          count: 1,
        });
    });
    return [...map.values()];
  }, [articles]);

  const stories = byRegion[region];
  const story = stories[index];
  const selectedKey = story?.country
    ? story.country.toLowerCase().trim()
    : null;

  function turnTo(lat: number, lng: number) {
    setFocus({ lat, lng, id: Date.now() });
  }

  // Once stories load, start on the first region that has some
  useEffect(() => {
    if (loading) return;
    const start = byRegion[region].length
      ? region
      : REGIONS.find((r) => byRegion[r].length) || region;
    setRegion(start);
    const first = byRegion[start][0];
    const info = countryInfo(first?.country);
    if (info) turnTo(info.lat, info.lng);
    else turnTo(REGION_CENTERS[start].lat, REGION_CENTERS[start].lng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  function selectRegion(r: Region) {
    setRegion(r);
    setIndex(0);
    const info = countryInfo(byRegion[r][0]?.country);
    if (info) turnTo(info.lat, info.lng);
    else turnTo(REGION_CENTERS[r].lat, REGION_CENTERS[r].lng);
  }

  function selectPin(key: string) {
    const info = countryInfo(key);
    if (!info) return;
    const list = byRegion[info.region];
    const i = list.findIndex(
      (a) => (a.country || "").toLowerCase().trim() === key,
    );
    setRegion(info.region);
    setIndex(Math.max(0, i));
    turnTo(info.lat, info.lng);
  }

  function step(delta: number) {
    const next = (index + delta + stories.length) % stories.length;
    setIndex(next);
    const info = countryInfo(stories[next]?.country);
    if (info) turnTo(info.lat, info.lng);
  }

  const stacked = width < 1050;
  const globeSize = Math.max(
    260,
    Math.min(500, width - (width < 700 ? 70 : 200)),
  );

  return (
    <PageShell>
      <PageHeader
        icon="globe"
        eyebrow="Global view"
        title="Explore positive stories around the world"
        subtitle="Spin the globe and tap a glowing pin to discover progress without the noise. Every story is presented in English."
        right={<OutlinePill label="EN · English" />}
      />

      <View
        style={[
          styles.card,
          shadows.card,
          stacked && styles.cardStacked,
          width < 700 && { padding: 16 },
        ]}
      >
        <View style={styles.arcs} pointerEvents="none">
          <svg width="260" height="260" viewBox="0 0 260 260">
            <circle
              cx="260"
              cy="0"
              r="200"
              fill="none"
              stroke={colors.borderStrong}
              strokeOpacity="0.6"
            />
            <circle
              cx="260"
              cy="0"
              r="250"
              fill="none"
              stroke={colors.borderStrong}
              strokeOpacity="0.35"
            />
          </svg>
        </View>

        <View style={styles.globeArea}>
          <Globe
            size={globeSize}
            pins={pins}
            selectedKey={selectedKey}
            focus={focus}
            onSelectPin={selectPin}
          />
          <View style={styles.hintRow}>
            <View style={styles.hintDot} />
            <Sans style={styles.hint}>Drag to spin · tap a glowing pin</Sans>
          </View>
          <View style={styles.regionChips}>
            {REGIONS.map((r) => {
              const active = r === region;
              return (
                <Pressable
                  key={r}
                  onPress={() => selectRegion(r)}
                  style={[styles.regionChip, active && styles.regionChipActive]}
                >
                  <Sans
                    style={[
                      styles.regionChipText,
                      active && { color: colors.white },
                    ]}
                  >
                    {r}
                    <Sans
                      style={[
                        styles.regionCount,
                        active && { color: "rgba(255,255,255,0.85)" },
                      ]}
                    >
                      {" "}
                      {byRegion[r].length}
                    </Sans>
                  </Sans>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View
          style={[styles.storyCol, stacked && { width: "100%", maxWidth: 520 }]}
        >
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : error ? (
            <Sans style={{ color: colors.danger }}>{error}</Sans>
          ) : story ? (
            <View style={[styles.storyCard, shadows.raised]}>
              <StoryImage
                uri={story.image_url}
                seed={story.category || story.title}
                style={styles.storyImage}
              >
                <View style={styles.countryPill}>
                  <Feather name="globe" size={13} color={colors.text} />
                  <Sans style={styles.countryText}>
                    {titleCase(story.country)}
                  </Sans>
                </View>
              </StoryImage>
              <View style={styles.storyBody}>
                <View style={styles.metaRow}>
                  <SentimentBadge sentiment={story.sentiment} />
                  <Sans style={styles.meta}>{region} · In English</Sans>
                </View>
                <Serif style={styles.storyTitle} numberOfLines={4}>
                  {story.title}
                </Serif>
                <Sans style={styles.storyDesc} numberOfLines={3}>
                  {story.description}
                </Sans>
                <View style={styles.storyActions}>
                  <Pressable
                    onPress={() =>
                      navigation.navigate("ArticleDetail", { id: story.id })
                    }
                    style={({ hovered }: any) => [
                      styles.exploreBtn,
                      hovered && { backgroundColor: colors.primaryDark },
                    ]}
                  >
                    <Sans style={styles.exploreText}>Explore this story</Sans>
                    <Feather
                      name="chevron-right"
                      size={15}
                      color={colors.white}
                    />
                  </Pressable>
                  {stories.length > 1 ? (
                    <View style={styles.pager}>
                      <Pressable
                        onPress={() => step(-1)}
                        style={styles.pagerBtn}
                        accessibilityLabel="Previous story"
                      >
                        <Feather
                          name="chevron-left"
                          size={16}
                          color={colors.text}
                        />
                      </Pressable>
                      <Sans style={styles.pagerText}>
                        {index + 1} / {stories.length}
                      </Sans>
                      <Pressable
                        onPress={() => step(1)}
                        style={styles.pagerBtn}
                        accessibilityLabel="Next story"
                      >
                        <Feather
                          name="chevron-right"
                          size={16}
                          color={colors.text}
                        />
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          ) : (
            <View style={[styles.storyCard, styles.emptyCard]}>
              <Serif style={{ fontSize: 24, marginBottom: 8 }}>
                Nothing from {region} yet
              </Serif>
              <Sans style={styles.storyDesc}>
                New positive stories appear here as they’re fetched. Try another
                region, or tap Refresh on Home to pull the latest news.
              </Sans>
            </View>
          )}
        </View>
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 48,
    paddingHorizontal: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 40,
    overflow: "hidden",
  },
  cardStacked: { flexDirection: "column" },
  arcs: { position: "absolute", top: 0, right: 0 },
  globeArea: { flex: 1, alignItems: "center" },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  hintDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.sunshine,
  },
  hint: { fontSize: 13, color: colors.textMuted },
  regionChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
  },
  regionChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cream,
  },
  regionChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  regionChipText: { fontSize: 13, fontWeight: "600", color: colors.text },
  regionCount: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  storyCol: { width: 396 },
  storyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  emptyCard: { padding: 28 },
  storyImage: { height: 182, width: "100%" },
  countryPill: {
    position: "absolute",
    left: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  countryText: { fontSize: 12.5, fontWeight: "600", color: colors.text },
  storyBody: { padding: 20 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  meta: { fontSize: 12, color: colors.textMuted },
  storyTitle: { fontSize: 26, lineHeight: 28, marginBottom: 14 },
  storyDesc: { fontSize: 13.5, lineHeight: 20, color: colors.textBody },
  storyActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    flexWrap: "wrap",
    gap: 12,
  },
  exploreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  exploreText: { fontSize: 13.5, fontWeight: "700", color: colors.white },
  pager: { flexDirection: "row", alignItems: "center", gap: 6 },
  pagerBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  pagerText: { fontSize: 12.5, color: colors.textMuted },
});
