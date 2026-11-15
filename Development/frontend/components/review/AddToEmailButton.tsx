import { Check, Mail } from "lucide-react";
import { cn } from "@/lib/cn";

export default function AddToEmailButton({
  added,
  onToggle,
  fullWidth = false,
}: {
  added: boolean;
  onToggle: () => void;
  fullWidth?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={added}
      className={cn(
        "inline-flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3.5 text-sm font-semibold text-brand-dark transition-colors",
        fullWidth && "w-full",
        added ? "border-brand bg-brand-soft" : "border-line bg-white hover:border-brand hover:bg-brand-soft",
      )}
    >
      {added ? <Check size={16} aria-hidden /> : <Mail size={16} aria-hidden />}
      {added ? "Added to landlord email" : "Add to landlord email"}
    </button>
  );
}
