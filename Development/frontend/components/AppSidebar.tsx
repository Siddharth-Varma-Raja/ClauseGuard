"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { CircleHelp, LogOut, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { START_TOUR, TOUR_GONE, TOUR_READY } from "./PageTour";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/components/auth/AuthProvider";
import { NAV_ITEMS, initialsOf, isActive } from "@/lib/nav";
import { cn } from "@/lib/cn";

const SHOW = "opacity-0 transition-opacity duration-200 group-hover/side:opacity-100 group-has-[:focus-visible]/side:opacity-100";

function Item({ label, Icon, active = false, danger = false }: { label: string; Icon: LucideIcon; active?: boolean; danger?: boolean }) {
    return (
        <span
            className={cn(
                "relative flex min-h-11 items-center gap-3 rounded-xl text-[15px] font-medium transition-colors",
                active ? "bg-brand-soft font-semibold text-brand-dark" : danger ? "text-mute hover:bg-bad-bg hover:text-bad" : "text-mute hover:bg-surface hover:text-ink",
            )}
        >
            {active && <span className="absolute -left-4 bottom-2 top-2 w-1 rounded-r-full bg-brand" />}
            <span className="grid w-11 shrink-0 place-items-center">
                <Icon size={20} />
            </span>
            <span className={cn("whitespace-nowrap", SHOW)}>{label}</span>
        </span>
    );
}

export default function AppSidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useAuth();
    const [hasTour, setHasTour] = useState(false);
    const name = user?.displayName || user?.email?.split("@")[0] || "";

    useEffect(() => {
        const ready = () => setHasTour(true);
        const gone = () => setHasTour(false);
        window.addEventListener(TOUR_READY, ready);
        window.addEventListener(TOUR_GONE, gone);
        return () => {
            window.removeEventListener(TOUR_READY, ready);
            window.removeEventListener(TOUR_GONE, gone);
        };
    }, []);

    async function handleLogout() {
        await signOut(auth);
        router.replace("/login");
    }

    return (
        <div className="hidden w-[76px] shrink-0 md:block print:hidden">
            <aside
                aria-label="Main menu"
                className="group/side fixed inset-y-0 left-0 z-40 flex w-[76px] flex-col overflow-hidden border-r border-[#d5e3e4] bg-white px-4 py-6 transition-[width,box-shadow] duration-200 ease-out hover:w-64 hover:shadow-[12px_0_40px_-12px_rgb(10_59_67/0.25)] has-[:focus-visible]:w-64"
            >
                <Link href="/dashboard" className="flex h-10 items-center gap-3 rounded-xl">
                    <span className="grid w-11 shrink-0 place-items-center">
                        <Image src="/logo.svg" alt="" width={26} height={28} priority />
                    </span>
                    <span className={cn("whitespace-nowrap font-display text-xl font-semibold text-brand-dark", SHOW)}>ClauseGuard</span>
                </Link>

                <nav aria-label="Main" className="mt-8 space-y-1">
                    {NAV_ITEMS.map(({ href, label, Icon }) => (
                        <Link key={href} href={href} aria-current={isActive(pathname, href) ? "page" : undefined} className="block rounded-xl">
                            <Item label={label} Icon={Icon} active={isActive(pathname, href)} />
                        </Link>
                    ))}
                </nav>

                <div className="mx-1 my-5 h-px bg-line" />

                <div className="space-y-1">
                    <Link href="/settings" aria-current={pathname.startsWith("/settings") ? "page" : undefined} className="block rounded-xl">
                        <Item label="Settings" Icon={Settings} active={pathname.startsWith("/settings")} />
                    </Link>
                    {hasTour && (
                        <button type="button" data-tour="tour-button" onClick={() => window.dispatchEvent(new Event(START_TOUR))} className="block w-full cursor-pointer rounded-xl text-left">
                            <Item label="Tour of this page" Icon={CircleHelp} />
                        </button>
                    )}
                    <button type="button" onClick={handleLogout} className="block w-full cursor-pointer rounded-xl text-left">
                        <Item label="Log out" Icon={LogOut} danger />
                    </button>
                </div>

                <div className="mt-auto flex items-center gap-3 border-t border-line pt-4">
                    <span className="grid w-11 shrink-0 place-items-center">
                        <span className="grid size-10 place-items-center rounded-full bg-brand-dark text-sm font-semibold text-white">{initialsOf(name)}</span>
                    </span>
                    <span className={cn("min-w-0", SHOW)}>
                        <span className="block truncate whitespace-nowrap font-semibold text-ink">{user?.displayName || name}</span>
                        <span className="block truncate whitespace-nowrap text-xs text-mute">{user?.email}</span>
                    </span>
                </div>
            </aside>
        </div>
    );
}