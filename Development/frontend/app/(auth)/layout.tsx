import Link from "next/link";
import { FileSearch, ShieldCheck, LockKeyhole, ArrowLeft, House, KeyRound, Info } from "lucide-react";
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
      <aside className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-[radial-gradient(120%_140%_at_100%_0%,#1d6b73_0%,#0a3b43_55%,#082d33_100%)] p-10 text-white lg:flex xl:p-16">
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.07)_1px,transparent_1px)] bg-size-[22px_22px]" />
        <span className="pointer-events-none absolute -bottom-24 -right-24 size-96 rounded-full bg-[radial-gradient(circle,rgb(127_212_220/0.25),transparent_65%)] animate-drift" />
        <Link href="/" className="relative w-fit">
          <Logo light />
        </Link>

        <div className="relative max-w-xl">
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

        <div className="relative flex items-center gap-2 text-sm text-white/70">
          <Info size={18} />
          <span>ClauseGuard provides information, not legal advice.</span>
        </div>
      </aside>

      <main className="flex w-full flex-col bg-[radial-gradient(130%_60%_at_50%_0%,#e3f1f2_0%,#f4faf9_50%,#ffffff_100%)] lg:w-[540px] lg:shrink-0 lg:justify-center lg:py-10">
        <div className="relative px-5 pt-4 lg:pt-0">
          <Link href="/" className="grid relative size-12 lg:hidden place-items-center rounded-full bg-white text-brand-dark shadow-soft">
            <ArrowLeft size={20} />
          </Link>
          <div className="relative mx-auto mt-2 h-40 max-w-xs">
            <span className="absolute left-4 top-12 grid size-16 place-items-center rounded-[1.4rem] bg-white text-brand shadow-soft animate-float [animation-delay:-1s]">
              <House size={28} />
            </span>
            <span className="absolute right-4 top-0 grid size-14 place-items-center rounded-full bg-warn-bg text-warn-solid shadow-soft animate-float [animation-delay:-3s]">
              <KeyRound size={24} />
            </span>
            <span className="absolute bottom-0 right-14 grid size-12 place-items-center rounded-2xl bg-ok-bg text-ok shadow-soft animate-float [animation-delay:-2s]">
              <ShieldCheck size={22} />
            </span>
            <span className="absolute inset-0 grid place-items-center">
              <span className="size-20 grid place-items-center rounded-3xl bg-brand-dark shadow-[0_16px_40px_rgb(10_59_67/0.35)] animate-pop-in">
                <img src="/logo.svg" alt="" className="h-10 w-auto brightness-0 invert" />
              </span>
            </span>
          </div>
        </div>

        <div className="flex-1 px-5 pt-6 pb-10 lg:mx-auto lg:w-full lg:max-w-sm lg:flex-none lg:px-0 lg:pb-0">
          {children}
        </div>
      </main>
    </div>
  );
}
