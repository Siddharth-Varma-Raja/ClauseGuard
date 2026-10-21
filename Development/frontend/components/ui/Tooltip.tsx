type TooltipProps = {
    text: string;
    children: React.ReactNode;
};

export default function Tooltip({ text, children }: TooltipProps) {
    return (
        <span className="group/tip relative inline-flex">
            {children}

            <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-max max-w-60 -translate-x-1/2 translate-y-1 rounded-lg bg-ink px-2.5 py-1.5 ring-1 ring-white/25 text-center font-sans text-xs font-medium leading-snug text-white opacity-0 shadow-lg transition duration-150 group-focus-within/tip:translate-y-0 group-focus-within/tip:opacity-100 group-hover/tip:translate-y-0 group-hover/tip:opacity-100"
            >
                {text}
                <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-ink" />
            </span>
        </span>
    );
}