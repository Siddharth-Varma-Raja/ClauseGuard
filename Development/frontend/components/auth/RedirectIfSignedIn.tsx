"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

export default function RedirectIfSignedIn({ to = "/dashboard" }: { to?: string }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace(to);
  }, [loading, user, router, to]);

  return null;
}