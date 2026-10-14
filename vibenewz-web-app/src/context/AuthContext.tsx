// ============================================================
// AuthContext.tsx
//
// Auth state backed by Supabase Auth.
// - Supabase handles token storage, refresh, and persistence
//   in AsyncStorage automatically.
// - After a Supabase sign-in we fetch the matching public.users
//   row via the backend so the rest of the app keeps working
//   the same way (username-keyed API calls).
// - Guest mode stores only a local flag (no DB row) so a browser
//   refresh stays on Home instead of bouncing back to login.
// ============================================================

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { AppUser } from "../api";

const GUEST_KEY = "vibenewz_is_guest";

interface AuthContextType {
  username: string | null;
  user: AppUser | null;
  isLoading: boolean;
  isGuest: boolean;
  login: (username: string, user: AppUser) => void;
  loginAsGuest: () => void;
  updateUser: (user: AppUser) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  username: null,
  user: null,
  isLoading: true,
  isGuest: false,
  login: () => {},
  loginAsGuest: () => {},
  updateUser: () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    // Check for an existing session on app start; fall back to guest flag
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        loadUserByAuthId(session.user.id).finally(() => setIsLoading(false));
      } else {
        // No auth session — check if user previously chose guest mode
        AsyncStorage.getItem(GUEST_KEY)
          .then((val) => { if (val === "1") setIsGuest(true); })
          .finally(() => setIsLoading(false));
      }
    });

    // Keep state in sync whenever Supabase auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        AsyncStorage.removeItem(GUEST_KEY).catch(() => {});
        loadUserByAuthId(session.user.id);
      } else {
        // INITIAL_SESSION fires with no session on every page load.
        // Keep a persisted guest instead of sending them back to login.
        AsyncStorage.getItem(GUEST_KEY).then((val) => {
          if (val === "1") {
            setIsGuest(true);
            setUsername(null);
            setUser(null);
          } else {
            setUsername(null);
            setUser(null);
            setIsGuest(false);
          }
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadUserByAuthId(authId: string) {
    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000"}/api/users/by-auth/${authId}`
      );
      if (res.ok) {
        const data: AppUser = await res.json();
        setUsername(data.username);
        setUser(data);
        setIsGuest(false);
      }
    } catch {
      // network error — leave state as-is, the user will see the login screen
    }
  }

  // Called by LoginScreen after it creates the public.users row itself
  function login(name: string, userData: AppUser) {
    setUsername(name);
    setUser(userData);
    setIsGuest(false);
    AsyncStorage.removeItem(GUEST_KEY).catch(() => {});
  }

  function loginAsGuest() {
    setIsGuest(true);
    setUsername(null);
    setUser(null);
    // Persist so page refresh keeps the guest session alive
    AsyncStorage.setItem(GUEST_KEY, "1").catch(() => {});
  }

  function updateUser(userData: AppUser) {
    setUser(userData);
    if (userData.username) setUsername(userData.username);
  }

  async function logout() {
    if (!isGuest) await supabase.auth.signOut();
    setUsername(null);
    setUser(null);
    setIsGuest(false);
    await AsyncStorage.removeItem(GUEST_KEY);
  }

  return (
    <AuthContext.Provider
      value={{
        username,
        user,
        isLoading,
        isGuest,
        login,
        loginAsGuest,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
