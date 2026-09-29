// ============================================================
// api.ts — every network call to your backend lives here.
//
// This is the React Native version of your old services/api.ts.
// The functions and field names are the same shape, just talking
// to the new Node backend instead of Spring Boot.
// ============================================================

// Since this runs as a web app in your browser, on the same Mac as your
// backend, "localhost" just works — the browser and the server are on
// the same machine. (If you ever deploy this online instead of running
// it locally, you'd change this to your deployed backend's real URL.)
const API_BASE_URL = "http://localhost:3000/api";

// ---- Types -------------------------------------------------

export type Sentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE";

export interface NewsArticle {
  id: number;
  article_id?: string;
  title: string;
  description: string;
  content?: string;
  source: string;
  url: string;
  sentiment: Sentiment;
  category?: string;
  published_at?: string;
  image_url?: string | null; // NEW — photo from NewsData.io
  country?: string | null; // NEW — e.g. "Philippines"
}

export interface AppUser {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  location?: string;
  preferred_sentiment: Sentiment;
  topics?: string[];
}

export interface MutedKeyword {
  id: number;
  keyword: string;
}

export interface SentimentCounts {
  POSITIVE: number;
  NEUTRAL: number;
  NEGATIVE: number;
  TOTAL: number;
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface TrendDay {
  day: string;
  positive: number;
  neutral: number;
  serious: number;
}

// ---- Small helper so every function doesn't repeat this ----

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // response wasn't JSON, keep the default message
    }
    throw new Error(message);
  }

  // DELETE routes sometimes just return a message, but response.json() still works
  return response.json();
}

// ---- News ----------------------------------------------------

export function getAllNews(): Promise<NewsArticle[]> {
  return request("/news");
}

// force = true skips the server's 30-minute cache (used by the Refresh button)
export function fetchLiveNews(
  username: string,
  force = false,
): Promise<NewsArticle[]> {
  return request(`/news/fetch/${username}${force ? "?force=1" : ""}`);
}

export function getNewsById(id: number | string): Promise<NewsArticle> {
  return request(`/news/${id}`);
}

export function getSentimentCounts(): Promise<SentimentCounts> {
  return request("/news/analytics/counts");
}

export function getCategoryDistribution(): Promise<CategoryCount[]> {
  return request("/news/analytics/categories");
}

export function getSentimentTrend(): Promise<TrendDay[]> {
  return request("/news/analytics/trend");
}

// ---- User feed (topics + muted keywords applied) -------------

export function getUserFeed(username: string): Promise<NewsArticle[]> {
  return request(`/users/${username}/feed`);
}

export function getUserFeedBySentiment(
  username: string,
  sentiment: Sentiment,
): Promise<NewsArticle[]> {
  return request(`/users/${username}/feed/${sentiment}`);
}

// ---- Bookmarks -------------------------------------------------

export function getBookmarks(username: string): Promise<NewsArticle[]> {
  return request(`/users/${username}/bookmarks`);
}

export function addBookmark(username: string, newsId: number): Promise<void> {
  return request(`/users/${username}/bookmarks/${newsId}`, { method: "POST" });
}

export function removeBookmark(
  username: string,
  newsId: number,
): Promise<void> {
  return request(`/users/${username}/bookmarks/${newsId}`, {
    method: "DELETE",
  });
}

// ---- Muted keywords ---------------------------------------------

export function getMutedKeywords(username: string): Promise<MutedKeyword[]> {
  return request(`/users/${username}/muted`);
}

export function addMutedKeyword(
  username: string,
  keyword: string,
): Promise<MutedKeyword> {
  return request(`/users/${username}/muted`, {
    method: "POST",
    body: JSON.stringify({ keyword }),
  });
}

export function removeMutedKeyword(
  username: string,
  keywordId: number,
): Promise<void> {
  return request(`/users/${username}/muted/${keywordId}`, { method: "DELETE" });
}

// ---- User ----------------------------------------------------------

export async function getUser(username: string): Promise<AppUser | null> {
  try {
    return await request<AppUser>(`/users/${username}`);
  } catch {
    return null; // not found
  }
}

export function createUser(username: string): Promise<AppUser> {
  return request("/users", {
    method: "POST",
    body: JSON.stringify({ username }),
  });
}

export function updateAccountInfo(
  username: string,
  info: {
    firstName: string;
    lastName: string;
    email: string;
    location: string;
  },
): Promise<AppUser> {
  return request(`/users/${username}/account`, {
    method: "PUT",
    body: JSON.stringify(info),
  });
}

export function updateTopics(
  username: string,
  topics: string[],
): Promise<AppUser> {
  return request(`/users/${username}/topics`, {
    method: "PUT",
    body: JSON.stringify({ topics }),
  });
}
