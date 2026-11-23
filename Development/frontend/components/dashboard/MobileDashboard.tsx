"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CalendarClock, CalendarPlus, ChevronRight, CircleCheck, Euro, FileCheck, FileWarning, House, ListChecks, MessageCircleQuestion, Upload } from "lucide-react";
import { leaseTitle, upcomingEvents } from "@/lib/dashboard";
import { relativeDays, daysUntil } from "@/lib/format";
import type { DashboardItem } from "@/lib/dashboard";
import type { Analysis, TimelineEvent } from "@/lib/notice-types";

const ICON = {
    deadline: CalendarClock,
    date: CalendarClock,
    review: ListChecks,
    notice: FileWarning,
    deposit: Euro,
    milestone: House,
    setup: CalendarPlus,
    clear: CircleCheck,
};

const TONE = {
    bad: "bg-bad-bg text-bad",
    warn: "bg-warn-bg text-warn",
    brand: "bg-brand-soft text-brand-dark",
    ok: "bg-ok-bg text-ok",
};

function sentenceCase(text: string) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function verdict(lease: Analysis) {
    const { red, amber } = lease.counts;
    if (red > 0) return { tone: "bg-bad-bg text-bad", title: "Don’t sign yet", text: `${red} thing${red === 1 ? "" : "s"} in this lease may not be allowed. Fix ${red === 1 ? "it" : "them"} with your landlord first.`, button: "See what to fix" };
    if (amber > 0) return { tone: "bg-warn-bg text-warn", title: "Ask a few questions", text: `${amber} thing${amber === 1 ? "" : "s"} could be clearer. Ask your landlord before you sign.`, button: "See what to ask" };
    return { tone: "bg-ok-bg text-ok", title: "Looks good to sign", text: "We didn’t find anything that breaks Irish tenancy rules.", button: "Open report" };
}

