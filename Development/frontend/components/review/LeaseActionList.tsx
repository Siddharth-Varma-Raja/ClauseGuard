"use client";

import { useId, useState } from "react";
import { Ban, ChevronDown, DoorOpen, Euro, Flag, Handshake, House, KeyRound, ListChecks, Printer, ReceiptText, SearchX } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Tooltip from "@/components/ui/Tooltip";
import type { ActionGroup, ActionItem, ActionList, Clause } from "@/lib/notice-types";
import { actionGroups, clauseFor, clauseNumber } from "@/lib/actionList";
import { clauseTopic } from "@/lib/topics";
import { cn } from "@/lib/cn";

const VISIBLE = 5;

const ICONS: Record<ActionGroup, LucideIcon> = {
  tenant_must: ListChecks,
  not_allowed: Ban,
  charges: Euro,
  landlord_must: House,
  landlord_may: KeyRound,
  tenant_may: Handshake,
  ending_lease: DoorOpen,
  unpaid_rent: ReceiptText,
};

function printCard() {
  const done = () => {
    document.body.classList.remove("print-one");
    window.removeEventListener("afterprint", done);
  };
  window.addEventListener("afterprint", done);
  document.body.classList.add("print-one");
  window.print();
}

function Row({
  item,
  clause,
  onView,
  onCorrect,
}: {
  item: ActionItem;
  clause: Clause | undefined;
  onView: (clause: Clause) => void;
  onCorrect?: (clause: Clause) => void;
}) {
  const number = clauseNumber(item.clause);
  return (
    <>
      <p className="min-w-0 text-[15px] leading-relaxed text-ink">{item.quote}</p>
      <div className="flex items-center gap-2 sm:contents">
        <span className="sm:self-center">
          {clause ? (
            <button
              type="button"
              onClick={() => onView(clause)}
              className="cursor-pointer whitespace-nowrap rounded text-sm font-semibold text-brand underline underline-offset-[3px] hover:text-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Clause {number}
            </button>
          ) : (
            <span className="whitespace-nowrap text-sm text-mute">Clause {number}</span>
          )}
        </span>
        <span className="ml-auto flex items-center gap-1.5 sm:ml-0 sm:justify-end sm:self-center print:hidden">
          {clause && (
            <button
              type="button"
              onClick={() => onView(clause)}
              aria-label={`View clause ${number}`}
              className="inline-flex min-h-9 cursor-pointer items-center rounded-xl border border-line bg-white px-3.5 text-sm font-semibold text-brand-dark hover:border-brand hover:bg-brand-soft"
            >
              View
            </button>
          )}
          {clause && onCorrect && clauseTopic(clause) && (
            <Tooltip text="Send a correction" side="left">
              <button
                type="button"
                onClick={() => onCorrect(clause)}
                aria-label={`Send a correction for clause ${number}`}
                className="grid size-9 cursor-pointer place-items-center rounded-xl text-mute hover:bg-surface hover:text-brand-dark"
              >
                <Flag size={16} aria-hidden />
              </button>
            </Tooltip>
          )}
        </span>
      </div>
    </>
  );
}

