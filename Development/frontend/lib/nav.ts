import { CalendarDays, FileText, LayoutDashboard, ScrollText } from "lucide-react";

export const NAV_ITEMS = [
    { label: "Dashboard", href: "/dashboard", Icon: LayoutDashboard },
    { label: "My leases", href: "/lease", Icon: FileText },
    { label: "Notices", href: "/notices", Icon: ScrollText },
    { label: "Timeline", href: "/timeline", Icon: CalendarDays },
];

export function isActive(pathname: string, href: string) {
    if (href === "/lease") return pathname === "/lease" || (pathname.startsWith("/lease/") && !pathname.startsWith("/lease/new") && !pathname.startsWith("/lease/try"));
    return pathname === href || pathname.startsWith(`${href}/`);
}

export function initialsOf(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}