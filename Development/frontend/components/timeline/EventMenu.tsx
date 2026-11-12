"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarPlus, CircleCheck, Ellipsis, Pencil, Trash2, Undo2 } from "lucide-react";
import type { TimelineEvent } from "@/lib/notice-types";
import { cn } from "@/lib/cn";

export type EventActions = {
  onEdit: (event: TimelineEvent) => void;
  onExport: (event: TimelineEvent) => void;
  onToggleDone: (event: TimelineEvent) => void;
  onDelete: (event: TimelineEvent) => void;
};

export const SOURCE_LINK = {
  notice: { href: "/notices", label: "Open notice" },
  lease: { href: "/lease", label: "Open lease" },
};

const itemClass = "flex w-full cursor-pointer items-center gap-2.5 px-3 py-1.5 text-left hover:bg-surface";

export default function EventMenu({ event, actions, className }: { event: TimelineEvent; actions: EventActions; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const source = event.source && event.source !== "user" ? SOURCE_LINK[event.source] : null;

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
        onClick={() => setOpen((v) => !v)}
        aria-label={`More options for "${event.title}"`}
        aria-expanded={open}
        aria-haspopup="menu"
        className="grid size-8 cursor-pointer place-items-center rounded-lg text-mute hover:bg-surface hover:text-ink"
      >
        <Ellipsis size={16} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-1 w-52 rounded-xl border border-line bg-white py-1.5 text-[13.5px] shadow-xl">
          <button role="menuitem" type="button" onClick={() => run(actions.onEdit)} className={itemClass}>
            <Pencil size={15} className="text-mute" aria-hidden />
            Edit date
          </button>
          <button role="menuitem" type="button" onClick={() => run(actions.onExport)} className={itemClass}>
            <CalendarPlus size={15} className="text-mute" aria-hidden />
            Add to my calendar
          </button>
          {source && (
            <Link role="menuitem" href={source.href} className={itemClass}>
              <ArrowUpRight size={15} className="text-mute" aria-hidden />
              {source.label}
            </Link>
          )}
          <button role="menuitem" type="button" onClick={() => run(actions.onToggleDone)} className={itemClass}>
            {event.done ? <Undo2 size={15} className="text-mute" aria-hidden /> : <CircleCheck size={15} className="text-mute" aria-hidden />}
            {event.done ? "Mark as not done" : "Mark as done"}
          </button>
          <button
            role="menuitem"
            type="button"
            onClick={() => run(actions.onDelete)}
            className={cn(itemClass, "mt-1 border-t border-line pt-2 text-bad hover:bg-bad-bg")}
          >
            <Trash2 size={15} aria-hidden />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
