import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pager({ page, pages, label, onChange }: { page: number; pages: number; label: string; onChange: (page: number) => void }) {
  if (pages <= 1) return null;
  const button = "grid size-8 cursor-pointer place-items-center rounded-full border border-line bg-white text-brand-dark hover:border-brand/40 disabled:cursor-default disabled:opacity-40";
  return (
    <div role="group" aria-label={label} className="flex items-center gap-1.5">
      <button type="button" onClick={() => onChange(page - 1)} disabled={page === 0} aria-label="Previous page" className={button}>
        <ChevronLeft size={16} />
      </button>
      <span className="min-w-12 text-center text-xs font-semibold text-mute" aria-live="polite">
        {page + 1} of {pages}
      </span>
      <button type="button" onClick={() => onChange(page + 1)} disabled={page >= pages - 1} aria-label="Next page" className={button}>
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