function Group({
  label,
  Icon,
  items,
  startOpen,
  find,
  onView,
  onCorrect,
}: {
  label: string;
  Icon: LucideIcon;
  items: ActionItem[];
  startOpen: boolean;
  find: (item: ActionItem) => Clause | undefined;
  onView: (clause: Clause) => void;
  onCorrect?: (clause: Clause) => void;
}) {
  const [open, setOpen] = useState(startOpen);
  const [all, setAll] = useState(false);
  const id = useId();
  const hidden = Math.max(0, items.length - VISIBLE);

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white break-inside-avoid">
      <h3>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls={id}
          className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
            <Icon size={16} aria-hidden />
          </span>
          <span className="flex-1 font-semibold text-ink">{label}</span>
          <span className="rounded-full bg-brand-dark px-2.5 py-0.5 text-xs font-bold tabular-nums text-white" aria-label={`${items.length} items`}>
            {items.length}
          </span>
          <ChevronDown size={18} aria-hidden className={cn("shrink-0 text-mute transition-transform print:hidden", open && "rotate-180")} />
        </button>
      </h3>

      <div id={id} className={cn("border-t border-line", !open && "hidden print:block")}>
        <div className="hidden grid-cols-[minmax(0,1fr)_96px_132px] gap-x-4 bg-surface/70 px-4 py-2 text-xs font-bold uppercase tracking-wide text-mute sm:grid">
          <span>What your lease says</span>
          <span>Clause</span>
          <span className="sr-only">Actions</span>
        </div>
        <ul className="divide-y divide-line">
          {items.map((item, i) => (
            <li
              key={`${clauseNumber(item.clause)}-${i}`}
              className={cn(
                "flex flex-col gap-2 px-4 py-3 sm:grid sm:grid-cols-[minmax(0,1fr)_96px_132px] sm:gap-x-4",
                i >= VISIBLE && !all && "hidden print:grid",
              )}
            >
              <Row item={item} clause={find(item)} onView={onView} onCorrect={onCorrect} />
            </li>
          ))}
        </ul>
        {hidden > 0 && (
          <div className="border-t border-line px-4 py-2.5 print:hidden">
            <button type="button" onClick={() => setAll(!all)} aria-expanded={all} className="cursor-pointer text-sm font-semibold text-brand hover:underline">
              {all ? "Show fewer" : `Show ${hidden} more`}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default function LeaseActionList({
  actionList,
  clauses,
  onView,
  onCorrect,
  showHeader = true,
}: {
  actionList: ActionList;
  clauses: Clause[];
  onView: (clause: Clause) => void;
  onCorrect?: (clause: Clause) => void;
  showHeader?: boolean;
}) {
  const groups = actionGroups(actionList);
  const find = (item: ActionItem) => clauseFor(item, clauses);

  return (
    <section aria-labelledby="lease-actions-title" className="print-target rounded-3xl border border-line bg-white p-5 shadow-soft sm:p-6">
      <div className={cn("flex flex-wrap items-start justify-between gap-3", !showHeader && "sr-only")}>
        <div className="min-w-0">
          <h2 id="lease-actions-title" className="font-display text-2xl font-semibold text-brand-dark">
            Your action list
          </h2>
          <p className="mt-1 text-sm text-mute">Built from your lease using fixed rules. No AI reads your lease for this.</p>
        </div>
        {groups.length > 0 && (
          <button
            type="button"
            onClick={printCard}
            className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-line bg-white px-4 text-sm font-semibold text-brand-dark shadow-soft hover:border-brand hover:bg-brand-soft print:hidden"
          >
            <Printer size={15} aria-hidden />
            Print
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <div className={cn("flex flex-col items-center rounded-2xl border border-dashed border-neu-line bg-surface/60 px-6 py-10 text-center", showHeader && "mt-4")}>
          <span className="grid size-12 place-items-center rounded-full bg-brand-soft text-brand">
            <SearchX size={22} aria-hidden />
          </span>
          <p className="mt-3 font-semibold text-ink">We couldn't find any actions in this lease.</p>
        </div>
      ) : (
        <div className={cn("space-y-3", showHeader && "mt-4")}>
          {groups.map((g) => (
            <Group key={g.key} label={g.label} Icon={ICONS[g.key]} items={g.items} startOpen={g.open} find={find} onView={onView} onCorrect={onCorrect} />
          ))}
        </div>
      )}

      {groups.length > 0 && onCorrect && (
        <p className="mt-4 flex items-center gap-2 border-t border-line pt-4 text-sm text-mute print:hidden">
          <Flag size={15} aria-hidden className="shrink-0" />
          Does something look wrong? Select the flag on a row to send a correction for that clause.
        </p>
      )}
    </section>
  );
}