function LeaseCard({ lease }: { lease: Analysis }) {
    const { red, amber, green, grey } = lease.counts;
    const total = Math.max(red + amber + green + grey, 1);
    const result = verdict(lease);

    return (
        <div className="relative flex w-full flex-col overflow-hidden rounded-[2rem] bg-[radial-gradient(120%_120%_at_100%_100%,#1d6b73_0%,#0a3b43_55%,#082d33_100%)] p-6 text-white shadow-[0_20px_40px_-20px_rgb(10_59_67/0.6)]">
            <span className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-white/[0.05]" />
            <p className="relative flex items-center gap-1.5 truncate text-sm text-[#9fd6d6]">
                <House size={15} aria-hidden className="shrink-0" />
                <span>{leaseTitle(lease)}</span>
            </p>

            <h2 className="relative mt-3 font-display text-[28px] font-semibold leading-tight">{result.title}</h2>
            <p className="relative mt-1.5 leading-relaxed text-white/80">{result.text}</p>

            <div className="relative mt-5 flex h-2.5 gap-1 overflow-hidden rounded-full" aria-hidden>
                {red > 0 && <span className="rounded-full bg-[#ff9b8f]" style={{ width: `${(red / total) * 100}%` }} />}
                {amber > 0 && <span className="rounded-full bg-[#f5c451]" style={{ width: `${(amber / total) * 100}%` }} />}
                {green > 0 && <span className="rounded-full bg-[#7fdca5]" style={{ width: `${(green / total) * 100}%` }} />}
                {grey > 0 && <span className="rounded-full bg-white/30" style={{ width: `${(grey / total) * 100}%` }} />}
            </div>
            <p className="relative mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/80">
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#ff9b8f]" />{red} to fix</span>
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#f5c451]" />{amber} to ask</span>
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#7fdca5]" />{green} fine</span>
                {grey > 0 && <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-white/40" />{grey} for info</span>}
            </p>

            <Link href={`/lease/${lease.id}`} className="group relative mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white font-semibold text-brand-dark active:scale-[0.98]">
                {result.button}
                <ArrowRight size={17} aria-hidden className="transition-transform group-hover:translate-x-1" />
            </Link>
        </div>
    );
}

export default function MobileDashboard({
    greetingText,
    leases,
    events,
    items,
}: {
    greetingText: string;
    leases: Analysis[];
    events: TimelineEvent[];
    items: DashboardItem[];
}) {
    const [showAll, setShowAll] = useState(false);
    const sorted = [...leases].sort((a, b) => b.counts.red - a.counts.red || b.counts.amber - a.counts.amber);
    const main = sorted[0];
    const others = sorted.slice(1, 4);
    const next = upcomingEvents(events)[0];
    const upcoming = upcomingEvents(events).filter((event) => !items.slice(0, 3).some((item) => item.key === `event-${event.id}`)).slice(0, 6);
    const shown = showAll ? items : items.slice(0, 3);

    return (
        <div className="md:hidden">
            <div className="animate-fade-up">
                <h1 className="font-display text-[26px] font-semibold leading-tight text-brand-dark">{greetingText}</h1>
                {next && (
                    <p className="mt-1 text-mute">
                        Next date: <span className="font-semibold text-ink">{next.title}</span>, {new Date(`${next.date}T00:00:00`).toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short" })}
                    </p>
                )}
            </div>

            {main && (
                <section aria-label="Your leases" className="mt-5 animate-fade-up [animation-delay:100ms]">
                    {leases.length > 1 && <p className="mb-2 text-sm font-semibold text-mute">Needs your attention most</p>}
                    <LeaseCard lease={main} />

                    {others.length > 0 && (
                        <div className="mt-4 overflow-hidden rounded-3xl bg-white shadow-soft">
                            <p className="px-4 pb-1 pt-4 text-sm font-semibold text-ink">Your other leases</p>
                            <ul className="divide-y divide-line">
                                {others.map((lease) => {
                                    const result = verdict(lease);
                                    return (
                                        <li key={lease.id}>
                                            <Link href={`/lease/${lease.id}`} className="flex items-center gap-3 px-4 py-3.5 active:bg-surface">
                                                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-dark">
                                                    <House size={18} aria-hidden />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate font-semibold text-ink">{leaseTitle(lease)}</span>
                                                    <span className={`mt-1 inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${result.tone}`}>{result.title}</span>
                                                </span>
                                                <ChevronRight size={18} aria-hidden className="shrink-0 text-[#a9babd]" />
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                            {leases.length > 4 && (
                                <Link href="/lease" className="flex min-h-12 items-center justify-center gap-1.5 border-t border-line text-sm font-semibold text-brand">
                                    See all {leases.length} leases
                                    <ArrowRight size={15} aria-hidden />
                                </Link>
                            )}
                        </div>
                    )}
                </section>
            )}

            <section className="mt-8 animate-fade-up [animation-delay:200ms]">
                <div className="flex items-end justify-between">
                    <h2 className="font-display text-xl font-semibold text-brand-dark">Your next steps</h2>
                    {items.length > 0 && <p className="text-sm text-mute">{items.length} in total</p>}
                </div>
                {items.length === 0 ? (
                    <p className="mt-3 rounded-3xl bg-white p-5 text-mute shadow-soft">You’re all done for now.</p>
                ) : (
                    <ol className="mt-3 overflow-hidden rounded-3xl bg-white shadow-soft">
                        {shown.map((item, index) => {
                            const Icon = ICON[item.kind];
                            return (
                                <li key={item.key} className="border-b border-line last:border-0">
                                    <Link href={item.href} className="flex items-center gap-3 px-4 py-4 active:bg-surface">
                                        <span className={`relative grid size-11 shrink-0 place-items-center rounded-2xl ${TONE[item.tone]}`}>
                                            <Icon size={20} aria-hidden />
                                            {index === 0 && <span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-white bg-bad-solid" />}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block font-semibold leading-snug text-ink">{item.title}</span>
                                            <span className="mt-0.5 line-clamp-1 text-sm text-mute">{item.days !== undefined ? sentenceCase(relativeDays(item.days)) : item.text}</span>
                                        </span>
                                        <ChevronRight size={18} aria-hidden className="shrink-0 text-[#a9babd]" />
                                    </Link>
                                </li>
                            );
                        })}
                        {items.length > 3 && (
                            <li>
                                <button type="button" onClick={() => setShowAll(!showAll)} aria-expanded={showAll} className="flex min-h-12 w-full cursor-pointer items-center justify-center text-sm font-semibold text-brand">
                                    {showAll ? "Show fewer" : `Show ${items.length - 3} more`}
                                </button>
                            </li>
                        )}
                    </ol>
                )}
            </section>

            {upcoming.length > 0 && (
                <section className="mt-8 animate-fade-up [animation-delay:300ms]">
                    <div className="flex items-center justify-between">
                        <h2 className="font-display text-xl font-semibold text-brand-dark">Coming up</h2>
                        <Link href="/timeline" className="inline-flex min-h-12 items-center gap-1 text-sm font-semibold text-brand">
                            Timeline
                            <ArrowRight size={15} aria-hidden />
                        </Link>
                    </div>
                    <ul className="-mx-5 flex snap-x gap-3 overflow-x-auto scroll-px-5 px-5 pb-2 [scrollbar-width:none]">
                        {upcoming.map((event) => {
                            const date = new Date(`${event.date}T00:00:00`);
                            const days = daysUntil(event.date);
                            return (
                                <li key={event.id} className="snap-start">
                                    <Link href={`/timeline?date=${event.date}`} className={`flex w-36 flex-col rounded-3xl p-4 shadow-soft ${days <= 7 ? "bg-brand-dark text-white" : "bg-white text-ink"}`}>
                                        <span className={`text-xs font-semibold uppercase ${days <= 7 ? "text-[#9fd6d6]" : "text-brand"}`}>{date.toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short" })}</span>
                                        <span className="mt-2 line-clamp-2 font-semibold leading-snug">{event.title}</span>
                                        <span className={`mt-1 text-sm ${days <= 7 ? "text-white/70" : "text-mute"}`}>{sentenceCase(relativeDays(days))}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}

            <section className="mt-8 animate-fade-up [animation-delay:400ms]">
                <h2 className="font-display text-xl font-semibold text-brand-dark">Something else?</h2>
                <div className="mt-3 overflow-hidden rounded-3xl bg-white shadow-soft">
                    {leases[0] && (
                        <Link href={`/lease/${leases[0].id}`} className="flex items-center gap-3 border-b border-line px-4 py-4">
                            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand-dark"><MessageCircleQuestion size={20} aria-hidden /></span>
                            <span className="min-w-0 flex-1">
                                <span className="block font-semibold text-ink">Ask about a clause</span>
                                <span className="block text-sm text-mute">Get a plain-English answer</span>
                            </span>
                            <ChevronRight size={18} aria-hidden className="text-[#a9babd]" />
                        </Link>
                    )}
                    <Link href="/notices" className="flex items-center gap-3 border-b border-line px-4 py-4">
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand-dark"><FileCheck size={20} aria-hidden /></span>
                        <span className="min-w-0 flex-1">
                            <span className="block font-semibold text-ink">Check a notice</span>
                            <span className="block text-sm text-mute">Rent increase or notice to leave</span>
                        </span>
                        <ChevronRight size={18} aria-hidden className="text-[#a9babd]" />
                    </Link>
                    <Link href="/lease/new" className="flex items-center gap-3 px-4 py-4">
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand-dark"><Upload size={20} aria-hidden /></span>
                        <span className="min-w-0 flex-1">
                            <span className="block font-semibold text-ink">Upload another lease</span>
                            <span className="block text-sm text-mute">Compare a different place</span>
                        </span>
                        <ChevronRight size={18} aria-hidden className="text-[#a9babd]" />
                    </Link>
                </div>
            </section>
        </div>
    );
}