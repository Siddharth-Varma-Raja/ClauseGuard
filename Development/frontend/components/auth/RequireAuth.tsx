"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import LoadingState from "@/components/ui/LoadingState";
import { useAuth } from "./AuthProvider";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, user, router, pathname]);

  if (loading || !user) {
    return <LoadingState label="Checking your account…" />;
  }

  return children;
}