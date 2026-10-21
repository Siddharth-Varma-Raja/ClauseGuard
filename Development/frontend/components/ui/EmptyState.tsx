type EmptyStateProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
};

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-neu-line bg-surface/60 px-6 py-12 text-center">
      <div className="mb-5 grid size-20 place-items-center rounded-full bg-brand-soft text-brand">{icon}</div>
      <h3 className="font-display text-xl font-semibold text-brand-dark">{title}</h3>
      <p className="mt-2 max-w-sm text-mute">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
