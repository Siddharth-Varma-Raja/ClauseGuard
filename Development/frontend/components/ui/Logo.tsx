export default function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className={`font-display text-xl font-semibold ${light ? "text-white" : "text-brand-dark"}`}>
        ClauseGuard
      </span>
    </span>
  );
}