"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { User } from "@/types";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (company_name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  demoLogin: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<User>("/auth/me")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setUser(await api<User>("/auth/login", { method: "POST", json: { email, password } }));
  }, []);

  const register = useCallback(async (company_name: string, email: string, password: string) => {
    setUser(
      await api<User>("/auth/register", {
        method: "POST",
        json: { company_name, email, password },
      })
    );
  }, []);

  const logout = useCallback(async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
  }, []);

  const demoLogin = useCallback(async () => {
    setUser(await api<User>("/auth/demo-login", { method: "POST" }));
  }, []);

  return <Ctx.Provider value={{ user, loading, login, register, logout, demoLogin }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}