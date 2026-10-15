import { cn } from "@/lib/cn";

type LogoProps = {
  // Use the light version on dark backgrounds.
  light?: boolean;
};

export default function Logo({ light = false }: LogoProps) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="font-display text-xl font-semiboldtext-white">
        ClauseGuard
      </span>
    </span>
  );
}
