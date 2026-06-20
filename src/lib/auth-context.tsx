import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";

import { logoutUser } from "./api/db.functions";
import type { signupUser } from "./api/db.functions";

type User = Awaited<ReturnType<typeof signupUser>>["user"];

type AuthContext = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
};

const AuthCtx = createContext<AuthContext | null>(null);

const TOKEN_KEY = "wolxtech_session_token";
const USER_KEY = "wolxtech_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  function login(newToken: string, newUser: User) {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }

  async function logout() {
    const currentToken = token;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    if (currentToken) {
      logoutUser({ data: { token: currentToken } }).catch(() => {});
    }
    await router.invalidate();
    await router.navigate({ to: "/login" });
  }

  return (
    <AuthCtx value={{ user, token, loading, login, logout }}>
      {children}
    </AuthCtx>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
