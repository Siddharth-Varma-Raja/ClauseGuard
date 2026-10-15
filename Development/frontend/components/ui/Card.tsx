import { cn } from "@/lib/cn";

type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export default function Card({ children, className }: CardProps) {
  return <div className={cn("rounded-2xl border border-line bg-white shadow-soft", className)}>{children}</div>;
}
