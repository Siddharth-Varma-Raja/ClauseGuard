"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { Clause } from "@/lib/notice-types";
import { STATUS } from "@/lib/status";
import { cn } from "@/lib/cn";

type Marker = { clause: Clause; top: number; height: number };
export default function LeaseScrollBar({
  scrollRef,
  clauses,
  selectedId,
  measureKey,
  onSelect,
}: {
  scrollRef: RefObject<HTMLDivElement | null>;
  clauses: Clause[];
  selectedId: string | null;
  measureKey: string;
  onSelect: (clause: Clause) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [thumb, setThumb] = useState({ top: 0, height: 1 });

  const clausesRef = useRef(clauses);
  useEffect(() => {
    clausesRef.current = clauses;
  });

  useEffect(() => {
    const box = scrollRef.current;
    if (!box) return;

    function updateThumb() {
      if (!box) return;
      setThumb({ top: box.scrollTop / box.scrollHeight, height: box.clientHeight / box.scrollHeight });
    }

    function measure() {
      if (!box) return;
      const boxTop = box.getBoundingClientRect().top;
      const found: Marker[] = [];
      for (const clause of clausesRef.current) {
        if (clause.status !== "red" && clause.status !== "amber") continue;
        const el = document.getElementById(`clause-${clause.id}`);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        found.push({
          clause,
          top: (rect.top - boxTop + box.scrollTop) / box.scrollHeight,
          height: rect.height / box.scrollHeight,
        });
      }
      setMarkers(found);
      updateThumb();
    }

    const observer = new ResizeObserver(measure);
    observer.observe(box);
    if (box.firstElementChild) observer.observe(box.firstElementChild);
    box.addEventListener("scroll", updateThumb, { passive: true });
    return () => {
      observer.disconnect();
      box.removeEventListener("scroll", updateThumb);
    };
  }, [scrollRef, measureKey]);

  function startDrag(event: React.PointerEvent<HTMLDivElement>) {
    const box = scrollRef.current;
    const track = trackRef.current;
    if (!box || !track) return;
    event.preventDefault();
    event.stopPropagation();
    const startY = event.clientY;
    const startScroll = box.scrollTop;
    const ratio = box.scrollHeight / track.clientHeight;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);

    function move(e: PointerEvent) {
      if (box) box.scrollTop = startScroll + (e.clientY - startY) * ratio;
    }
    function stop() {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", stop);
      target.removeEventListener("pointercancel", stop);
    }
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", stop);
    target.addEventListener("pointercancel", stop);
  }

  function jumpTo(event: React.MouseEvent<HTMLDivElement>) {
    const box = scrollRef.current;
    const track = trackRef.current;
    if (!box || !track) return;
    const fraction = (event.clientY - track.getBoundingClientRect().top) / track.clientHeight;
    box.scrollTo({ top: fraction * box.scrollHeight - box.clientHeight / 2, behavior: "smooth" });
  }

  const scrollable = thumb.height < 0.999;
  if (!scrollable && markers.length === 0) return null;

  return (
    <div
      data-tour="scroll-markers"
      className="relative hidden w-5 shrink-0 lg:block"
      title={markers.length ? `${markers.length} ${markers.length === 1 ? "issue" : "issues"} on this page` : undefined}
    >
      <div
        ref={trackRef}
        onClick={jumpTo}
        className="absolute inset-0 cursor-pointer rounded-full border border-line bg-white shadow-[inset_0_1px_2px_rgb(10_59_67/0.06)]"
      >
        {scrollable && (
          <div
            onPointerDown={startDrag}
            onClick={(e) => e.stopPropagation()}
            role="scrollbar"
            aria-label="Scroll the lease"
            aria-controls="lease-scroll"
            aria-orientation="vertical"
            aria-valuenow={Math.round((thumb.top / Math.max(1 - thumb.height, 0.0001)) * 100)}
            className="absolute inset-x-[3px] z-10 min-h-7 cursor-grab rounded-full bg-brand shadow-sm transition-colors hover:bg-brand-dark active:cursor-grabbing active:bg-brand-dark"
            style={{ top: `${thumb.top * 100}%`, height: `${thumb.height * 100}%` }}
          />
        )}

        {markers.map(({ clause, top, height }) => {
          const style = STATUS[clause.status];
          const selected = clause.id === selectedId;
          const label = `Clause ${clause.number}, ${clause.title}: ${style.label}`;
          return (
            <button
              key={clause.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(clause);
              }}
              title={label}
              aria-label={`Jump to ${label}`}
              className="group absolute inset-x-0 z-20 grid h-3 -translate-y-1/2 cursor-pointer place-items-center"
              style={{ top: `${(top + height / 2) * 100}%` }}
            >
              <span
                className={cn(
                  "block rounded-full transition-all duration-200",
                  style.solid,
                  "ring-1 ring-white",
                  selected
                    ? "h-[5px] w-[calc(100%+6px)] ring-2"
                    : "h-[3px] w-[calc(100%-6px)] group-hover:h-[5px] group-hover:w-full",
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}