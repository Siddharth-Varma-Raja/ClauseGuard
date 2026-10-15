import Link from "next/link";
import { FileSearch, ShieldCheck, LockKeyhole } from "lucide-react";
import Logo from "@/components/ui/Logo";
import RedirectIfSignedIn from "@/components/auth/RedirectIfSignedIn";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <RedirectIfSignedIn />
      <aside className="hidden flex-1 flex-col justify-between bg-brand-dark p-10 text-white lg:flex xl:p-16">
        <Link href="/" className="w-fit">
          <Logo />
        </Link>

        <div className="max-w-xl">
          <h1 className="font-display text-4xl font-semibold leading-tight xl:text-5xl">
            Understand your lease before you sign it.
          </h1>

          <p className="mt-5 text-lg leading-8 text-white/80">
            Understand rental agreements through clear explanations
            based on Irish tenancy guidance.
          </p>

          <ul className="mt-10 space-y-5">
            <li className="flex items-center gap-3">
              <FileSearch />
              <span>Review lease clauses in plain English</span>
            </li>

            <li className="flex items-center gap-3">
              <ShieldCheck />
              <span>Understand potential issues</span>
            </li>

            <li className="flex items-center gap-3">
              <LockKeyhole />
              <span>Keep your account and documents private</span>
            </li>
          </ul>
        </div>

        <p className="text-sm text-white/70">
          ClauseGuard provides information, not legal advice.
        </p>
      </aside>

      <main className="flex w-full items-center justify-center px-5 py-10 sm:px-10 lg:w-[540px] lg:shrink-0">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="mb-8 inline-block lg:hidden"
          >
            <Logo />
          </Link>

          {children}
        </div>
      </main>
    </div>
  );
}
