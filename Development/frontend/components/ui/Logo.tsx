import Image from "next/image";

export default function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Image src="/logo.svg" alt="logo" width={24} height={24} priority />
      <span className={`font-display text-xl font-semibold ${light ? "text-white" : "text-brand-dark"}`}>
        ClauseGuard
      </span>
    </span>
  );
}