import { Info } from "lucide-react";
import { cn } from "@/lib/cn";

type DisclaimerProps = {
  children?: React.ReactNode;
  className?: string;
};

export default function Disclaimer({ children, className }: DisclaimerProps) {
  return (
    <p className={cn("flex items-start gap-2 text-xs leading-relaxed text-mute", className)}>
      <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
      <span>{children ?? "ClauseGuard provides automated, informational analysis and is not a substitute for legal advice."}</span>
    </p>
  );
}
