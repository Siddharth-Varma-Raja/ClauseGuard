import Link from "next/link";
import { Upload } from "lucide-react";
import { cn } from "@/lib/cn";

export default function UploadLeaseButton({
  compact = false,
  large = false,
  className,
  onClick,
}: {
  compact?: boolean;
  large?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  if (large) {
    return (
      <Link
        href="/lease/new"
        onClick={onClick}
        className={cn(
          "group inline-flex items-center gap-3 rounded-full border border-[#cfe3e4] bg-white py-2 pl-2 pr-7 text-brand-dark shadow-[0_8px_24px_-8px_rgb(10_59_67/0.25)] transition-all hover:-translate-y-0.5 hover:border-brand",
          className,
        )}
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[radial-gradient(120%_140%_at_100%_0%,#1d6b73_0%,#0a3b43_55%,#082d33_100%)] text-white">
          <Upload size={20} />
        </span>
        <span className="text-base font-semibold">Upload a lease</span>
      </Link>
    );
  }

  return (
    <Link
      href="/lease/new"
      onClick={onClick}
      aria-label="Upload lease"
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand-dark px-5 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-brand",
        compact && "px-3 sm:px-5",
        className,
      )}
    >
      <Upload size={17} />
      <span className={compact ? "hidden sm:inline" : undefined}>Upload lease</span>
    </Link>
  );
}
