import AppHeader from "@/components/AppHeader"
import Sidebar from "@/components/Sidebar"

export default function ProtectedLayout({
    children,}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-[var(--background)]">
            <AppHeader />
            <Sidebar />
        </div>
    )
}