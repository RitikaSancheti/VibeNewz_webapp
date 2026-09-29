// Shared bookmarks, so cards, the article page and the Bookmarks tab always agree.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { NewsArticle, getBookmarks, addBookmark, removeBookmark } from "../api";

interface BookmarksContextType {
  bookmarks: NewsArticle[];
  loading: boolean;
  isBookmarked: (id: number) => boolean;
  toggleBookmark: (article: NewsArticle) => Promise<void>;
  refresh: () => Promise<void>;
}

const BookmarksContext = createContext<BookmarksContextType | null>(null);

export function BookmarksProvider({ children }: { children: ReactNode }) {
  const { username } = useAuth();
  const [bookmarks, setBookmarks] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!username) {
      setBookmarks([]);
      setLoading(false);
      return;
    }
    try {
      const data = await getBookmarks(username);
      setBookmarks(data.filter(Boolean));
    } catch {
      // backend offline — keep whatever we had
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  const isBookmarked = useCallback(
    (id: number) => bookmarks.some((b) => b.id === id),
    [bookmarks],
  );

  async function toggleBookmark(article: NewsArticle) {
    if (!username) return;
    const saved = isBookmarked(article.id);
    setBookmarks((prev) =>
      saved ? prev.filter((b) => b.id !== article.id) : [article, ...prev],
    );
    try {
      if (saved) await removeBookmark(username, article.id);
      else await addBookmark(username, article.id);
    } catch {
      await refresh();
    }
  }

  return (
    <BookmarksContext.Provider
      value={{ bookmarks, loading, isBookmarked, toggleBookmark, refresh }}
    >
      {children}
    </BookmarksContext.Provider>
  );
}

export function useBookmarks() {
  const ctx = useContext(BookmarksContext);
  if (!ctx)
    throw new Error("useBookmarks must be used inside BookmarksProvider");
  return ctx;
}
