import { ServerCrash } from "lucide-react";
import { Button } from "./Button";

type ErrorStateProps = {
  message?: string;
  onRetry?: () => void;
};

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-2xl border border-bad-line bg-bad-bg px-6 py-10 text-center text-bad">
      <ServerCrash size={32} aria-hidden />
      <p className="mt-3 font-semibold">We couldn't load this</p>
      <p className="mt-1 text-sm">{message ?? "Please check your connection and try again."}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
