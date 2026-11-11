"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { ChevronDown, CircleHelp, LogOut, Menu, Settings, X } from "lucide-react";
import Logo from "./ui/Logo";
import { START_TOUR, TOUR_GONE, TOUR_READY } from "./PageTour";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/components/auth/AuthProvider";
import { NAV_ITEMS, isActive, initialsOf } from "@/lib/nav";
import { cn } from "@/lib/cn";

export default function AppHeader() {
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [hasTour, setHasTour] = useState(false);

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

    const name = user?.displayName || user?.email?.split("@")[0] || "";
    const onSettings = pathname.startsWith("/settings");

    useEffect(() => {
        if (!menuOpen && !profileOpen) return;
        function onKey(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setMenuOpen(false);
                setProfileOpen(false);
            }
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [menuOpen, profileOpen]);


    function closeMenus() {
        setMenuOpen(false);
        setProfileOpen(false);
    }

    async function handleLogout() {
        closeMenus();
        await signOut(auth);
        router.replace("/login");
    }

    return (
        <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur md:hidden">
            <div className="flex h-16 items-center gap-4 px-4 sm:px-6">
                <Link href="/dashboard" onClick={closeMenus}>
                    <Logo />
                </Link>

                <div className="ml-auto flex items-center gap-2 sm:gap-3">
                    {hasTour && (
                        <button
                            type="button"
                            data-tour="tour-button"
                            onClick={() => {
                                closeMenus();
                                window.dispatchEvent(new Event(START_TOUR));
                            }}
                            aria-label="Take the tour of this page"
                            title="Take the tour of this page"
                            className="grid size-10 cursor-pointer place-items-center rounded-full border border-line bg-white text-brand-dark transition-colors hover:border-brand hover:bg-brand-soft"
                        >
                            <CircleHelp size={19} />
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => {
                            setMenuOpen(!menuOpen);
                            setProfileOpen(false);
                        }}
                        aria-label={menuOpen ? "Close menu" : "Open menu"}
                        aria-expanded={menuOpen}
                        className="grid size-10 cursor-pointer place-items-center rounded-full border border-line text-brand-dark hover:bg-surface"
                    >
                        {menuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>

                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => {
                                setProfileOpen(!profileOpen);
                                setMenuOpen(false);
                            }}
                            aria-label="Your account"
                            aria-expanded={profileOpen}
                            className={cn(
                                "flex cursor-pointer items-center gap-1.5 rounded-full border border-line bg-white p-1 pr-2.5 text-mute transition-colors hover:border-brand hover:text-brand-dark",
                                (profileOpen || onSettings) && "border-brand text-brand-dark ring-4 ring-brand-soft",
                            )}
                        >
                            <span className="grid size-8 place-items-center rounded-full bg-brand-dark text-xs font-semibold text-white">
                                {initialsOf(name)}
                            </span>
                            <ChevronDown size={16} className={cn("transition-transform", profileOpen && "rotate-180")} />
                        </button>

                        {profileOpen && (
                            <div role="menu" className="absolute right-0 top-full z-50 mt-3 w-64 animate-pop-in rounded-2xl border border-line bg-white p-2 shadow-xl">
                                <div className="flex items-center gap-3 border-b border-line px-2.5 pb-3 pt-2">
                                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-dark text-xs font-semibold text-white">
                                        {initialsOf(name)}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-ink">{user?.displayName || name}</p>
                                        <p className="truncate text-xs text-mute">{user?.email}</p>
                                    </div>
                                </div>
                                <Link
                                    href="/settings"
                                    role="menuitem"
                                    onClick={closeMenus}
                                    className={cn(
                                        "mt-1.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink hover:bg-surface",
                                        onSettings && "bg-brand-soft text-brand-dark",
                                    )}
                                >
                                    <Settings size={17} />
                                    Settings
                                </Link>
                                <div className="mx-1 my-1.5 h-px bg-line" />
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={handleLogout}
                                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-bad hover:bg-bad-bg"
                                >
                                    <LogOut size={17} />
                                    Log out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {menuOpen && (
                <nav aria-label="Main" className="animate-pop-in border-t border-line bg-white px-4 py-3">
                    {NAV_ITEMS.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={closeMenus}
                            aria-current={isActive(pathname, item.href) ? "page" : undefined}
                            className={cn(
                                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium",
                                isActive(pathname, item.href) ? "bg-brand-soft font-semibold text-brand-dark" : "text-mute hover:bg-surface",
                            )}
                        >
                            <item.Icon size={18} />
                            {item.label}
                        </Link>
                    ))}
                </nav>
            )}

            {(menuOpen || profileOpen) && (
                <button type="button" aria-label="Close menu" tabIndex={-1} onClick={closeMenus} className="fixed inset-0 top-16 -z-10 cursor-default" />
            )}
        </header>
    );
}