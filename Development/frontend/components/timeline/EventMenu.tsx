"use client";

import { useEffect, useRef, useState } from "react";
import { Ellipsis, Pencil, Trash2 } from "lucide-react";
import type { TimelineEvent } from "@/lib/notice-types";
import { cn } from "@/lib/cn";

export type EventActions = {
  onEdit: (event: TimelineEvent) => void;
  onExport: (event: TimelineEvent) => void;
  onToggleDone: (event: TimelineEvent) => void;
  onDelete: (event: TimelineEvent) => void;
};

const itemClass = "flex w-full cursor-pointer items-center gap-2.5 px-3 py-1.5 text-left hover:bg-surface";

export default function EventMenu({ event, actions, className }: { event: TimelineEvent; actions: EventActions; className?: string }) {
  const [open, setOpen] = useState(false);
  const [upward, setUpward] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function run(action: (event: TimelineEvent) => void) {
    setOpen(false);
    action(event);
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={(e) => {
          setUpward(window.innerHeight - e.currentTarget.getBoundingClientRect().bottom < 120);
          setOpen((v) => !v);
        }}
        aria-label={`More options for "${event.title}"`}
        aria-expanded={open}
        aria-haspopup="menu"
        className="grid size-8 cursor-pointer place-items-center rounded-lg text-mute hover:bg-surface hover:text-ink"
      >
        <Ellipsis size={16} />
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute right-0 z-30 w-40 rounded-xl border border-line bg-white py-1.5 text-[13.5px] shadow-xl",
            upward ? "bottom-full mb-1" : "top-full mt-1",
          )}
        >
          <button role="menuitem" type="button" onClick={() => run(actions.onEdit)} className={itemClass}>
            <Pencil size={15} className="text-mute" aria-hidden />
            Edit date
          </button>
          <button role="menuitem" type="button" onClick={() => run(actions.onDelete)} className={cn(itemClass, "text-bad hover:bg-bad-bg")}>
            <Trash2 size={15} aria-hidden />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
