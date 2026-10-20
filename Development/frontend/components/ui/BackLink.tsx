import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type BackLinkProps = {
  href?: string;
  label?: string;
};

export default function BackLink({ href = "/dashboard", label = "Back" }: BackLinkProps) {
  return (
    <Link href={href} className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
      <ArrowLeft size={16} aria-hidden />
      {label}
    </Link>
  );
}
