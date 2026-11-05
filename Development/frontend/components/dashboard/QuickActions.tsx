import Link from "next/link";
import { ArrowRight, CalendarPlus, FileCheck, Upload } from "lucide-react";

const ACTIONS = [
  { Icon: FileCheck, title: "Check a notice", text: "Is your landlord's notice valid?", href: "/notices" },
  { Icon: CalendarPlus, title: "Add a date", text: "Rent day, notices, visits", href: "/timeline" },
  { Icon: Upload, title: "Upload another lease", text: "Check it before you sign", href: "/lease/new" },
];

export default function QuickActions() {
  return (
    <section data-tour="quick-actions" className="mt-8">
      <h2 className="font-display text-xl font-semibold text-brand-dark">Quick actions</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {ACTIONS.map(({ Icon, title, text, href }) => (
          <Link
            key={title}
            href={href}
            className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-soft"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
              <Icon size={20}  />
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 font-semibold text-ink">
                {title}
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5"  />
              </p>
              <p className="truncate text-sm text-mute">{text}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
