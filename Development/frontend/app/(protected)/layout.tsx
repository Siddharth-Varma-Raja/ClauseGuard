import AppHeader from "@/components/AppHeader"
import Footer from "@/components/Footer"
import Sidebar from "@/components/Sidebar"
import RequireAuth from "@/components/auth/RequireAuth"
import type { ReactNode } from "react"

export default function ProtectedLayout({
    children,
}: {
    children: ReactNode
}) {
    return (
        <div className="min-h-screen bg-surface/50">
            <RequireAuth>
            <AppHeader />
            <div className="flex">
                {/*<Sidebar />*/}
                <main className="min-w-0 flex-1 p-6 md:p-8">
                    {children}
                </main>
            </div>
            </RequireAuth>
        </div>
    )
}