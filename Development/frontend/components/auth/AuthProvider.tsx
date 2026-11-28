"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { endOnboarding } from "@/components/GuidedTour";

type AuthState = {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setVersion] = useState(0);

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      if (!firebaseUser) endOnboarding(); // signed out: no more automatic tours

      document.cookie = firebaseUser
        ? "cg_signed_in=1; path=/; max-age=2592000; samesite=lax"
        : "cg_signed_in=; path=/; max-age=0";
    });
  }, []);

  async function refreshUser() {
    await auth.currentUser?.reload();
    setUser(auth.currentUser);
    setVersion((version) => version + 1);
  }

  return <AuthContext value={{ user, loading, refreshUser }}>{children}</AuthContext>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth Error.");
  return value;
}
