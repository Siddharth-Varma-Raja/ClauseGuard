import type { ComponentProps } from "react";

type CheckboxProps = ComponentProps<"input"> & {
  label: React.ReactNode;
  hint?: string;
};

export default function Checkbox({ label, hint, ...props }: CheckboxProps) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-surface p-3.5 text-sm">
      <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-brand" {...props} />
      <span>
        <span className="font-medium">{label}</span>
        {hint && <span className="mt-0.5 block text-mute">{hint}</span>}
      </span>
    </label>
  );
}
