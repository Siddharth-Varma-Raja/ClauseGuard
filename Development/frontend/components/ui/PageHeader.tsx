type PageHeaderProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export default function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 text-lg text-mute">{description}</p>}
      </div>
      {action}
    </div>
  );
}
