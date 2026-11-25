"use client";

import { useId, useState } from "react";
import { Ban, ChevronDown, ChevronLeft, ChevronRight, DoorOpen, Euro, Flag, Handshake, House, KeyRound, ListChecks, Printer, ReceiptText, SearchX } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Tooltip from "@/components/ui/Tooltip";
import BottomSheet from "@/components/ui/BottomSheet";
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

const HINTS: Record<ActionGroup, string> = {
  tenant_must: "Things you have to do while you live there.",
  not_allowed: "Things the lease says you can't do.",
  charges: "Money you'll pay on top of the rent.",
  landlord_must: "What your landlord has to do.",
  landlord_may: "What your landlord is allowed to do.",
  tenant_may: "What you're allowed to do.",
  ending_lease: "How you or the landlord can end the lease.",
  unpaid_rent: "What happens if the rent is late.",
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
      <p className="min-w-0 text-[15px] leading-relaxed text-ink max-sm:line-clamp-3 print:!line-clamp-none max-sm:font-serif max-sm:text-[#1d2a30]">{item.quote}</p>
      <div className="flex items-center gap-2 sm:contents">
        {clause ? (
          <button
            type="button"
            onClick={() => onView(clause)}
            className="group inline-flex min-h-[45px] cursor-pointer items-center gap-1 rounded-full bg-brand-soft px-3.5 text-sm font-semibold text-brand-dark transition-transform active:scale-95 sm:hidden print:!hidden"
          >
            See clause {number}
            <ChevronRight size={16} aria-hidden className="transition-transform duration-200 group-active:translate-x-0.5" />
          </button>
        ) : (
          <span className="text-sm text-mute sm:hidden print:!hidden">Clause {number}</span>
        )}
        <span className="max-sm:hidden sm:self-center print:!inline">
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
              className="max-sm:hidden inline-flex min-h-9 cursor-pointer items-center rounded-xl border border-line bg-white px-3.5 text-sm font-semibold text-brand-dark hover:border-brand hover:bg-brand-soft"
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
                className="grid size-9 cursor-pointer place-items-center rounded-xl text-mute transition-transform hover:bg-surface hover:text-brand-dark active:scale-90 max-sm:size-[45px]"
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
  delay,
  groupKey,
  label,
  Icon,
  items,
  open,
  onToggle,
  find,
  onView,
  onCorrect,
}: {
  delay: number;
  groupKey: ActionGroup;
  label: string;
  Icon: LucideIcon;
  items: ActionItem[];
  open: boolean;
  onToggle: () => void;
  find: (item: ActionItem) => Clause | undefined;
  onView: (clause: Clause) => void;
  onCorrect?: (clause: Clause) => void;
}) {
  const [all, setAll] = useState(false);
  const id = useId();
  const hidden = Math.max(0, items.length - VISIBLE);

  return (
    <section id={`group-${groupKey}`} style={{ animationDelay: `${Math.min(delay, 6) * 60}ms` }} className="animate-fade-up scroll-mt-24 overflow-hidden rounded-2xl print:!animate-none border border-line bg-white break-inside-avoid max-sm:shadow-soft">
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={id}
          className="flex min-h-[60px] w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface active:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
        >
          <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg transition-colors duration-300 max-sm:size-10 max-sm:rounded-xl", open ? "bg-brand-dark text-white" : "bg-brand-soft text-brand")}>
            <Icon size={16} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-ink">{label}</span>
          </span>
          <span className="rounded-full bg-brand-dark px-2.5 py-0.5 text-xs font-bold tabular-nums text-white" aria-label={`${items.length} items`}>
            {items.length}
          </span>
          <ChevronDown size={18} aria-hidden className={cn("shrink-0 text-mute transition-transform duration-300 print:hidden", open && "rotate-180")} />
        </button>
      </h3>

      <div className={cn("grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none print:block", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div id={id} inert={!open} className="overflow-hidden">
          <div className="border-t border-line">
            <div className="hidden grid-cols-[minmax(0,1fr)_96px_132px] gap-x-4 bg-surface/70 px-4 py-2 text-xs font-bold uppercase tracking-wide text-mute sm:grid">
              <span>What your lease says</span>
              <span>Clause</span>
              <span className="sr-only">Actions</span>
            </div>
            <ul key={String(open)} className={cn("divide-y divide-line print:[&>li]:!animate-none", open && "row-in")}>
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
                <button type="button" onClick={() => setAll(!all)} aria-expanded={all} className="min-h-[45px] cursor-pointer text-sm font-semibold text-brand hover:underline sm:min-h-0">
                  {all ? "Show fewer" : `Show ${hidden} more`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

type GroupData = ReturnType<typeof actionGroups>[number];

function MobileGroups({
  groups,
  find,
  onView,
  onCorrect,
  spaced,
}: {
  groups: GroupData[];
  find: (item: ActionItem) => Clause | undefined;
  onView: (clause: Clause) => void;
  onCorrect?: (clause: Clause) => void;
  spaced: boolean;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const main = groups.filter((g) => g.open);
  const more = groups.filter((g) => !g.open);
  const current = openIndex === null ? null : groups[openIndex];
  const CurrentIcon = current ? ICONS[current.key] : ListChecks;

  function openGroup(index: number) {
    setExpanded(null);
    setOpenIndex(index);
  }

  function tile(g: GroupData, big: boolean) {
    const Icon = ICONS[g.key];
    const index = groups.indexOf(g);
    return (
      <li key={g.key} style={{ animationDelay: `${Math.min(index, 7) * 60}ms` }} className="animate-fade-up">
        <button
          type="button"
          onClick={() => openGroup(index)}
          className={cn(
            "flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-line bg-white text-left shadow-soft transition-transform active:scale-[0.98]",
            big ? "min-h-[76px] p-4" : "min-h-[60px] px-4 py-3",
          )}
        >
          <span className={cn("grid shrink-0 place-items-center rounded-xl", big ? "size-11 bg-brand-dark text-white" : "size-9 bg-brand-soft text-brand")}>
            <Icon size={big ? 20 : 17} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-ink">{g.label}</span>
            {big && <span className="block text-sm text-mute">{HINTS[g.key]}</span>}
          </span>
          <span className="shrink-0 text-sm text-mute">
            <b className="font-semibold text-ink">{g.items.length}</b>
          </span>
          <ChevronRight size={18} aria-hidden className="shrink-0 text-mute" />
        </button>
      </li>
    );
  }

  return (
    <div className={cn("sm:hidden print:hidden", spaced && "mt-4")}>
      {main.length > 0 && (
        <>
          <h3 className="px-1 text-sm font-semibold text-ink">Start with these</h3>
          <ul className="mt-2 space-y-2.5">{main.map((g) => tile(g, true))}</ul>
        </>
      )}
      {more.length > 0 && (
        <>
          <h3 className="mt-6 px-1 text-sm font-semibold text-ink">Good to know</h3>
          <ul className="mt-2 grid gap-2">{more.map((g) => tile(g, false))}</ul>
        </>
      )}

      <BottomSheet open={current !== null} title={current?.label ?? "Group"} onClose={() => setOpenIndex(null)} className="sm:hidden">
        {current && openIndex !== null && (
          <>
            <div key={current.key} className="flex animate-fade-up items-center gap-3 px-5 pb-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-dark text-white">
                <CurrentIcon size={20} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="font-display text-xl font-semibold leading-tight text-brand-dark">{current.label}</p>
                <p className="text-sm text-mute">{HINTS[current.key]}</p>
              </div>
            </div>
            <ul key={`${current.key}-list`} className="row-in min-h-0 flex-1 space-y-2.5 overflow-y-auto bg-surface px-4 py-4">
              {current.items.map((item, i) => {
                const clause = find(item);
                const number = clauseNumber(item.clause);
                const isOpen = expanded === i;
                return (
                  <li key={`${number}-${i}`} className="rounded-2xl border border-line bg-white p-4">
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : i)}
                      aria-expanded={isOpen}
                      className="block w-full cursor-pointer text-left"
                    >
                      <span className={cn("font-serif text-[15px] leading-relaxed text-[#1d2a30]", isOpen ? "block" : "line-clamp-2")}>{item.quote}</span>
                      <span className="mt-1 block text-xs font-semibold text-brand">{isOpen ? "Show less" : "Read more"}</span>
                    </button>
                    <div className="mt-2 flex items-center gap-2">
                      {clause ? (
                        <button
                          type="button"
                          onClick={() => {
                            setOpenIndex(null);
                            onView(clause);
                          }}
                          className="group inline-flex min-h-[45px] cursor-pointer items-center gap-1 rounded-full bg-brand-soft px-3.5 text-sm font-semibold text-brand-dark transition-transform active:scale-95"
                        >
                          See clause {number}
                          <ChevronRight size={16} aria-hidden className="transition-transform duration-200 group-active:translate-x-0.5" />
                        </button>
                      ) : (
                        <span className="text-sm text-mute">Clause {number}</span>
                      )}
                      {clause && onCorrect && clauseTopic(clause) && (
                        <button
                          type="button"
                          onClick={() => {
                            setOpenIndex(null);
                            onCorrect(clause);
                          }}
                          aria-label={`Send a correction for clause ${number}`}
                          className="ml-auto grid size-[45px] cursor-pointer place-items-center rounded-full text-mute transition-transform active:scale-90"
                        >
                          <Flag size={16} aria-hidden />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center gap-2 border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => openGroup(openIndex - 1)}
                disabled={openIndex === 0}
                className="flex min-h-12 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1 rounded-full px-3 border border-line text-sm font-semibold text-brand-dark transition-transform active:scale-95 disabled:cursor-default disabled:opacity-35"
              >
                <ChevronLeft size={18} aria-hidden />
                <span className="truncate">{openIndex > 0 ? groups[openIndex - 1].label : "Previous"}</span>
              </button>
              <button
                type="button"
                onClick={() => openGroup(openIndex + 1)}
                disabled={openIndex === groups.length - 1}
                className="flex min-h-12 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1 rounded-full px-3 bg-brand-dark text-sm font-semibold text-white transition-transform active:scale-95 disabled:cursor-default disabled:opacity-35"
              >
                <span className="truncate">{openIndex < groups.length - 1 ? groups[openIndex + 1].label : "Next"}</span>
                <ChevronRight size={18} aria-hidden />
              </button>
            </div>
          </>
        )}
      </BottomSheet>
    </div>
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
  const [openKeys, setOpenKeys] = useState<ActionGroup[]>(() => groups.filter((g) => g.open).map((g) => g.key));

  function toggle(key: ActionGroup) {
    setOpenKeys((keys) => (keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key]));
  }

  return (
    <section aria-labelledby="lease-actions-title" className="print-target sm:rounded-3xl sm:border sm:border-line sm:bg-white sm:p-6 sm:shadow-soft">
      <div className={cn("flex items-start justify-between gap-3 max-sm:px-1 sm:flex-wrap", !showHeader && "sr-only")}>
        <div className="min-w-0">
          <h2 id="lease-actions-title" className="font-display text-xl font-semibold text-brand-dark sm:text-2xl">
            Your action list
          </h2>
          <p className="mt-1 text-sm text-mute">Built from your lease using fixed rules. No AI reads your lease for this.</p>
        </div>
        {groups.length > 0 && (
          <button
            type="button"
            onClick={printCard}
            aria-label="Print action list"
            className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-line bg-white px-4 text-sm font-semibold text-brand-dark shadow-soft transition-transform hover:border-brand hover:bg-brand-soft active:scale-95 max-sm:size-[45px] max-sm:justify-center max-sm:px-0 print:hidden"
          >
            <Printer size={15} aria-hidden />
            <span className="max-sm:hidden">Print</span>
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
        <>
          <MobileGroups groups={groups} find={find} onView={onView} onCorrect={onCorrect} spaced={showHeader} />
          <div className={cn("space-y-3 max-sm:hidden print:!block", showHeader && "mt-4")}>
            {groups.map((g, index) => (
              <Group key={g.key} delay={index} groupKey={g.key} label={g.label} Icon={ICONS[g.key]} items={g.items} open={openKeys.includes(g.key)} onToggle={() => toggle(g.key)} find={find} onView={onView} onCorrect={onCorrect} />
            ))}
          </div>
        </>
      )}

      {groups.length > 0 && onCorrect && (
        <p className="mt-4 flex items-start gap-2 border-t border-line pt-4 text-sm text-mute max-sm:px-1 print:hidden">
          <Flag size={15} aria-hidden className="mt-0.5 shrink-0" />
          Does something look wrong? Select the flag on a row to send a correction for that clause.
        </p>
      )}
    </section>
  );
}