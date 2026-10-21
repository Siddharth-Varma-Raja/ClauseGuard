import { Check } from "lucide-react";

export const LEASE_STEPS = ["Upload lease", "Review clauses", "Ask questions"];

export default function Stepper({steps, current}: {steps: string[]; current: number}) {
    return (
        <ol className="flex gap-4 items-center">
            {steps.map((s, i) => {
                const n = i+1;
                const done = n < current;
                const cur = n === current;

                return (
                    <li key={s} className="flex gap-2 items-center">
                        <span className={`flex items-center justify-center rounded-full text-sm font-bold size-8 ${
                            done ? "bg-brand text-white"
                            : cur ? "bg-brand ring-4 ring-brand/20 text-white" : "bg-gray-100 text-gray-500"
                        }`}>
                            {done ? <Check size={16}/> : n}
                        </span>
                        <span className={`text-sm font-medium ${
                            cur ? "text-brand" : "text-gray-500"
                        }`}>
                            {s}
                        </span>

                        {i < steps.length - 1 && (
                            <span className="h-px w-4 bg-neu-line" aria-hidden/>
                        )}
                    </li>
                );
            })}
        </ol>
    );
}