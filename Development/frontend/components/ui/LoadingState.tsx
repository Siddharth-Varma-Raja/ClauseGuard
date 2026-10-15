import { Loader2 } from "lucide-react";

type LoadingStateProps = {
  label?: string;
};

export default function LoadingState({ label = "Loading…" }: LoadingStateProps) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-16 text-mute">
      <Loader2 className="animate-spin text-brand" aria-hidden />
      {label}
    </div>
  );
}
