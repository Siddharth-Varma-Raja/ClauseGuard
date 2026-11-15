import { Check } from "lucide-react";
import { NOTICE_TYPES } from "@/lib/notice-meta";
import type { NoticeType } from "@/lib/notice-types";

export default function TypeTiles({ value, onChange }: { value: NoticeType | null; onChange: (type: NoticeType) => void }) {
  return (
    <div role="radiogroup" aria-label="What the notice is about" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3.5">
      {NOTICE_TYPES.map(({ value: type, title, description, checks, Icon }) => {
        const selected = value === type;
        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(type)}
            className={`flex cursor-pointer flex-col gap-3 rounded-2xl border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:min-h-[150px] sm:p-5 lg:[@media(max-height:800px)]:min-h-0 lg:[@media(max-height:800px)]:p-4 ${
              selected ? "border-brand bg-brand-soft/50 shadow-[0_0_0_3px_rgb(14_85_96/0.12)]" : "border-[#d5e3e4] bg-white hover:border-brand/40"
            }`}
          >
            <span className="flex items-center gap-3 sm:items-start">
              <span className={`grid size-10 shrink-0 place-items-center rounded-xl sm:size-11 ${selected ? "bg-brand text-white" : "bg-brand-soft text-brand"}`}>
                <Icon size={20} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-brand-dark">{title}</span>
                <span className="mt-0.5 block text-[13px] leading-snug text-mute">{description}</span>
              </span>
              {selected ? (
                <span className="grid size-[22px] shrink-0 place-items-center rounded-full bg-brand text-white">
                  <Check size={13} aria-hidden />
                </span>
              ) : (
                <span className="size-[22px] shrink-0 rounded-full border-2 border-[#cfdcde] bg-white" />
              )}
            </span>
            <span className={`mt-auto hidden flex-wrap items-center gap-1 border-t pt-2.5 sm:flex ${selected ? "border-brand/15" : "border-line"}`}>
              <span className="mr-1 text-[11px] font-semibold text-mute">We check:</span>
              {checks.map((check) => (
                <span
                  key={check}
                  className={`rounded-md px-1.5 py-0.5 text-[11.5px] font-medium text-brand-dark ring-1 ${selected ? "bg-white ring-brand/20" : "bg-[#f4f8f8] ring-[#e1e9ea]"}`}
                >
                  {check}
                </span>
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
