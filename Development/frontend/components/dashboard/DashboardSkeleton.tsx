export default function DashboardSkeleton() {
  return (
    <div aria-busy="true">
      <p role="status" className="sr-only">
        Loading your dashboard
      </p>
      <div className="mt-6 grid gap-5 lg:grid-cols-[7fr_5fr]">
        <div className="skeleton h-[360px] rounded-3xl" />
        <div className="skeleton h-[360px] rounded-3xl" />
      </div>
      <div className="skeleton mt-5 h-64 rounded-3xl" />
      <div className="skeleton mt-5 h-80 rounded-3xl" />
    </div>
  );
}
