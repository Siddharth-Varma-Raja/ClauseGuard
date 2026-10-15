"use client"

import Link from "next/link";
import Logo from "./ui/Logo";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function AppHeader() {
    const router = useRouter();

    async function handleLogout() {
        await signOut(auth);
        router.replace("/login");
    }

    return (
        <header className="border-b border-[var(--border)] bg-white">
            <div className="flex justify-between items-center px-6 py-4 bg-white text-black">
                <Link href="/" >
                    <Logo />
                </Link>

                <div className="flex flex-row items-center gap-6">
                    <span className="text-sm text-[var(--muted)]">Tenant</span>
                    <button onClick={handleLogout} className="border border-[var(--border)] px-4 py-2 rounded-lg text-sm hover:bg-gray-50" >Logout</button>
                </div>

            </div>
        </header>
    )
}