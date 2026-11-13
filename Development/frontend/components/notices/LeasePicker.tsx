"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, House, HousePlus } from "lucide-react";
import { euro, fmtDate } from "@/lib/format";

export type NoticeLease = {
  id: string;
  address: string;
  tenancyStart: string | null;
  monthlyRent: number | null;
};

export const NO_LEASE = "none";

export function leaseDetails(lease: NoticeLease) {
  const parts = [lease.monthlyRent ? `Rent ${euro(lease.monthlyRent)}` : "", lease.tenancyStart ? `started ${fmtDate(lease.tenancyStart)}` : ""].filter(Boolean);
  return parts.length ? parts.join(" · ") : "No rent or start date found in this lease";
}

export default function LeasePicker({ leases, value, onChange }: { leases: NoticeLease[]; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const chosen = leases.find((lease) => lease.id === value);

  useEffect(() => {
    if (!open) return;
    function close(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const options = [
    ...leases.map((lease) => ({ id: lease.id, title: lease.address, subtitle: leaseDetails(lease) })),
    { id: NO_LEASE, title: "Not about one of my leases", subtitle: "You'll fill in the details yourself" },
  ];
  const current = options.find((option) => option.id === value);

  function pick(next: string) {
    onChange(next);
    setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-14 w-full cursor-pointer items-center gap-3 rounded-xl border bg-white px-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
          open || chosen ? "border-brand shadow-[0_0_0_3px_rgb(14_85_96/0.12)]" : "border-[#cfdcde] hover:border-brand/40"
        }`}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
          {value === NO_LEASE ? <HousePlus size={16} aria-hidden /> : <House size={16} aria-hidden />}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className={`block truncate text-sm font-semibold ${current ? "text-ink" : "text-mute"}`}>{current ? current.title : "Choose a lease"}</span>
          <span className="block truncate text-xs text-mute">{current ? current.subtitle : "We'll fill in your rent and start date"}</span>
        </span>
        <ChevronDown size={17} aria-hidden className={`shrink-0 text-mute transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul role="listbox" aria-label="Your leases" className="absolute inset-x-0 bottom-full z-20 mb-2 max-h-64 overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-soft">
          {options.map((option) => (
            <li key={option.id} role="option" aria-selected={option.id === value}>
              <button
                type="button"
                onClick={() => pick(option.id)}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-surface ${option.id === value ? "bg-brand-soft/60" : ""}`}
              >
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-sm font-semibold text-ink">{option.title}</span>
                  <span className="block truncate text-xs text-mute">{option.subtitle}</span>
                </span>
                {option.id === value && <Check size={16} aria-hidden className="shrink-0 text-brand" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
