"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/admin/review", label: "Review queue" },
  { href: "/admin/models", label: "Model versions" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = useIsAdmin();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (admin === false) router.replace("/dashboard");
  }, [admin, router]);

  if (!admin) {
    return (
      <div aria-busy="true" className="mx-auto max-w-[1240px]">
        <p role="status" className="sr-only">
          Checking your access
        </p>
        <div className="skeleton h-16 w-80 rounded-2xl" />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="skeleton h-28 rounded-3xl" />
          <div className="skeleton h-28 rounded-3xl" />
          <div className="skeleton h-28 rounded-3xl" />
        </div>
        <div className="skeleton mt-4 h-80 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1240px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-mute">
          <ShieldCheck size={15} aria-hidden className="text-brand" />
          Team only
        </p>
        <nav aria-label="Admin sections" className="flex gap-1 rounded-full border border-[#cfe1e2] bg-white p-1 shadow-soft">
          {TABS.map((tab) => {
            const on = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                  on ? "bg-brand text-white" : "text-mute hover:bg-surface hover:text-ink",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </div>
  );
}
