import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type FieldProps = ComponentProps<"input"> & {
  label: string;
  name: string;
  hint?: string;
  error?: string;
};

export default function Field({ label, name, hint, error, id, className, ...props }: FieldProps) {
  const inputId = id ?? name;
  const noteId = `${inputId}-note`;
  const note = error ?? hint;

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>

      <input
        id={inputId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={note ? noteId : undefined}
        className={cn(
          "w-full rounded-xl border bg-white px-4 py-3 text-base placeholder:text-neu-solid focus:border-brand",
          error ? "border-bad" : "border-neu-line"
        )}
        {...props}
      />

      {note && (
        <p id={noteId} className={cn("mt-1.5 text-sm", error ? "font-medium text-bad" : "text-mute")}>
          {note}
        </p>
      )}
    </div>
  );
}
