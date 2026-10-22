import Link from "next/link";
import {
  ArrowRight,
  Upload,
  FileSearch,
  Gavel,
  MessageCircle,
  CalendarClock,
  Lock,
 } from "lucide-react";
import RedirectIfSignedIn from "@/components/auth/RedirectIfSignedIn";
import PageTour from "@/components/PageTour";
import { HOME_TOUR } from "@/lib/tours";

const steps = [
  {
    title: "Upload your lease",
    description: "Upload your rental agreement to get started.",
    icon: Upload,
  },
  {
    title: "Check the clauses",
    description: "Review potential issues against Irish tenancy guidance.",
    icon: FileSearch,
  },
  {
    title: "Understand the results",
    description: "Read clear explanations and relevant sources.",
    icon: ArrowRight,
  },
];

const features = [
  {
    title: "Check a lease",
    description: "Review clauses before signing a rental agreement.",
    icon: FileSearch,
  },
  {
    title: "Check a notice",
    description: "Review a rent increase or notice from your landlord.",
    icon: Gavel,
  },
  {
    title: "Ask about any clause",
    description: "Get help understanding a clause in plain English.",
    icon: MessageCircle,
  },
  {
    title: "Tenancy timeline",
    description: "Keep track of important dates and deadlines.",
    icon: CalendarClock,
  },
];

export default function LandingPage() {
  return (
    <main>
      <RedirectIfSignedIn />

      <section data-tour="hero" className="bg-brand-dark text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16">
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm font-semibold">
                <Lock size={16} />
                For tenants in Ireland
              </p>
              <PageTour tourId="hero" steps={HOME_TOUR} />
            </div>

            <h1 className="mt-5 font-display text-4xl font-semibold leading-tight sm:text-5xl">
              Understand your lease before you agree.
            </h1>

            <p className="mt-5 max-w-xl text-lg text-white/80">
              Upload your rental agreement and understand its clauses through clear explanations based on Irish tenancy laws.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/register"
                data-tour="get-started"
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-brand-dark hover:bg-brand-soft"
              >
                Get started <ArrowRight size={18} />
              </Link>

              <Link
                href="/login"
                className="inline-flex min-h-12 items-center rounded-xl border border-white/50 px-6 py-3 font-semibold hover:bg-white/10"
              >
                Log in
              </Link>
            </div>
          </div>

          
        </div>
      </section>

      <section
        data-tour="how-it-works"
        className="mx-auto max-w-6xl px-4 py-16 sm:px-6"
      >
        <h2
          id="how-it-works"
          className="text-3xl font-semibold text-brand-dark font-display"
        >
          How it works
        </h2>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <article
                key={step.title}
                className="rounded-2xl border border-line bg-white p-6"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-brand-dark font-semibold text-white">
                    {index + 1}
                  </span>
                  <Icon
                    size={22}
                    className="text-brand"
                  />
                </div>

                <h3 className="mt-4 text-xl font-semibold font-display">
                  {step.title}
                </h3>
                <p className="mt-2 text-mute">{step.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section
        className="bg-surface"
      >
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2
            id="features"
            className="text-3xl font-semibold text-brand-dark font-display"
          >
            Everything a tenant needs
          </h2>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.title}
                  className="flex gap-4 rounded-2xl border border-line bg-white p-6"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                    <Icon size={22} />
                  </span>

                  <div>
                    <h3 className="text-xl font-semibold font-display">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-mute">
                      {feature.description}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-brand-dark text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-5 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-semibold font-display">
              Ready to check your lease?
            </h2>
            <p className="mt-2 text-white/80">
              Create an account to get started.
            </p>
          </div>

          <Link
            href="/register"
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-brand-dark hover:bg-brand-soft"
          >
            Create an account
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}