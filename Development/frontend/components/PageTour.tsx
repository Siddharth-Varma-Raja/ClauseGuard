"use client";

import { useEffect, useState } from "react";
import { CircleHelp } from "lucide-react";
import GuidedTour, { hasSeenTour } from "@/components/GuidedTour";
import { TourStep } from "@/lib/tours";

export default function PageTour({ tourId, steps, floating = false }: { tourId: string; steps: TourStep[]; floating?: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (hasSeenTour(tourId)) return;
    const timer = setTimeout(() => setOpen(true), 400);
    return () => clearTimeout(timer);
  }, [tourId]);

  return (
    <>
      <button
        data-tour="tour-button"
        onClick={() => setOpen(true)}
        className={
          floating
            ? "fixed bottom-6 right-6 z-40 inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold text-brand-dark shadow-lg hover:bg-brand-soft"
            : "inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold text-brand-dark shadow-sm hover:bg-brand-soft"
        }
      >
        <CircleHelp size={17} className="text-brand" />
        Take the tour
      </button>
      {open && <GuidedTour tourId={tourId} steps={steps} onClose={() => setOpen(false)} />}
    </>
  );
}
