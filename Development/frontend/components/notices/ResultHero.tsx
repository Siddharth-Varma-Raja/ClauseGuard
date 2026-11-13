import { Mail } from "lucide-react";
import { VERDICTS, noticeType } from "@/lib/notice-meta";
import { formatDate } from "@/lib/notice-format";
import type { Notice, NoticeCheck, NoticeType, NoticeVerdict } from "@/lib/notice-types";

const SUBJECT: Record<NoticeType, string> = {
  termination: "This notice to end your tenancy",
  rent: "This rent increase",
  entry: "This visit request",
  other: "This notice",
};

const OUTCOME: Record<NoticeVerdict, string> = {
  invalid: "is likely not valid",
  attention: "needs a closer look",
  valid: "looks valid",
  info: "",
};

const ON_DARK: Record<NoticeVerdict, string> = {
  invalid: "bg-[#f97066]/15 text-[#ffb4ab] ring-[#f97066]/40",
  attention: "bg-[#f5c451]/15 text-[#ffe08a] ring-[#f5c451]/40",
  valid: "bg-[#5fd39a]/15 text-[#a6f0c6] ring-[#5fd39a]/40",
  info: "bg-white/10 text-white/85 ring-white/25",
};

const METER: { status: NoticeCheck["status"]; colour: string; one: string; many: string }[] = [
  { status: "fail", colour: "bg-[#f97066]", one: "problem", many: "problems" },
  { status: "warn", colour: "bg-[#f5c451]", one: "to check", many: "to check" },
  { status: "pass", colour: "bg-[#5fd39a]", one: "fine", many: "fine" },
  { status: "info", colour: "bg-white/40", one: "good to know", many: "good to know" },
];

function replyLink(notice: Notice) {
  const issues = notice.checks.filter((check) => check.status === "fail" || check.status === "warn");
  if (issues.length === 0) return null;
  const title = noticeType(notice.type).title.toLowerCase();
  const body = [
    "Dear landlord,",
    "",
    `Thank you for your ${title}. Before I can accept it, I would like you to look at the following:`,
    "",
    ...issues.map((check) => `- ${check.title}: ${check.detail}`),
    "",
    "Please reply in writing.",
    "",
    "Kind regards,",
  ].join("\n");
  return `mailto:?subject=${encodeURIComponent(`About your ${title}`)}&body=${encodeURIComponent(body)}`;
}

export default function ResultHero({ notice, address }: { notice: Notice; address?: string }) {
  const verdict = VERDICTS[notice.verdict] ?? VERDICTS.info;
  const headline = notice.verdict === "info" ? "What this notice means for you" : `${SUBJECT[notice.type]} ${OUTCOME[notice.verdict]}`;
  const meta = [noticeType(notice.type).title, address, `checked ${formatDate(notice.createdAt, "long")}`].filter(Boolean).join(" · ");
  const counts = METER.map((item) => ({ ...item, count: notice.checks.filter((check) => check.status === item.status).length })).filter((item) => item.count > 0);
  const reply = replyLink(notice);

  return (
    <section className="relative overflow-hidden rounded-2xl bg-[radial-gradient(120%_140%_at_100%_0%,#1d6b73_0%,#0a3b43_55%,#082d33_100%)] p-4 text-white shadow-soft sm:p-6 lg:[@media(max-height:800px)]:py-5">
      <span className="pointer-events-none absolute -bottom-24 right-40 size-64 rounded-full bg-white/[0.04]" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
        <div className="max-w-[720px]">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${ON_DARK[notice.verdict] ?? ON_DARK.info}`}>
              <verdict.Icon size={13} aria-hidden />
              {verdict.label}
            </span>
            <span className="text-[12.5px] text-white/60">{meta}</span>
          </div>
          <h1 className="mt-3 font-display text-[22px] font-semibold leading-tight sm:text-[30px]">{headline}</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/75 sm:text-[15px]">{notice.summary}</p>
        </div>
        {reply && (
          <a
            href={reply}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-brand-dark hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <Mail size={16} aria-hidden />
            Draft a reply to my landlord
          </a>
        )}
      </div>

      {counts.length > 0 && (
        <div className="relative mt-5 flex flex-col gap-2 lg:[@media(max-height:800px)]:mt-4 sm:flex-row sm:items-center sm:gap-5">
          <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-white/10 sm:w-[340px]">
            {counts.map((item) => (
              <span key={item.status} className={item.colour} style={{ width: `${(item.count / notice.checks.length) * 100}%` }} />
            ))}
          </div>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
            {counts.map((item) => (
              <span key={item.status} className="flex items-center gap-1.5">
                <span className={`size-2 rounded-full ${item.colour}`} />
                <b className="font-semibold">{item.count}</b>
                <span className="text-white/70">{item.count === 1 ? item.one : item.many}</span>
              </span>
            ))}
          </p>
        </div>
      )}
    </section>
  );
}
