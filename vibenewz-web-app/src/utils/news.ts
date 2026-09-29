// ============================================================
// news.ts — small helper functions shared by several screens.
// ============================================================

import { NewsArticle } from "../api";

// ---- Reading time ---------------------------------------------------
export function readMinutes(article: NewsArticle): number {
  const text = `${article.title || ""} ${article.content || article.description || ""}`;
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

// Regions now live in utils/countries.ts (re-exported here so old imports keep working)
export { REGIONS, regionForCountry } from "./countries";
export type { Region } from "./countries";

// "united states of america" -> "United States Of America"
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
