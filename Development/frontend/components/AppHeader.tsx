"use client"

import { useState } from "react";
import Link from "next/link";
import Logo from "./ui/Logo";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { LogOut, Menu, X, Gauge, FileSearchCorner, FileCheck, CalendarClock, Bolt} from "lucide-react";

export default function AppHeader() {
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    async function handleLogout() {
        await signOut(auth);
        setIsMenuOpen(false);
        router.replace("/login");
    }

    const navItems = [
        {
            label: "Dashboard",
            href: "/dashboard",
            icon: Gauge
        },
        {
            label: "Validate Lease",
            href: "/validate-lease",
            icon: FileSearchCorner
        },
        {
            label: "Check Notice",
            href: "/check-notice",
            icon: FileCheck
        },
        {
            label: "Tenancy Timeline",
            href: "/tenancy-timeline",
            icon: CalendarClock
        },
        {
            label: "Settings",
            href: "/settings",
            icon: Bolt
        }
    ];

    return (
        <header className="border-b border-gray-300 shadow-xl bg-white">
            <div className="flex justify-between items-center px-6 py-4 bg-white text-black">
                <Link href="/" >
                    <Logo />
                </Link>

                <div className="relative">
                    <button type="button" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        {isMenuOpen ? (
                            <X size={22}/>
                        ) : (
                            <Menu size={22}/>
                        )}
                    </button>

                    {isMenuOpen && (
                        <>
                            <button type="button" onClick={() => setIsMenuOpen(false)} className="fixed inset-0 z-40 cursor-default"/>
                                <nav className="absolute right-0 top-full z-50 mt-3 w-45 rounded-xl border border-gray-300 shadow-soft bg-white p-2 shadow-xl">
                                    <div className="flex flex-col gap-1">
                                        {navItems.map((eachItem) => {
                                            const Icon = eachItem.icon;
                                            
                                            return (
                                            <Link href={eachItem.href} key={eachItem.href} onClick={() => setIsMenuOpen(false)} className="flex gap-2 text-sm font-medium rounded-lg hover:text-[var(--color-brand)] px-3 py-3 text-gray-700 hover:bg-gray-100">
                                                <Icon size={18}/>
                                                {eachItem.label}
                                            </Link>
                                            );
                                        })}
                                    </div>
                                    
                                    <button type="button" onClick={handleLogout} className="flex items-center w-full gap-2 rounded-lg px-3 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-red-600">
                                        <LogOut size={18}/> Logout
                                    </button>
                                </nav>
                        </>
                    )}
                </div>

            </div>
        </header>
    )
}