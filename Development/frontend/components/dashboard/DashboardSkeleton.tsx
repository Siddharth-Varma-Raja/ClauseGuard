export default function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your dashboard">
      <div className="mt-6 grid gap-5 lg:grid-cols-[7fr_5fr]">
        <div className="skeleton h-72 rounded-3xl" />
        <div className="skeleton h-72 rounded-3xl" />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[8fr_4fr]">
        <div className="skeleton h-80 rounded-3xl" />
        <div className="skeleton h-80 rounded-3xl" />
      </div>
      <div className="skeleton mt-8 h-6 w-40 rounded-full" />
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="skeleton h-20 rounded-2xl" />
        <div className="skeleton h-20 rounded-2xl" />
        <div className="skeleton h-20 rounded-2xl" />
      </div>
    </div>
  );
}
