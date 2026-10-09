import Link from "next/link"

export default function Sidebar() {
    return (
        <aside className="hidden min-h-[calc(100vh-73px)] w-64 border-r border-[var(--border)] bg-white md:block">
            <nav className="p-4">
                <Link href="/dashboard" className="block px-4 py-3 text-sm font-medium hover:bg-gray-100">Dashboard</Link>
                <Link href="/validate/new" className="block px-4 py-3 text-sm font-medium hover:bg-gray-100">Validate New Lease</Link>
                <Link href="/dashboard" className="block px-4 py-3 text-sm font-medium hover:bg-gray-100">Check a notice</Link>
                <Link href="/dashboard" className="block px-4 py-3 text-sm font-medium hover:bg-gray-100">Tenancy Timeline</Link>              
            </nav>
        </aside>
    );
}