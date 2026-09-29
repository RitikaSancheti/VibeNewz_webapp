// ============================================================
// news.ts — small helper functions shared by several screens.
// ============================================================

import { NewsArticle } from "../api";

// Builds a feed where roughly `upliftingShare` (0–1) of the stories are
// POSITIVE and the rest NEUTRAL / NEGATIVE, newest first in each group.
export function mixByVibe(
  articles: NewsArticle[],
  upliftingShare: number,
): NewsArticle[] {
  const share = Math.min(1, Math.max(0, upliftingShare));
  const byDate = (a: NewsArticle, b: NewsArticle) =>
    new Date(b.published_at || 0).getTime() -
    new Date(a.published_at || 0).getTime();

  const positive = articles
    .filter((a) => a.sentiment === "POSITIVE")
    .sort(byDate);
  const neutral = articles
    .filter((a) => a.sentiment === "NEUTRAL")
    .sort(byDate);
  const negative = articles
    .filter((a) => a.sentiment === "NEGATIVE")
    .sort(byDate);
  const others = [...neutral, ...negative];

  const maxByPositive = share > 0 ? positive.length / share : Infinity;
  const maxByOthers = share < 1 ? others.length / (1 - share) : Infinity;
  let total = Math.floor(Math.min(articles.length, maxByPositive, maxByOthers));
  // Never leave the page nearly empty just to keep a perfect ratio.
  total = Math.max(total, Math.min(articles.length, 6));

  const result: NewsArticle[] = [];
  let p = 0;
  let o = 0;
  for (let i = 0; i < total; i++) {
    const wantPositive = p < share * (i + 1);
    if ((wantPositive && p < positive.length) || o >= others.length) {
      if (p < positive.length) result.push(positive[p++]);
    } else {
      result.push(others[o++]);
    }
  }
  return result;
}

export function readMinutes(article: NewsArticle): number {
  const text = `${article.title || ""} ${article.content || article.description || ""}`;
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

// ---- Regions for the Global map ----
export type Region = "Asia Pacific" | "Africa" | "Europe" | "Americas";
export const REGIONS: Region[] = [
  "Asia Pacific",
  "Africa",
  "Europe",
  "Americas",
];

const REGION_COUNTRIES: Record<Region, string[]> = {
  "Asia Pacific": [
    "australia",
    "bangladesh",
    "cambodia",
    "china",
    "fiji",
    "hong kong",
    "india",
    "indonesia",
    "japan",
    "south korea",
    "korea",
    "laos",
    "malaysia",
    "maldives",
    "mongolia",
    "myanmar",
    "nepal",
    "new zealand",
    "pakistan",
    "papua new guinea",
    "philippines",
    "singapore",
    "sri lanka",
    "taiwan",
    "thailand",
    "vietnam",
    "afghanistan",
    "kazakhstan",
    "uzbekistan",
  ],
  Africa: [
    "algeria",
    "angola",
    "botswana",
    "cameroon",
    "egypt",
    "ethiopia",
    "ghana",
    "ivory coast",
    "kenya",
    "madagascar",
    "malawi",
    "mali",
    "morocco",
    "mozambique",
    "namibia",
    "nigeria",
    "rwanda",
    "senegal",
    "somalia",
    "south africa",
    "sudan",
    "tanzania",
    "tunisia",
    "uganda",
    "zambia",
    "zimbabwe",
  ],
  Europe: [
    "austria",
    "belgium",
    "bulgaria",
    "croatia",
    "cyprus",
    "czech republic",
    "denmark",
    "estonia",
    "finland",
    "france",
    "germany",
    "greece",
    "hungary",
    "iceland",
    "ireland",
    "italy",
    "latvia",
    "lithuania",
    "luxembourg",
    "malta",
    "netherlands",
    "norway",
    "poland",
    "portugal",
    "romania",
    "russia",
    "serbia",
    "slovakia",
    "slovenia",
    "spain",
    "sweden",
    "switzerland",
    "turkey",
    "ukraine",
    "united kingdom",
    "england",
    "scotland",
    "wales",
  ],
  Americas: [
    "argentina",
    "bahamas",
    "barbados",
    "bolivia",
    "brazil",
    "canada",
    "chile",
    "colombia",
    "costa rica",
    "cuba",
    "dominican republic",
    "ecuador",
    "el salvador",
    "guatemala",
    "haiti",
    "honduras",
    "jamaica",
    "mexico",
    "nicaragua",
    "panama",
    "paraguay",
    "peru",
    "puerto rico",
    "trinidad and tobago",
    "united states of america",
    "united states",
    "usa",
    "uruguay",
    "venezuela",
  ],
};

export function regionForCountry(country?: string | null): Region | null {
  if (!country) return null;
  const c = country.toLowerCase().trim();
  for (const region of REGIONS) {
    if (REGION_COUNTRIES[region].includes(c)) return region;
  }
  return null;
}

export function titleCase(text?: string | null): string {
  if (!text) return "";
  return text.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function initialsFor(
  first?: string,
  last?: string,
  username?: string | null,
): string {
  if (first || last)
    return `${(first || "")[0] || ""}${(last || "")[0] || ""}`.toUpperCase();
  return (username || "?").slice(0, 2).toUpperCase();
}

export function greetingForNow(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
