import Link from "next/link";
import globalStyles from "../styles/globals.css";

export default function AppHeader() {
    return (
        <header className="border-b border-[var(--border)] bg-white">
            <div className="flex justify-between items-center px-6 py-4 bg-white text-black">
                <Link href="/dashboard" className="text-xl font-bold">
                    <span className="text-[var(--primary)] ">Clause</span>Guard
                </Link>

                <div className="flex flex-row items-center gap-6">
                    <span className="text-sm text-[var(--muted)]">Tenant</span>
                    <button className="border border-[var(--border)] px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Logout</button>
                </div>

            </div>
        </header>
    )
}