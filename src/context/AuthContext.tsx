"use client";

import { createContext, useContext, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { User, NotionConnection, CanvasConnection } from "@prisma/client";

type UserWithRelations = User & {
  notion: NotionConnection | null;
  canvas: CanvasConnection | null;
};

type AuthCtx = {
  user: UserWithRelations | null;
  loading: boolean;
  setUser: (u: UserWithRelations | null) => void;
  refresh: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children, initialUser }: { children: React.ReactNode; initialUser: UserWithRelations | null; }) {
  const router = useRouter();
  const [user, _setUser] = useState<UserWithRelations | null>(initialUser);
  const [loading, setLoading] = useState(false);

  const setUser = useCallback((u: UserWithRelations | null) => _setUser(u), []);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        console.error("Logout failed:", await res.text());
      }

      _setUser(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }, [router]);

  const value = useMemo<AuthCtx>(
    () => ({ user, loading, setUser, refresh, signOut }),
    [user, loading, refresh, signOut, setUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
