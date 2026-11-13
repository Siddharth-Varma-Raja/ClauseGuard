import { daysBetween, wholeMonthsBetween } from "@/lib/notice-answers";
import { euro, fmtDate } from "@/lib/format";
import type { NoticeType } from "@/lib/notice-types";
import type { Values } from "./NoticeDetails";

type Stat = { value: string; label: string };

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function validDays(from?: string, to?: string) {
  if (!from || !to) return null;
  const days = daysBetween(from, to);
  return Number.isFinite(days) ? days : null;
}

function Stats({ stats }: { stats: Stat[] }) {
  return (
    <div className={`mt-4 grid gap-px overflow-hidden rounded-xl bg-white/10 text-center ${stats.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
      {stats.map((stat) => (
        <div key={stat.label} className="bg-[#0b3940]/70 px-2 py-2.5">
          <p className="text-[17px] font-semibold tabular-nums">{stat.value}</p>
          <p className="text-[11px] leading-tight text-white/60">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

function Bar({ label, amount, width, colour, strong = false }: { label: string; amount: number; width: number; colour: string; strong?: boolean }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-white/70">
        <span className="flex items-center gap-1.5">
          <span className={`size-2 rounded-full ${colour}`} />
          {label}
        </span>
        <span className={`tabular-nums ${strong ? "font-semibold text-white" : ""}`}>{euro(amount)}</span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div className={`h-2 rounded-full ${colour}`} style={{ width: `${Math.max(4, width)}%` }} />
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="mt-3 text-sm leading-relaxed text-white/75">{text}</p>;
}

function RentNumbers({ values }: { values: Values }) {
  const current = Number(values.currentRent);
  const next = Number(values.newRent);
  if (!(current > 0) || !(next > 0)) return <Empty text="Enter the current and new rent to see the difference." />;

  const diff = next - current;
  const pct = (diff / current) * 100;
  const top = Math.max(current, next);
  const notice = validDays(values.serviceDate, values.effectiveDate);
  const stats: Stat[] = [];
  if (notice !== null && notice >= 0) stats.push({ value: String(notice), label: "days' notice" });
  if (values.lastReviewDate && values.effectiveDate) stats.push({ value: String(wholeMonthsBetween(values.lastReviewDate, values.effectiveDate)), label: "months since last change" });
  stats.push({ value: euro(Math.abs(diff) * 12), label: diff >= 0 ? "more a year" : "less a year" });

  return (
    <>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="font-display text-[38px] font-semibold leading-none tabular-nums">
          {diff >= 0 ? "+" : "−"}
          {euro(Math.abs(diff))}
        </p>
        <p className="text-sm text-white/70">a month</p>
      </div>
      <p className="mt-1 text-[13px] text-white/75">
        {diff === 0 ? "No change" : `A ${Math.abs(pct).toFixed(1)}% ${diff > 0 ? "increase" : "decrease"}`}
      </p>
      <div className="mt-4 space-y-2.5">
        <Bar label="Current rent" amount={current} width={(current / top) * 100} colour="bg-white/50" />
        <Bar label="New rent" amount={next} width={(next / top) * 100} colour="bg-[#f5c451]" strong />
      </div>
      <Stats stats={stats} />
    </>
  );
}

function TerminationNumbers({ values }: { values: Values }) {
  const notice = validDays(values.serviceDate, values.terminationDate);
  if (notice === null) return <Empty text="Enter the date on the notice and the day the tenancy ends to see how much notice you got." />;

  const stats: Stat[] = [];
  if (values.tenancyStart && values.serviceDate && daysBetween(values.tenancyStart, values.serviceDate) >= 0) {
    stats.push({ value: String(wholeMonthsBetween(values.tenancyStart, values.serviceDate)), label: "months as a tenant when served" });
  }
  stats.push({ value: fmtDate(values.terminationDate), label: "move-out date" });

  return (
    <>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="font-display text-[38px] font-semibold leading-none tabular-nums">{notice}</p>
        <p className="text-sm text-white/70">days&apos; notice</p>
      </div>
      <p className="mt-1 text-[13px] text-white/75">From the date on the notice to the day the tenancy ends.</p>
      <Stats stats={stats} />
    </>
  );
}

function EntryNumbers({ values }: { values: Values }) {
  if (!values.toldAt || !values.visitAt) return <Empty text="Enter when you were told and when the visit is to see how much notice you got." />;
  const hours = Math.floor((new Date(values.visitAt).getTime() - new Date(values.toldAt).getTime()) / 3600000);
  if (Number.isNaN(hours)) return <Empty text="Those times don't look right." />;
  const visit = new Date(values.visitAt);

  return (
    <>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="font-display text-[38px] font-semibold leading-none tabular-nums">{hours}</p>
        <p className="text-sm text-white/70">hours&apos; notice</p>
      </div>
      <p className="mt-1 text-[13px] text-white/75">{hours >= 48 ? `That's ${plural(Math.floor(hours / 24), "day")} and ${plural(hours % 24, "hour")}.` : "Between being told and the visit."}</p>
      <Stats
        stats={[
          { value: visit.toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short" }), label: "visit day" },
          { value: visit.toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit" }), label: "visit time" },
        ]}
      />
    </>
  );
}

export default function LivePanel({ type, values }: { type: NoticeType; values: Values }) {
  if (type === "other") return null;
  return (
    <section
      aria-live="polite"
      className="relative overflow-hidden rounded-2xl bg-[radial-gradient(120%_140%_at_100%_0%,#1d6b73_0%,#0a3b43_55%,#082d33_100%)] p-5 text-white shadow-soft"
    >
      <span className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full bg-white/5" />
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8fd3c8]">From what you entered</p>
      {type === "rent" && <RentNumbers values={values} />}
      {type === "termination" && <TerminationNumbers values={values} />}
      {type === "entry" && <EntryNumbers values={values} />}
      <p className="mt-4 text-xs leading-relaxed text-white/60">We check these against the law when you press Check this notice.</p>
    </section>
  );
}
