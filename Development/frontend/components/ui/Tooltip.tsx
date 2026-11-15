import { cn } from "@/lib/cn";

type TooltipProps = {
    text: string;
    side?: "top" | "bottom" | "left" | "right";
    className?: string;
    children: React.ReactNode;
};

const PLACE = {
    top: "bottom-full left-1/2 mb-2 -translate-x-1/2 translate-y-1 group-hover/tip:translate-y-0 group-focus-within/tip:translate-y-0",
    bottom: "top-full left-1/2 mt-2 -translate-x-1/2 -translate-y-1 group-hover/tip:translate-y-0 group-focus-within/tip:translate-y-0",
    left: "right-full top-1/2 mr-2 -translate-y-1/2 translate-x-1 group-hover/tip:translate-x-0 group-focus-within/tip:translate-x-0",
    right: "left-full top-1/2 ml-2 -translate-y-1/2 -translate-x-1 group-hover/tip:translate-x-0 group-focus-within/tip:translate-x-0",
};

const ARROW = {
    top: "left-1/2 top-full -translate-x-1/2 border-t-ink",
    bottom: "left-1/2 bottom-full -translate-x-1/2 border-b-ink",
    left: "top-1/2 left-full -translate-y-1/2 border-l-ink",
    right: "top-1/2 right-full -translate-y-1/2 border-r-ink",
};

export default function Tooltip({ text, side = "top", className, children }: TooltipProps) {
    return (
        <span className={cn("group/tip relative inline-flex", className)}>
            {children}

            <span
                role="tooltip"
                className={cn(
                    "pointer-events-none absolute z-50 w-max max-w-60 rounded-lg bg-ink px-2.5 py-1.5 text-center font-sans text-xs font-medium normal-case leading-snug tracking-normal text-white opacity-0 shadow-lg ring-1 ring-white/25 transition duration-150 group-focus-within/tip:opacity-100 group-hover/tip:opacity-100",
                    PLACE[side],
                )}
            >
                {text}
                <span className={cn("absolute border-4 border-transparent", ARROW[side])} />
            </span>
        </span>
    );
}