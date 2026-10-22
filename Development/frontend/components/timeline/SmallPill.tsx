import { cn } from "@/lib/cn";

export default function SmallPill({
    brand,
    children
}: {
    brand?: boolean;
    children: React.ReactNode;
}) {
    return (
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", brand ? "bg-brand-soft text-brand-dark" : "bg-surface text-mute")}>
            {children}
        </span>
    )
}
