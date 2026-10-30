import Link from "next/link";
import { ArrowRight, CalendarClock, CircleCheckBig, Euro, FileWarning, House, ListChecks, ShieldCheck, TriangleAlert } from "lucide-react";
import type { DashboardItem } from "@/lib/dashboard";
import { euro, fmtDate, todayIso } from "@/lib/format";
import { cn } from "@/lib/cn";
import CountUp from "./CountUp";

const ACCENT = {
  bad: { text: "text-[#ff9b8f]", stroke: "#ff9b8f" },
  warn: { text: "text-[#f5c451]", stroke: "#f5c451" },
  brand: { text: "text-[#9fd6d6]", stroke: "#9fd6d6" },
  ok: { text: "text-[#7fdca5]", stroke: "#7fdca5" },
};

const NUMBER_FONT = "font-display font-semibold tracking-tight [font-variation-settings:'opsz'_9]";

const LABEL_ICON = {
  deadline: CalendarClock,
  date: CalendarClock,
  review: ListChecks,
  notice: FileWarning,
  deposit: Euro,
  milestone: House,
  setup: CalendarClock,
  clear: ShieldCheck,
};

function Ring({ value, color, big, small }: { value: number; color: string; big: React.ReactNode; small: string }) {
  const length = 2 * Math.PI * 66;
  return (
    <div className="relative grid size-36 shrink-0 place-items-center">
      <svg viewBox="0 0 150 150" className="absolute inset-0 -rotate-90" >
        <circle cx="75" cy="75" r="66" fill="none" stroke="rgb(255 255 255 / 0.14)" strokeWidth="10" />
        <circle
          cx="75"
          cy="75"
          r="66"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={length}
          strokeDashoffset={length * (1 - Math.min(1, Math.max(0.03, value)))}
          className="animate-ring"
          style={{ "--ring-length": length } as React.CSSProperties}
        />
      </svg>
      <div className="text-center">
        <p className={cn(NUMBER_FONT, "leading-none", typeof big === "string" && big.length > 3 ? "text-4xl" : "text-5xl")}>{big}</p>
        <p className="mt-1 text-xs text-white/75">{small}</p>
      </div>
    </div>
  );
}

function Visual({ item }: { item: DashboardItem }) {
  const color = ACCENT[item.tone].stroke;

  if ((item.kind === "deadline" || item.kind === "date") && item.days !== undefined) {
    const big = item.days === 0 ? "Today" : <CountUp value={item.days} />;
    const small = item.days === 0 ? "due" : item.days === 1 ? "day left" : "days left";
    return <Ring value={1 - item.days / 30} color={color} big={big} small={small} />;
  }

  if (item.kind === "review" && item.total) {
    const done = item.done ?? 0;
    return (
      <Ring
        value={done / item.total}
        color={color}
        big={
          <span className="text-4xl">
            <CountUp value={done} />/{item.total}
          </span>
        }
        small="reviewed"
      />
    );
  }

  if (item.kind === "deposit" && item.rent && item.deposit) {
    return (
      <div className="flex w-44 shrink-0 flex-col gap-4">
        <div>
          <p className="text-xs text-white/70">Deposit asked</p>
          <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-white/10">
            <div className="animate-grow h-full rounded-full bg-[#f5c451]" style={{ width: "100%" }} />
          </div>
          <p className={cn(NUMBER_FONT, "mt-1 text-2xl")}>{euro(item.deposit)}</p>
        </div>
        <div>
          <p className="text-xs text-white/70">One month's rent</p>
          <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-white/10">
            <div className="animate-grow h-full rounded-full bg-[#9fd6d6]" style={{ width: `${(item.rent / item.deposit) * 100}%` }} />
          </div>
          <p className={cn(NUMBER_FONT, "mt-1 text-2xl")}>{euro(item.rent)}</p>
        </div>
      </div>
    );
  }

  if (item.kind === "milestone" && item.start && item.end) {
    const total = Date.parse(item.end) - Date.parse(item.start);
    const gone = Date.parse(todayIso()) - Date.parse(item.start);
    const percent = Math.min(100, Math.max(0, (gone / total) * 100));
    return (
      <div className="w-52 shrink-0">
        <div className="relative h-3 rounded-full bg-white/10">
          <div className="animate-grow h-full rounded-full bg-[#9fd6d6]" style={{ width: `${percent}%` }} />
          <span className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-[#9fd6d6] bg-white" style={{ left: `${percent}%` }} />
        </div>
        <div className="mt-2.5 flex justify-between text-xs text-white/70">
          <span>{fmtDate(item.start)}</span>
          <span>{fmtDate(item.end)}</span>
        </div>
      </div>
    );
  }

  const Icon = item.kind === "clear" ? CircleCheckBig : item.tone === "bad" ? TriangleAlert : LABEL_ICON[item.kind];
  return (
    <div className={cn("grid size-36 shrink-0 place-items-center rounded-full bg-white/10", ACCENT[item.tone].text)}>
      <Icon size={60} strokeWidth={1.6}  />
    </div>
  );
}

export default function Spotlight({ item }: { item: DashboardItem }) {
  const LabelIcon = LABEL_ICON[item.kind];

  return (
    <section
      key={item.key}
      data-tour="spotlight"
      className="relative flex flex-col gap-6 overflow-hidden rounded-3xl bg-[radial-gradient(120%_140%_at_100%_0%,#1d6b73_0%,#0a3b43_55%,#082d33_100%)] p-6 text-white shadow-soft sm:flex-row sm:items-center sm:p-7"
    >
      <span className="pointer-events-none absolute -bottom-24 -right-16 size-64 rounded-full bg-white/5"  />
      <div className="relative min-w-0 flex-1">
        <p className={cn("flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest", ACCENT[item.tone].text)}>
          <LabelIcon size={14}  />
          {item.label}
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold leading-tight sm:text-3xl">{item.title}</h2>
        <p className="mt-2 leading-relaxed text-white/80">{item.text}</p>
        <Link
          href={item.href}
          className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-brand-dark transition hover:-translate-y-0.5 hover:bg-brand-soft"
        >
          {item.action}
          <ArrowRight size={16}  />
        </Link>
      </div>
      <div className="relative">
        <Visual item={item} />
      </div>
    </section>
  );
}
