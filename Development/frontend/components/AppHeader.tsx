"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { ChevronDown, CircleHelp, LogOut, Settings, Plus, FileCheck, FileUp } from "lucide-react";
import Logo from "./ui/Logo";
import { START_TOUR, TOUR_GONE, TOUR_READY } from "./PageTour";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/components/auth/AuthProvider";
import { ADMIN_ITEM, NAV_ITEMS, isActive, initialsOf } from "@/lib/nav";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { cn } from "@/lib/cn";

const ADD_OPTIONS = [
    { title: "Upload a lease", text: "PDF, Word or photo, up to 25 MB", href: "/lease/new", Icon: FileUp, tone: "bg-brand-soft text-brand-dark" },
    { title: "Check a notice", text: "Rent increase or notice to leave", href: "/notices", Icon: FileCheck, tone: "bg-ok-bg text-ok" },
];

function TabLink({ href, label, Icon, active }: { href: string; label: string; Icon: typeof Plus; active: boolean }) {
    return (
        <Link
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn("flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium", active ? "text-brand-dark" : "text-mute")}
        >
            <span className={cn("grid h-8 w-12 place-items-center rounded-full transition-colors", active && "bg-brand-soft")}>
                <Icon size={20} />
            </span>
            {label}
        </Link>
    );
}

export default function AppHeader() {
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useAuth();
    const isAdmin = useIsAdmin();
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
        <>
            <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur md:hidden [@media(max-height:480px)]:static">
                <div className="flex h-16 items-center gap-2 px-4 sm:gap-4 sm:px-6">
                    <Link href="/dashboard" onClick={closeMenus} aria-label="ClauseGuard dashboard" className="max-[359px]:[&>span>span]:hidden">
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
                                    {isAdmin && (
                                        <Link
                                            href={ADMIN_ITEM.href}
                                            role="menuitem"
                                            onClick={closeMenus}
                                            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink hover:bg-surface"
                                        >
                                            <ADMIN_ITEM.Icon size={17} />
                                            {ADMIN_ITEM.label}
                                        </Link>
                                    )}

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

                {(menuOpen || profileOpen) && (
                    <button type="button" aria-label="Close menu" tabIndex={-1} onClick={closeMenus} className="fixed inset-0 top-16 -z-10 cursor-default" />
                )}
            </header>

            <div
                aria-hidden
                onClick={closeMenus}
                className={cn("fixed inset-0 z-[45] bg-[rgb(8_28_33/0.45)] backdrop-blur-[3px] transition-opacity duration-300 md:hidden", menuOpen ? "opacity-100" : "pointer-events-none opacity-0")}
            />

            <div
                id="add-sheet"
                role="dialog"
                aria-modal="true"
                aria-label="Add something new"
                inert={!menuOpen}
                className={cn(
                    "fixed inset-x-0 bottom-0 z-[46] rounded-t-[1.75rem] bg-white px-5 pb-28 pt-3.5 shadow-[0_-12px_40px_rgb(0_0_0/0.2)] transition-transform duration-[380ms] ease-[cubic-bezier(0.16,1,0.3,1)] md:hidden",
                    menuOpen ? "translate-y-0" : "translate-y-full",
                )}
            >
                <span className="mx-auto mb-3.5 block h-1 w-10 rounded-full bg-line" />
                <h2 className="font-display text-[22px] font-semibold text-brand-dark">Add something new</h2>
                <div className="mt-3 space-y-2.5">
                    {ADD_OPTIONS.map((option, index) => (
                        <Link
                            key={option.href}
                            href={option.href}
                            onClick={closeMenus}
                            style={{ transitionDelay: menuOpen ? `${(index + 1) * 80}ms` : "0ms" }}
                            className={cn(
                                "flex items-center gap-3.5 rounded-[1.25rem] bg-[#f4f8f8] p-3.5 transition-all duration-300 active:scale-[0.98]",
                                menuOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
                            )}
                        >
                            <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl", option.tone)}>
                                <option.Icon size={22} />
                            </span>
                            <span>
                                <span className="block font-semibold text-ink">{option.title}</span>
                                <span className="block text-sm text-mute">{option.text}</span>
                            </span>
                        </Link>
                    ))}
                </div>
            </div>

            <nav aria-label="Main tabs" className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-line bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
                {NAV_ITEMS.slice(0, 2).map((item) => (
                    <TabLink key={item.href} href={item.href} label={item.label} Icon={item.Icon} active={isActive(pathname, item.href)} />
                ))}
                <button
                    type="button"
                    onClick={() => {
                        setMenuOpen(!menuOpen);
                        setProfileOpen(false);
                    }}
                    aria-expanded={menuOpen}
                    aria-controls="add-sheet"
                    aria-label={menuOpen ? "Close" : "Add something new"}
                    className="flex cursor-pointer flex-col items-center justify-end gap-1 pb-2.5 text-[11px] font-semibold text-brand-dark"
                >
                    <span className="-mt-6 grid size-14 place-items-center rounded-full bg-brand-dark text-white shadow-[0_10px_24px_-8px_rgb(10_59_67/0.6)] ring-[5px] ring-white transition-transform active:scale-90">
                        <Plus size={24} strokeWidth={2.4} className={cn("transition-transform duration-300", menuOpen && "rotate-[135deg]")} />
                    </span>
                    {menuOpen ? "Close" : "Upload"}
                </button>
                {NAV_ITEMS.slice(2).map((item) => (
                    <TabLink key={item.href} href={item.href} label={item.label} Icon={item.Icon} active={isActive(pathname, item.href)} />
                ))}
            </nav>
        </>
    );
}