// ============================================================
// AuthContext.tsx
//
// The React Native version of your old AuthContext.tsx.
// Web apps use sessionStorage to remember who's logged in —
// React Native apps use AsyncStorage instead, which is the
// same idea but works on a phone.
// ============================================================

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppUser } from "../api";

const STORAGE_KEY = "vibenewz_user";

interface AuthContextType {
  username: string | null;
  user: AppUser | null;
  isLoading: boolean; // true while we're checking AsyncStorage on app start
  login: (username: string, user: AppUser) => Promise<void>;
  updateUser: (user: AppUser) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  username: null,
  user: null,
  isLoading: true,
  login: async () => {},
  updateUser: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On app start, check if we saved a logged-in user last time.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          const parsed = JSON.parse(stored);
          setUsername(parsed.username);
          setUser(parsed.user);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function login(name: string, userData: AppUser) {
    setUsername(name);
    setUser(userData);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ username: name, user: userData }));
  }

  async function updateUser(userData: AppUser) {
    setUser(userData);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ username, user: userData }));
  }

  async function logout() {
    setUsername(null);
    setUser(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }

  return (
    <AuthContext.Provider value={{ username, user, isLoading, login, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
