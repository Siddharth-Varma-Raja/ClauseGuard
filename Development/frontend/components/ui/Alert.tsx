import { cn } from "@/lib/cn";

type AlertProps = {
  children: React.ReactNode;
  tone?: "error" | "success";
};

export default function Alert({ children, tone = "error" }: AlertProps) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-xl border px-4 py-3 text-sm font-medium",
        tone === "error" ? "border-bad-line bg-bad-bg text-bad" : "border-ok-line bg-ok-bg text-ok"
      )}
    >
      {children}
    </p>
  );
}
