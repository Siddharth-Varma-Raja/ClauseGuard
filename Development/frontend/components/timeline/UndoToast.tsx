import { Trash2, X } from "lucide-react";

export default function UndoToast({ title, onUndo, onClose }: { title: string; onUndo: () => void; onClose: () => void }) {
  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-50 flex max-w-[calc(100%-2rem)] -translate-x-1/2 animate-fade-up items-center gap-4 rounded-xl bg-ink px-4 py-3 text-sm text-white shadow-2xl"
    >
      <Trash2 size={16} className="shrink-0 text-white/70" aria-hidden />
      <span className="min-w-0 truncate">Deleted &ldquo;{title}&rdquo;</span>
      <button type="button" onClick={onUndo} className="shrink-0 cursor-pointer font-semibold text-[#7fd3dc] hover:underline">
        Undo
      </button>
      <button type="button" onClick={onClose} aria-label="Dismiss" className="shrink-0 cursor-pointer text-white/60 hover:text-white">
        <X size={16} />
      </button>
    </div>
  );
}
