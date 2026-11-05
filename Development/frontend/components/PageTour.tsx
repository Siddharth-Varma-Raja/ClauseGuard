"use client";

import { useEffect, useState } from "react";
import { CircleHelp } from "lucide-react";
import GuidedTour, { hasSeenTour } from "@/components/GuidedTour";
import { TourStep } from "@/lib/tours";

export const START_TOUR = "clauseguard-start-tour";
export const TOUR_READY = "clauseguard-tour-ready";
export const TOUR_GONE = "clauseguard-tour-gone";

export default function PageTour({ tourId, steps, showButton = false, autoStart = true }: { tourId: string; steps: TourStep[]; showButton?: boolean; autoStart?: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!autoStart || hasSeenTour(tourId)) return;
    const timer = setTimeout(() => setOpen(true), 400);
    return () => clearTimeout(timer);
  }, [tourId, autoStart]);

  useEffect(() => {
    const start = () => setOpen(true);
    window.addEventListener(START_TOUR, start);
    window.dispatchEvent(new Event(TOUR_READY));
    return () => {
      window.removeEventListener(START_TOUR, start);
      window.dispatchEvent(new Event(TOUR_GONE));
    };
  }, []);

  return (
    <>
      {showButton && (
        <button
          data-tour="tour-button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 text-sm font-medium text-white hover:bg-white/10"
        >
          <CircleHelp size={17} className="text-white/80" />
          Take the tour
        </button>
      )}
      {open && <GuidedTour tourId={tourId} steps={steps} onClose={() => setOpen(false)} />}
    </>
  );
}
