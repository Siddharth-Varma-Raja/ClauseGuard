"use client";

import { ShieldCheck, CalendarClock, CheckCircle2, Circle } from "lucide-react";
import Card from "../ui/Card";
import { fmtDate } from "@/lib/format";

type TenancyMilestonesProps = {
  startDate?: string | null;
  today: string;
};

function calculateMonths(startIso: string, todayIso: string) {
  const [sy, sm, sd] = startIso.split("-").map(Number);
  const [ty, tm, td] = todayIso.split("-").map(Number);
  let months = (ty - sy) * 12 + (tm - sm);
  if (td < sd) months -= 1;
  return Math.max(0, months);
}

export default function TenancyMilestones({ startDate, today }: TenancyMilestonesProps) {
  if (!startDate) {
    return (
      <Card className="mt-6 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
              <ShieldCheck size={20} aria-hidden />
            </div>
            <div>
              <p className="font-semibold text-brand-dark">Part 4 Statutory Protections</p>
              <p className="mt-0.5 text-sm text-mute">
                Analyse your lease to track your legal security of tenure and statutory notice rights under Irish tenancy law.
              </p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  const months = calculateMonths(startDate, today);
  const part4Unlocked = months >= 6;
  const rentReviewEligible = months >= 12;
  const extendedNotice = months >= 36;

  const milestones = [
    {
      title: "Move-in",
      detail: `Started ${fmtDate(startDate)}`,
      achieved: true,
    },
    {
      title: "Part 4 Security",
      detail: part4Unlocked ? "Active (Security of tenure)" : `${6 - months} mo. remaining`,
      achieved: part4Unlocked,
    },
    {
      title: "Annual Rent Review",
      detail: rentReviewEligible ? "Annual cycle eligible" : "Protected for 12 months",
      achieved: rentReviewEligible,
    },
    {
      title: "180-Day Notice Tier",
      detail: extendedNotice ? "180+ days notice required" : "Unlocks at 3 years",
      achieved: extendedNotice,
    },
  ];

  return (
    <Card className="mt-6 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
            <ShieldCheck size={22} aria-hidden />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-brand-dark">Tenancy Protection Status</p>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${part4Unlocked ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-amber-50 text-amber-800 border border-amber-200"}`}>
                {part4Unlocked ? "Part 4 Protected" : "Probationary (< 6 mos)"}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-mute">
              {part4Unlocked
                ? "You have acquired Part 4 rights. Your landlord cannot end the tenancy without specific statutory grounds under the Residential Tenancies Act."
                : `You are in your first 6 months. In ${6 - months} month(s), you automatically acquire statutory security of tenure.`}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {milestones.map((m) => (
          <div
            key={m.title}
            className={`flex items-start gap-2.5 rounded-xl border p-3 transition ${
              m.achieved
                ? "border-brand/20 bg-brand-soft/40 text-brand-dark"
                : "border-line bg-surface/50 text-mute"
            }`}
          >
            {m.achieved ? (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden />
            ) : (
              <Circle size={18} className="mt-0.5 shrink-0 text-slate-400" aria-hidden />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand-dark">{m.title}</p>
              <p className="text-xs text-mute">{m.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
