"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

type BottomSheetProps = {
    open: boolean;
    title: string;
    onClose: () => void;
    className?: string;
    children: React.ReactNode;
};

export default function BottomSheet({ open, title, onClose, className, children }: BottomSheetProps) {
    useEffect(() => {
        if (!open) return;
        const before = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        function onKey(event: KeyboardEvent) {
            if (event.key === "Escape") onClose();
        }
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = before;
            window.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={title}>
            <button type="button" aria-label="Close" tabIndex={-1} onClick={onClose} className="absolute inset-0 animate-fade-in cursor-default bg-ink/40" />
            <div className={cn("absolute inset-x-0 bottom-0 mx-auto flex max-h-[88dvh] w-full max-w-xl animate-sheet-up flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl md:max-w-none", className)}>
                <div className="relative flex h-12 shrink-0 justify-center pt-2.5">
                    <span className="h-1.5 w-10 rounded-full bg-line" aria-hidden />
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="absolute right-2 top-0.5 grid size-[45px] cursor-pointer place-items-center rounded-full text-mute hover:bg-surface hover:text-ink"
                    >
                        <X size={20} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}
