import { CalendarDays, Clock, Euro, Landmark, TriangleAlert, CircleCheck, House } from "lucide-react";
import type { Analysis } from "@/lib/notice-types";
import { cn } from "@/lib/cn";

export default function KeyLeaseDetails({ analysis }: { analysis: Analysis }) {
  const { monthlyRentCents: rent, depositCents: deposit, tenancyStart, termMonths } = analysis;

  const start = parseDate(tenancyStart);
  const end = start && termMonths ? endDate(start, termMonths) : null;
  const depositTooHigh = rent != null && deposit != null && deposit > rent;
  const depositOk = rent != null && deposit != null && deposit <= rent;

  return (
    <div data-tour="key-details" className="flex min-w-0 flex-col rounded-3xl border border-line bg-white p-5 shadow-soft sm:p-6">
      <h3 className="flex items-center gap-2 font-semibold text-brand-dark">
        <Landmark size={18} aria-hidden />
        Key lease details
      </h3>
      {analysis.propertyAddress ? (
        <p className="mt-1 flex items-center gap-1.5 text-sm text-mute">
          <House size={14} className="shrink-0" aria-hidden />
          {analysis.propertyAddress}
        </p>
      ) : (
        <p className="mt-1 text-sm text-mute">The main facts ClauseGuard found in your lease.</p>
      )}

      <dl className="mt-5 grid grid-cols-2 gap-3">
        <Fact Icon={Euro} label="Monthly rent" value={money(rent)} />
        <Fact
          Icon={Euro}
          label="Deposit"
          value={money(deposit)}
          tone={depositTooHigh ? "warn" : undefined}
        />
        <Fact Icon={CalendarDays} label="Start date" value={start ? formatDate(start) : null} />
        <Fact
          Icon={Clock}
          label="Length"
          value={termMonths ? `${termMonths} ${termMonths === 1 ? "month" : "months"}` : null}
          note={end ? `Ends ${formatDate(end)}` : undefined}
        />
      </dl>

      {depositTooHigh && (
        <p className="mt-3 flex gap-2.5 rounded-2xl border border-warn-line bg-warn-bg p-3 text-sm leading-relaxed text-ink">
          <TriangleAlert size={18} className="mt-0.5 shrink-0 text-warn" aria-hidden />
          <span>
            <strong className="font-semibold">The deposit is more than one month&apos;s rent.</strong> Under Irish law, a
            deposit can&apos;t be more than one month&apos;s rent. Ask your landlord to reduce it to {money(rent)}.
          </span>
        </p>
      )}
      {depositOk && (
        <p className="mt-3 flex items-center gap-2 rounded-2xl bg-ok-bg p-3 text-sm text-ok">
          <CircleCheck size={18} className="shrink-0" aria-hidden />
          The deposit is within the one-month limit.
        </p>
      )}

      <p className="mt-auto pt-4 text-xs text-mute">Taken from your lease automatically. Check them against your copy.</p>
    </div>
  );
}

function Fact({
  Icon,
  label,
  value,
  note,
  tone,
}: {
  Icon: typeof Euro;
  label: string;
  value: string | null;
  note?: string;
  tone?: "warn";
}) {
  return (
    <div className={cn("rounded-2xl border p-3.5", tone === "warn" ? "border-warn-line bg-warn-bg" : "border-line bg-surface/60")}>
      <dt className="flex items-center gap-1.5 text-xs font-medium text-mute">
        <Icon size={14} aria-hidden />
        {label}
      </dt>
      <dd className={cn("mt-1", value ? "font-display text-xl font-semibold text-ink" : "text-sm italic text-mute")}>
        {value ?? "Not found"}
      </dd>
      {note && <dd className="mt-0.5 text-xs text-mute">{note}</dd>}
    </div>
  );
}

function money(cents: number | null) {
  if (cents == null) return null;
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

function parseDate(value: string | null) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}


function endDate(start: Date, months: number) {
  const end = new Date(start.getFullYear(), start.getMonth() + months, start.getDate());
  end.setDate(end.getDate() - 1);
  return end;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" });
}
