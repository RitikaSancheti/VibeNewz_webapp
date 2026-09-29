// ============================================================
// countries.ts — which region each country belongs to, and roughly
// where it sits on the globe (lat/lng of its centre), so the Global
// map can drop a pin for every story.
// Keys are lowercase, matching what NewsData.io sends.
// ============================================================

export type Region = "Asia Pacific" | "Africa" | "Europe" | "Americas";
export const REGIONS: Region[] = [
  "Asia Pacific",
  "Africa",
  "Europe",
  "Americas",
];

// Where the globe turns to when you pick a region
export const REGION_CENTERS: Record<Region, { lat: number; lng: number }> = {
  "Asia Pacific": { lat: 12, lng: 115 },
  Africa: { lat: 4, lng: 20 },
  Europe: { lat: 48, lng: 14 },
  Americas: { lat: 12, lng: -82 },
};

type Info = { region: Region; lat: number; lng: number };
const A: Region = "Asia Pacific";
const F: Region = "Africa";
const E: Region = "Europe";
const M: Region = "Americas";

export const COUNTRIES: Record<string, Info> = {
  // Asia Pacific
  australia: { region: A, lat: -25, lng: 134 },
  bangladesh: { region: A, lat: 23.7, lng: 90.3 },
  cambodia: { region: A, lat: 12.5, lng: 105 },
  china: { region: A, lat: 35, lng: 103 },
  fiji: { region: A, lat: -17.7, lng: 178 },
  "hong kong": { region: A, lat: 22.3, lng: 114.2 },
  india: { region: A, lat: 21, lng: 78 },
  indonesia: { region: A, lat: -2, lng: 118 },
  japan: { region: A, lat: 36.5, lng: 138 },
  "south korea": { region: A, lat: 36.5, lng: 127.8 },
  korea: { region: A, lat: 36.5, lng: 127.8 },
  laos: { region: A, lat: 18, lng: 103 },
  malaysia: { region: A, lat: 4, lng: 102 },
  maldives: { region: A, lat: 3.2, lng: 73.2 },
  mongolia: { region: A, lat: 46.8, lng: 103 },
  myanmar: { region: A, lat: 21, lng: 96 },
  nepal: { region: A, lat: 28.4, lng: 84 },
  "new zealand": { region: A, lat: -41, lng: 174 },
  pakistan: { region: A, lat: 30, lng: 70 },
  "papua new guinea": { region: A, lat: -6.5, lng: 145 },
  philippines: { region: A, lat: 12.8, lng: 122 },
  singapore: { region: A, lat: 1.35, lng: 103.8 },
  "sri lanka": { region: A, lat: 7.8, lng: 80.7 },
  taiwan: { region: A, lat: 23.7, lng: 121 },
  thailand: { region: A, lat: 15, lng: 101 },
  vietnam: { region: A, lat: 16, lng: 107.8 },
  afghanistan: { region: A, lat: 33.9, lng: 67.7 },
  kazakhstan: { region: A, lat: 48, lng: 67 },
  uzbekistan: { region: A, lat: 41.4, lng: 64.6 },
  // Africa
  algeria: { region: F, lat: 28, lng: 2.6 },
  angola: { region: F, lat: -12.3, lng: 17.5 },
  botswana: { region: F, lat: -22.3, lng: 24.7 },
  cameroon: { region: F, lat: 5.7, lng: 12.4 },
  egypt: { region: F, lat: 26.8, lng: 30.8 },
  ethiopia: { region: F, lat: 9.1, lng: 40.5 },
  ghana: { region: F, lat: 7.9, lng: -1 },
  "ivory coast": { region: F, lat: 7.5, lng: -5.5 },
  kenya: { region: F, lat: 0.2, lng: 37.9 },
  madagascar: { region: F, lat: -19, lng: 46.7 },
  malawi: { region: F, lat: -13.3, lng: 34.3 },
  mali: { region: F, lat: 17.6, lng: -4 },
  morocco: { region: F, lat: 31.8, lng: -7.1 },
  mozambique: { region: F, lat: -18.7, lng: 35.5 },
  namibia: { region: F, lat: -22.9, lng: 18.5 },
  nigeria: { region: F, lat: 9.1, lng: 8.7 },
  rwanda: { region: F, lat: -1.9, lng: 29.9 },
  senegal: { region: F, lat: 14.5, lng: -14.5 },
  somalia: { region: F, lat: 5.2, lng: 46.2 },
  "south africa": { region: F, lat: -30.6, lng: 22.9 },
  sudan: { region: F, lat: 12.9, lng: 30.2 },
  tanzania: { region: F, lat: -6.4, lng: 34.9 },
  tunisia: { region: F, lat: 33.9, lng: 9.5 },
  uganda: { region: F, lat: 1.4, lng: 32.3 },
  zambia: { region: F, lat: -13.1, lng: 27.8 },
  zimbabwe: { region: F, lat: -19, lng: 29.2 },
  // Europe
  austria: { region: E, lat: 47.5, lng: 14.6 },
  belgium: { region: E, lat: 50.5, lng: 4.5 },
  bulgaria: { region: E, lat: 42.7, lng: 25.5 },
  croatia: { region: E, lat: 45.1, lng: 15.2 },
  cyprus: { region: E, lat: 35.1, lng: 33.4 },
  "czech republic": { region: E, lat: 49.8, lng: 15.5 },
  denmark: { region: E, lat: 56.3, lng: 9.5 },
  estonia: { region: E, lat: 58.6, lng: 25 },
  finland: { region: E, lat: 61.9, lng: 25.7 },
  france: { region: E, lat: 46.2, lng: 2.2 },
  germany: { region: E, lat: 51.2, lng: 10.4 },
  greece: { region: E, lat: 39.1, lng: 21.8 },
  hungary: { region: E, lat: 47.2, lng: 19.5 },
  iceland: { region: E, lat: 64.9, lng: -19 },
  ireland: { region: E, lat: 53.4, lng: -8.2 },
  italy: { region: E, lat: 41.9, lng: 12.6 },
  latvia: { region: E, lat: 56.9, lng: 24.6 },
  lithuania: { region: E, lat: 55.2, lng: 23.9 },
  luxembourg: { region: E, lat: 49.8, lng: 6.1 },
  malta: { region: E, lat: 35.9, lng: 14.4 },
  netherlands: { region: E, lat: 52.1, lng: 5.3 },
  norway: { region: E, lat: 60.5, lng: 8.5 },
  poland: { region: E, lat: 51.9, lng: 19.1 },
  portugal: { region: E, lat: 39.4, lng: -8.2 },
  romania: { region: E, lat: 45.9, lng: 25 },
  russia: { region: E, lat: 55.7, lng: 37.6 },
  serbia: { region: E, lat: 44, lng: 21 },
  slovakia: { region: E, lat: 48.7, lng: 19.7 },
  slovenia: { region: E, lat: 46.2, lng: 14.9 },
  spain: { region: E, lat: 40.5, lng: -3.7 },
  sweden: { region: E, lat: 60.1, lng: 18.6 },
  switzerland: { region: E, lat: 46.8, lng: 8.2 },
  turkey: { region: E, lat: 39, lng: 35.2 },
  ukraine: { region: E, lat: 48.4, lng: 31.2 },
  "united kingdom": { region: E, lat: 54, lng: -2.5 },
  england: { region: E, lat: 52.4, lng: -1.5 },
  scotland: { region: E, lat: 56.5, lng: -4.2 },
  wales: { region: E, lat: 52.1, lng: -3.8 },
  // Americas
  argentina: { region: M, lat: -38.4, lng: -63.6 },
  bahamas: { region: M, lat: 25, lng: -77.4 },
  barbados: { region: M, lat: 13.2, lng: -59.5 },
  bolivia: { region: M, lat: -16.3, lng: -63.6 },
  brazil: { region: M, lat: -14.2, lng: -51.9 },
  canada: { region: M, lat: 56.1, lng: -106.3 },
  chile: { region: M, lat: -35.7, lng: -71.5 },
  colombia: { region: M, lat: 4.6, lng: -74.3 },
  "costa rica": { region: M, lat: 9.7, lng: -83.8 },
  cuba: { region: M, lat: 21.5, lng: -77.8 },
  "dominican republic": { region: M, lat: 18.7, lng: -70.2 },
  ecuador: { region: M, lat: -1.8, lng: -78.2 },
  "el salvador": { region: M, lat: 13.8, lng: -88.9 },
  guatemala: { region: M, lat: 15.8, lng: -90.2 },
  haiti: { region: M, lat: 19, lng: -72.3 },
  honduras: { region: M, lat: 15.2, lng: -86.2 },
  jamaica: { region: M, lat: 18.1, lng: -77.3 },
  mexico: { region: M, lat: 23.6, lng: -102.5 },
  nicaragua: { region: M, lat: 12.9, lng: -85.2 },
  panama: { region: M, lat: 8.5, lng: -80.8 },
  paraguay: { region: M, lat: -23.4, lng: -58.4 },
  peru: { region: M, lat: -9.2, lng: -75 },
  "puerto rico": { region: M, lat: 18.2, lng: -66.6 },
  "trinidad and tobago": { region: M, lat: 10.7, lng: -61.2 },
  "united states of america": { region: M, lat: 39.8, lng: -98.6 },
  "united states": { region: M, lat: 39.8, lng: -98.6 },
  usa: { region: M, lat: 39.8, lng: -98.6 },
  uruguay: { region: M, lat: -32.5, lng: -55.8 },
  venezuela: { region: M, lat: 6.4, lng: -66.6 },
};

export function countryInfo(country?: string | null): Info | null {
  if (!country) return null;
  return COUNTRIES[country.toLowerCase().trim()] || null;
}

export function regionForCountry(country?: string | null): Region | null {
  return countryInfo(country)?.region || null;
}
