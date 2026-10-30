"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { ChevronDown, LogOut, Menu, Settings, Upload, X } from "lucide-react";
import Logo from "./ui/Logo";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/cn";

const NAV_ITEMS = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "My leases", href: "/lease" },
    { label: "Notices", href: "/notices" },
    { label: "Timeline", href: "/timeline" },
];

function initialsOf(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AppHeader() {
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

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

    function isActive(href: string) {
        if (href === "/lease") return pathname === "/lease" || (pathname.startsWith("/lease/") && !pathname.startsWith("/lease/new"));
        return pathname === href || pathname.startsWith(`${href}/`);
    }

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
        <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
            <div className="flex h-16 items-center gap-4 px-4 sm:px-6 lg:gap-8 lg:px-8">
                <Link href="/dashboard" onClick={closeMenus}>
                    <Logo />
                </Link>

                <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
                    {NAV_ITEMS.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={isActive(item.href) ? "page" : undefined}
                            className={cn(
                                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                                isActive(item.href) ? "bg-brand-soft font-semibold text-brand-dark" : "text-mute hover:bg-surface hover:text-brand-dark",
                            )}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="ml-auto flex items-center gap-2 sm:gap-3">
                    <Link
                        href="/lease/new"
                        onClick={closeMenus}
                        aria-label="Upload lease"
                        className={cn(
                            "inline-flex h-10 items-center gap-2 rounded-full bg-brand-dark px-3 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-brand sm:px-5",
                            pathname.startsWith("/lease/new") && "ring-2 ring-brand-soft ring-offset-2",
                        )}
                    >
                        <Upload size={17}  />
                        <span className="hidden sm:inline">Upload lease</span>
                    </Link>

                    <button
                        type="button"
                        onClick={() => {
                            setMenuOpen(!menuOpen);
                            setProfileOpen(false);
                        }}
                        aria-label={menuOpen ? "Close menu" : "Open menu"}
                        aria-expanded={menuOpen}
                        className="grid size-10 cursor-pointer place-items-center rounded-full border border-line text-brand-dark hover:bg-surface md:hidden"
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
                            <ChevronDown size={16} className={cn("transition-transform", profileOpen && "rotate-180")}  />
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
                                    <Settings size={17}  />
                                    Settings
                                </Link>
                                <div className="mx-1 my-1.5 h-px bg-line" />
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={handleLogout}
                                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-bad hover:bg-bad-bg"
                                >
                                    <LogOut size={17}  />
                                    Log out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {menuOpen && (
                <nav aria-label="Main" className="animate-pop-in border-t border-line bg-white px-4 py-3 md:hidden">
                    {NAV_ITEMS.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={closeMenus}
                            aria-current={isActive(item.href) ? "page" : undefined}
                            className={cn(
                                "block rounded-xl px-4 py-3 text-sm font-medium",
                                isActive(item.href) ? "bg-brand-soft font-semibold text-brand-dark" : "text-mute hover:bg-surface",
                            )}
                        >
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
