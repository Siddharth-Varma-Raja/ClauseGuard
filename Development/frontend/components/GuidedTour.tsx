"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { TourStep } from "@/lib/tours";
import { cn } from "@/lib/cn";

type Box = { top: number; left: number; width: number; height: number };

const PADDING = 8; 
const GAP = 14;
const MASK_COLOUR = "rgb(8 28 33 / 0.62)";

const storageKey = (tourId: string) => `clauseguard-tour-${tourId}`;

export function hasSeenTour(tourId: string) {
  try {
    return localStorage.getItem(storageKey(tourId)) === "yes";
  } catch {
    return false;
  }
}

function markTourSeen(tourId: string) {
  try {
    localStorage.setItem(storageKey(tourId), "yes");
  } catch {
    // ignore: the tour will just show again next time
  }
}

export default function GuidedTour({
  tourId,
  steps,
  onClose,
}: {
  tourId: string;
  steps: TourStep[];
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  const step = steps[index];
  const isLast = index === steps.length - 1;

  function finish() {
    markTourSeen(tourId);
    onClose();
  }

  useEffect(() => {
    if (!step) return;
    nextButtonRef.current?.focus();
    const element = document.querySelector(`[data-tour="${step.target}"]`);

    if (!element) {
      const frame = requestAnimationFrame(() => setBox(null));
      return () => cancelAnimationFrame(frame);
    }

    element.scrollIntoView({ behavior: "smooth", block: "center" });

    function measure() {
      const rect = element!.getBoundingClientRect();
      setBox({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    }

    const frame = requestAnimationFrame(measure);
    window.addEventListener("scroll", measure, true); 
    window.addEventListener("resize", measure);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [step]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") finish();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!step) return null;

  const cardWidth = Math.min(360, window.innerWidth - 32);
  let cardStyle: React.CSSProperties = { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  if (box) {
    const left = Math.min(Math.max(box.left, 16), window.innerWidth - cardWidth - 16);
    const spaceBelow = window.innerHeight - (box.top + box.height);
    if (spaceBelow > 250) cardStyle = { left, top: box.top + box.height + PADDING + GAP };
    else if (box.top > 250) cardStyle = { left, bottom: window.innerHeight - box.top + PADDING + GAP };
    else cardStyle = { left, bottom: 16 };
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Guided tour" className="fixed inset-0 z-[100]">
      {box ? (
        <div
          className="pointer-events-none absolute rounded-2xl ring-2 ring-white/90 transition-all duration-300 ease-out"
          style={{
            top: box.top - PADDING,
            left: box.left - PADDING,
            width: box.width + PADDING * 2,
            height: box.height + PADDING * 2,
            boxShadow: `0 0 0 9999px ${MASK_COLOUR}`,
          }}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: MASK_COLOUR }} />
      )}

      <div className="absolute inset-0" />
      <div
        className="absolute rounded-3xl bg-white p-5 text-ink shadow-2xl transition-all duration-300 ease-out"
        style={{ width: cardWidth, ...cardStyle }}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold text-brand">
            Step {index + 1} of {steps.length}
          </p>
          <button
            onClick={finish}
            aria-label="Close the tour"
            className="-mr-1 -mt-1 grid size-8 cursor-pointer place-items-center rounded-full text-mute hover:bg-surface"
          >
            <X size={18} />
          </button>
        </div>

        <h2 className="mt-1 font-display text-xl font-semibold text-brand-dark">{step.title}</h2>
        <p className="mt-2 leading-relaxed text-mute">{step.text}</p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex gap-1.5" aria-hidden>
            {steps.map((s, i) => (
              <span
                key={s.target}
                className={cn("h-1.5 rounded-full transition-all", i === index ? "w-5 bg-brand" : "w-1.5 bg-line")}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {index === 0 ? (
              <button onClick={finish} className="cursor-pointer px-2 text-sm font-semibold text-mute hover:text-ink">
                Skip tour
              </button>
            ) : (
              <button
                onClick={() => setIndex(index - 1)}
                className="cursor-pointer rounded-full px-3 py-2 text-sm font-semibold text-brand-dark hover:bg-surface"
              >
                Back
              </button>
            )}
            <button
              ref={nextButtonRef}
              onClick={() => (isLast ? finish() : setIndex(index + 1))}
              className="cursor-pointer rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              {isLast ? "Got it" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
