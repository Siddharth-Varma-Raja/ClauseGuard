"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getProfile } from "./api";

const known = new Map<string, boolean>();

export function useIsAdmin() {
  const { user } = useAuth();
  const uid = user?.uid ?? "";
  const [checked, setChecked] = useState<{ uid: string; admin: boolean } | null>(null);

  useEffect(() => {
    if (!uid || known.has(uid)) return;
    let live = true;
    getProfile()
      .then((profile) => {
        const admin = profile.role === "admin";
        known.set(uid, admin);
        if (live) setChecked({ uid, admin });
      })
      .catch(() => {
        if (live) setChecked({ uid, admin: false });
      });
    return () => {
      live = false;
    };
  }, [uid]);

  if (!uid) return false;
  if (known.has(uid)) return known.get(uid) === true;
  if (checked?.uid === uid) return checked.admin;
  return null;
}
