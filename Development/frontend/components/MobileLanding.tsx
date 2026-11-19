"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, CalendarClock, CheckCircle2, ChevronDown, CircleCheck, DoorOpen, FileSearch, FileText, Lock, Receipt, ShieldAlert, Sparkles, TriangleAlert, TrendingUp, Upload, Users, Wallet, Wrench, BookOpen, EyeOff, Flag, Scale, Icon } from "lucide-react";
import PageTour from "@/components/PageTour";
import { HOME_TOUR } from "@/lib/tours";
import { cn } from "@/lib/cn";

const clauses = [
    {
        title: "Security deposit",
        text: "Three months' rent as a deposit before you move in.",
        label: "Unlawful",
        Icon: ShieldAlert,
        chip: "border-bad-line bg-bad-bg text-bad",
        row: "border-bad-line bg-bad-bg/50",
    },
    {
        title: "Overnight guests",
        text: "No visitors or overnight guests under any circumstances.",
        label: "Check this",
        Icon: TriangleAlert,
        chip: "border-warn-line bg-warn-bg text-warn",
        row: "border-warn-line bg-warn-bg/50",
    },
    {
        title: "Reporting repairs",
        text: "Tell the landlord about urgent repairs within 48 hours.",
        label: "Standard",
        Icon: CircleCheck,
        chip: "border-ok-line bg-ok-bg text-ok",
        row: "border-ok-line bg-ok-bg/50",
    },
];

const LAST_STEP = clauses.length + 1;

const features = [
    {
        title: "Catch Unfair Rules",
        text: "We flag rules that aren't legal - like asking for three months rent up front, turning up unannounced or charging unreasonable fees.",
        Icon: ShieldAlert,
        iconClass: "bg-bad-bg text-bad",
    },
    {
        title: "Simple English Explanations",
        text: "Leases are filled with confusing legal words. We rewrite the tricky bits so you actually understand what you're agreeing to.",
        Icon: Sparkles,
        iconClass: "bg-brand-soft text-brand",
    },
    {
        title: "Rent Caps and Dates",
        text: "Check if rent hikes stay within the 2% cap, and whether any notice to leave gives you the time the law requires.",
        Icon: CalendarClock,
        iconClass: "bg-warn-bg text-warn-solid",
    },
];

const steps = [
    { title: "Upload your agreement", text: "Upload your rental agreement to get started.", Icon: Upload },
    { title: "We check the rules", text: "Review potential issues against Irish tenancy guidance.", Icon: FileSearch },
    { title: "You get a clear report", text: "Read clear explanations and relevant sources.", Icon: CircleCheck },
];

const checks = [
    { label: "Deposits", Icon: Wallet },
    { label: "Rent increases", Icon: TrendingUp },
    { label: "Notice to leave", Icon: CalendarClock },
    { label: "Repairs", Icon: Wrench },
    { label: "Landlord visits", Icon: DoorOpen },
];

const benefits = [
    { label: "Hides your personal details", Icon: EyeOff },
    { label: "Checks against Irish law", Icon: Scale },
    { label: "Flags unfair terms", Icon: Flag },
    { label: "Simple explanations", Icon: Sparkles },
    { label: "Show the sources", Icon: BookOpen}
]

function Marquee({ items, reverse = false }: { items: typeof checks; reverse?: boolean }) {
    return (
        <div className={cn("flex w-max", reverse ? "animate-marquee-reverse" : "animate-marquee")} aria-hidden>
            {[0, 1].map((copy) => (
                <div key={copy} className="flex shrink-0 gap-3 pr-3">
                    {[...items, ...items, ...items].map((item, index) => (
                        <span
                            key={index}
                            className={cn(
                                "inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold text-brand-dark",
                                reverse ? "bg-brand-soft" : "border border-line bg-white shadow-xs",
                            )}
                        >
                            <item.Icon size={16} className="text-brand" />
                            {item.label}
                        </span>
                    ))}
                </div>
            ))}
        </div>
    );
}

export function CheckChips() {
    return (
        <>
            <ul className="sr-only">
                {[...checks, ...benefits].map((item) => (
                    <li key={item.label}>{item.label}</li>
                ))}
            </ul>
            <div className="chips mt-4 space-y-3 overflow-hidden mask-[linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
                <Marquee items={checks} />
                <Marquee items={benefits} reverse />
            </div>
        </>
    );
}

function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
    const ref = useRef<HTMLDivElement>(null);
    const [shown, setShown] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setShown(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.15 },
        );
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            style={{ transitionDelay: `${delay}ms` }}
            className={cn("transition duration-700 ease-out", !shown && "motion-safe:translate-y-6 motion-safe:opacity-0", className)}
        >
            {children}
        </div>
    );
}

function LeaseScanner() {
    const [step, setStep] = useState(0);

    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            setStep(LAST_STEP);
            return;
        }
        const timer = setTimeout(() => setStep(step === LAST_STEP ? 0 : step + 1), step === LAST_STEP ? 4000 : 1600);
        return () => clearTimeout(timer);
    }, [step]);

    const done = step === LAST_STEP;
    let status = "Reading your lease";
    if (step > 0) status = `Checking clause ${step} of ${clauses.length}`;
    if (done) status = "Review ready";

    return (
        <div aria-hidden className="rounded-3xl bg-white p-4 text-ink shadow-[0_24px_60px_rgb(0_0_0/0.35)]">
            <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                    <FileText size={19} />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-brand-dark">Sample lease.pdf</p>
                    <p className="flex items-center gap-1.5 text-xs text-mute">
                        <span className={cn("size-1.5 rounded-full", done ? "bg-ok-solid" : "animate-pulse bg-brand")} />
                        {status}
                    </p>
                </div>
            </div>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface">
                <div className="h-full rounded-full bg-brand transition-all duration-700 ease-out" style={{ width: `${(step / LAST_STEP) * 100}%` }} />
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-2xl bg-surface px-3 py-2.5 text-xs">
                <span className="text-mute">Tenant</span>
                <span className="relative font-semibold">
                    Sarah Murphy
                    <span className={cn("absolute inset-y-0 left-0 rounded bg-brand-dark transition-all duration-700 ease-out", step > 0 ? "w-full" : "w-0")} />
                </span>
                <span className={cn("ml-auto inline-flex items-center gap-1 font-semibold text-brand transition-opacity duration-500", step > 0 ? "opacity-100" : "opacity-0")}>
                    <Lock size={12} /> Hidden
                </span>
            </div>

            <ul className="mt-3 space-y-2">
                {clauses.map((clause, index) => {
                    const scanning = step === index + 1;
                    const checked = step > index + 1;
                    return (
                        <li
                            key={clause.title}
                            className={cn(
                                "relative overflow-hidden rounded-2xl border p-3 transition-colors duration-500",
                                checked ? clause.row : scanning ? "border-brand/40 bg-brand-soft/60" : "border-line bg-white",
                            )}
                        >
                            {scanning && <span className="absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-white/80 to-transparent animate-sweep" />}
                            <div className="relative flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-ink">{clause.title}</p>
                                <div className="h-6">
                                    {checked && (
                                        <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold animate-pop-in", clause.chip)}>
                                            <clause.Icon size={12} />
                                            {clause.label}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <p className="relative mt-0.5 text-xs leading-relaxed text-mute">{clause.text}</p>
                        </li>
                    );
                })}
            </ul>

            <div className="mt-3 flex h-6 items-center justify-center gap-3 text-xs font-semibold">
                {done && (
                    <span className="flex items-center gap-3 animate-fade-up">
                        <span className="text-bad">1 unlawful</span>
                        <span className="text-warn">1 to check</span>
                        <span className="text-ok">1 standard</span>
                    </span>
                )}
            </div>
        </div>
    );
}

export function FeatureExample({ index }: { index: number }) {
    if (index === 0) {
        return (
            <div className="rounded-2xl bg-surface p-3 text-sm">
                <p className="text-ink/80">"...three months' rent as a deposit..."</p>
                <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-bad-line bg-bad-bg px-2.5 py-0.5 text-xs font-semibold text-bad">
                    <ShieldAlert size={12} /> Unlawful in Ireland
                </span>
            </div>
        );
    }
    if (index === 1) {
        return (
            <div className="space-y-2 rounded-2xl bg-surface p-3 text-sm">
                <p className="text-mute line-through decoration-mute/50">The Lessee shall indemnify the Lessor...</p>
                <p className="flex items-start gap-1.5 font-semibold text-brand-dark">
                    <ArrowRight size={15} className="mt-0.5 shrink-0 text-brand" />
                    You pay for damage you cause.
                </p>
            </div>
        );
    }
    return (
        <div className="rounded-2xl bg-surface p-3 text-sm">
            <div className="flex items-center justify-between text-ink/80">
                <span>Rent now</span>
                <span className="font-semibold">€1,800</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-ink/80">
                <span>New rent</span>
                <span className="font-semibold">€1,836</span>
            </div>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-ok-line bg-ok-bg px-2.5 py-0.5 text-xs font-semibold text-ok">
                <CircleCheck size={12} /> Within the 2% cap
            </span>
        </div>
    );
}

type Faq = { q: string; a: string };

export default function MobileLanding({ faqs, typedHeading }: { faqs: Faq[]; typedHeading: React.ReactNode }) {
    const [slide, setSlide] = useState(0);
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const carouselRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);
    const stepsRef = useRef<HTMLOListElement>(null);
    const stepsLineRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        function onScroll() {
            const page = document.documentElement;
            const scrolled = window.scrollY / Math.max(page.scrollHeight - window.innerHeight, 1);
            if (progressRef.current) progressRef.current.style.transform = `scaleX(${scrolled})`;

            const steps = stepsRef.current?.getBoundingClientRect();
            if (steps && stepsLineRef.current) {
                const filled = Math.min(Math.max((window.innerHeight * 0.65 - steps.top) / steps.height, 0), 1);
                stepsLineRef.current.style.transform = `scaleY(${filled})`;
            }
        }
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        onCarouselScroll();
    }, []);

    function onCarouselScroll() {
        const carousel = carouselRef.current;
        if (!carousel) return;
        const middle = carousel.scrollLeft + carousel.clientWidth / 2;
        let nearest = 0;
        let nearestDistance = Infinity;
        Array.from(carousel.children).forEach((child, index) => {
            const card = child as HTMLElement;
            const distance = Math.abs(card.offsetLeft + card.offsetWidth / 2 - middle);
            const amount = Math.min(distance / card.offsetWidth, 1);
            card.style.transform = `scale(${1 - amount * 0.08})`;
            card.style.opacity = `${1 - amount * 0.45}`;
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = index;
            }
        });
        setSlide(nearest);
    }

    function goToSlide(index: number) {
        const carousel = carouselRef.current;
        const card = carousel?.children[index] as HTMLElement | undefined;
        if (!carousel || !card) return;
        carousel.scrollTo({ left: card.offsetLeft - (carousel.clientWidth - card.offsetWidth) / 2, behavior: "smooth" });
    }

    return (
        <div className="md:hidden">
            <div className="pointer-events-none fixed inset-x-0 top-16 z-40 h-0.5">
                <div ref={progressRef} className="h-full origin-left scale-x-0 bg-linear-to-r from-brand to-[#7fd4dc]" />
            </div>

            <section data-tour="hero" className="relative overflow-hidden rounded-b-[2.5rem] bg-[radial-gradient(120%_120%_at_100%_100%,#1d6b73_0%,#0a3b43_55%,#082d33_100%)] px-4 pb-12 pt-8 text-white">
                <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.09)_1px,transparent_1px)] bg-size-[22px_22px] mask-[linear-gradient(to_bottom,black,transparent_70%)]" />
                <span className="pointer-events-none absolute -right-28 -top-28 size-80 rounded-full bg-[radial-gradient(circle,rgb(6_38_43/0.7),transparent_65%)] animate-drift" />
                <span className="pointer-events-none absolute -left-36 top-[38%] size-96 rounded-full bg-[radial-gradient(circle,rgb(29_107_115/0.55),transparent_65%)] animate-drift [animation-delay:-4s]" />

                <div className="relative flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-300 animate-fade-up">
                        <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                        Built for renters in Ireland
                    </span>
                    <PageTour tourId="hero" steps={HOME_TOUR} showButton compact autoStart={false} />
                </div>

                <h1
                    aria-label="Know what's in your lease before you sign."
                    className="relative mt-6 font-display text-[clamp(2rem,10vw,2.9rem)] font-semibold leading-[1.08] tracking-tight"
                >
                    <span className="block overflow-hidden pb-1">
                        <span className="block text-balance animate-line-up">Know what's in your lease</span>
                    </span>
                    <span className="block animate-fade-up [animation-delay:350ms]">
                        {typedHeading}
                    </span>
                </h1>

                <div className="stagger relative mt-6 space-y-6 [--delay:450ms]">
                    <p className="text-base leading-relaxed text-white/85 sm:text-lg">
                        Drop in your rental agreement. We'll hide your personal details, check the wording against Irish law, and flag any unclear or unfair terms before you sign.
                    </p>

                    <div className="space-y-4">
                        <Link
                            href="/register"
                            data-tour="get-started"
                            className="group relative flex min-h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-white text-lg font-semibold text-brand-dark shadow-[0_12px_40px_rgb(127_212_220/0.35)] transition hover:bg-brand-soft active:scale-[0.98]"
                        >
                            <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/4 bg-linear-to-r from-transparent via-brand-soft to-transparent animate-shine" />
                            <span className="relative">Get Started</span>
                            <ArrowRight size={20} className="relative transition-transform group-hover:translate-x-1" />
                        </Link>
                        <a href="#how-it-works-mobile" className="flex items-center justify-center gap-1.5 text-sm font-medium text-white/80 hover:text-white">
                            See how it works <ArrowDown size={15} />
                        </a>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-white/85">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                            <CheckCircle2 size={14} className="text-emerald-400" />
                            Residential Tenancies Acts
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                            <CheckCircle2 size={14} className="text-emerald-400" />
                            RTB Standards
                        </span>
                    </div>
                </div>

                <div
                    role="img"
                    aria-label="Example: ClauseGuard hides your personal details, then marks each clause as unlawful, worth checking or standard."
                    className="relative mt-10 animate-tilt-in"
                >
                    <div className="animate-float">
                        <div className="relative overflow-hidden rounded-[1.6rem] p-[2px] shadow-[0_30px_80px_rgb(0_0_0/0.45)]">
                            <span className="absolute -inset-1/2 bg-[conic-gradient(from_0deg,transparent_0deg,transparent_250deg,#7fd4dc_310deg,#ffffff_340deg,transparent_360deg)] animate-spin-slow" />
                            <div className="relative">
                                <LeaseScanner />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="pt-8">
                <p className="px-4 text-center text-md font-semibold text-mute">What ClauseGuard checks and does</p>
                <CheckChips />
            </section>

            <section className="pt-8">
                <Reveal className="px-4 text-center">
                    <h2 className="text-balance font-display text-3xl font-semibold tracking-tight text-brand-dark">Why use ClauseGuard?</h2>
                    <p className="mt-2 text-balance text-mute">Helps tenants in Ireland know what they're signing before they sign it.</p>
                </Reveal>

                <Reveal delay={150}>
                    <div
                        ref={carouselRef}
                        onScroll={onCarouselScroll}
                        role="region"
                        aria-label="Why use ClauseGuard"
                        tabIndex={0}
                        className="mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[7.5%] pb-6 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    >
                        {features.map((feature, index) => (
                            <article
                                key={feature.title}
                                className="flex w-[85%] max-w-sm shrink-0 snap-center flex-col rounded-3xl border border-line bg-white p-6 shadow-soft transition-[transform,opacity] duration-200 ease-out"
                            >
                                <span className={cn("grid size-12 place-items-center rounded-2xl", feature.iconClass)}>
                                    <feature.Icon size={24} />
                                </span>
                                <h3 className="mt-5 font-display text-xl font-bold text-brand-dark">{feature.title}</h3>
                                <p className="mt-2 flex-1 leading-relaxed text-mute">{feature.text}</p>
                                <div className="mt-5">
                                    <FeatureExample index={index} />
                                </div>
                            </article>
                        ))}
                    </div>

                    <div className="flex justify-center">
                        {features.map((feature, index) => (
                            <button
                                key={feature.title}
                                type="button"
                                onClick={() => goToSlide(index)}
                                aria-label={`Show ${feature.title}`}
                                aria-current={slide === index}
                                className="grid cursor-pointer place-items-center"
                            >
                                <span className={cn("h-2 rounded-full transition-all duration-300", slide === index ? "w-6 bg-brand-dark" : "w-2 bg-line")} />
                            </button>
                        ))}
                    </div>
                </Reveal>
            </section>

            <section id="how-it-works-mobile" data-tour="how-it-works" className="mt-10 scroll-mt-20 bg-surface px-4 py-14">
                <Reveal className="text-center">
                    <h2 className="font-display text-3xl font-semibold tracking-tight text-brand-dark">How it works</h2>
                    <p className="mt-2 text-balance text-mute">Three simple steps before you sign on the dotted line.</p>
                </Reveal>

                <ol ref={stepsRef} className="relative mx-auto mt-8 max-w-xl space-y-4">
                    <span className="absolute bottom-6 left-[21px] top-6 w-0.5 rounded-full bg-brand/15" />
                    <span ref={stepsLineRef} className="absolute bottom-6 left-[21px] top-6 w-0.5 origin-top scale-y-0 rounded-full bg-linear-to-b from-brand to-[#7fd4dc]" />
                    {steps.map((step, index) => (
                        <li key={step.title} className="relative">
                            <Reveal delay={index * 120} className="flex gap-4">
                                <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-brand-dark font-bold text-white ring-4 ring-surface">
                                    {index + 1}
                                </span>
                                <div className="flex-1 rounded-2xl border border-line bg-white p-4 shadow-xs">
                                    <h3 className="flex items-center gap-2 font-display text-lg font-bold text-brand-dark">
                                        <step.Icon size={19} className="shrink-0 text-brand" />
                                        {step.title}
                                    </h3>
                                    <p className="mt-1.5 leading-relaxed text-mute">{step.text}</p>
                                </div>
                            </Reveal>
                        </li>
                    ))}
                </ol>
                <Reveal delay={200} className="mt-6 text-center">
                    <Link href="/register" className="group inline-flex min-h-12 items-center gap-1.5 px-2 font-semibold text-brand-dark underline decoration-brand/30 underline-offset-4 hover:decoration-brand">
                        Try it with your lease
                        <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                    </Link>
                </Reveal>
            </section>

            <section className="px-4 py-14">
                <Reveal className="text-center">
                    <h2 className="text-balance font-display text-3xl font-semibold tracking-tight text-brand-dark">Frequently asked questions</h2>
                    <p className="mt-2 text-balance text-mute">Common questions about using ClauseGuard.</p>
                </Reveal>

                <div className="mx-auto mt-8 max-w-xl space-y-3">
                    {faqs.map((faq, index) => {
                        const isOpen = openFaq === index;
                        return (
                            <Reveal key={faq.q} delay={index * 80}>
                                <div className={cn("rounded-2xl border bg-white transition-all duration-300", isOpen ? "border-brand/40 shadow-soft" : "border-line")}>
                                    <button
                                        type="button"
                                        onClick={() => setOpenFaq(isOpen ? null : index)}
                                        aria-expanded={isOpen}
                                        aria-controls={`mobile-faq-${index}`}
                                        className="flex w-full cursor-pointer items-center justify-between gap-3 p-4 text-left font-semibold text-brand-dark"
                                    >
                                        {faq.q}
                                        <span className={cn("grid size-8 shrink-0 place-items-center rounded-full transition-all duration-300", isOpen ? "rotate-180 bg-brand-dark text-white" : "bg-surface text-mute")}>
                                            <ChevronDown size={17} />
                                        </span>
                                    </button>
                                    <div
                                        id={`mobile-faq-${index}`}
                                        inert={!isOpen}
                                        className={cn("grid transition-[grid-template-rows] duration-300 ease-out", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
                                    >
                                        <div className="overflow-hidden">
                                            <p className="px-4 pb-4 text-sm leading-relaxed text-mute">{faq.a}</p>
                                        </div>
                                    </div>
                                </div>
                            </Reveal>
                        );
                    })}
                </div>
            </section>

            <section className="px-4 pb-12">
                <Reveal>
                    <div className="relative overflow-hidden rounded-[2rem] bg-[radial-gradient(120%_120%_at_100%_100%,#1d6b73_0%,#0a3b43_55%,#082d33_100%)] px-6 py-12 text-center text-white">
                        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.08)_1px,transparent_1px)] bg-size-[22px_22px]" />
                        <span className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[radial-gradient(circle,rgb(6_38_43/0.7),transparent_65%)] animate-drift" />
                        <span className="pointer-events-none absolute -bottom-24 -right-24 size-80 rounded-full bg-[radial-gradient(circle,rgb(127_212_220/0.3),transparent_65%)] animate-drift [animation-delay:-2s]" />

                        <h2 className="relative text-balance font-display text-3xl font-semibold">Don't sign until you're sure.</h2>
                        <p className="relative mt-3 text-balance text-white/80">Upload your lease right now for a simplified breakdown.</p>
                        <div className="relative mt-8 space-y-2">
                            <Link
                                href="/register"
                                className="group flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white text-lg font-semibold text-brand-dark animate-cta-pulse transition hover:bg-brand-soft active:scale-[0.98]"
                            >
                                Check my lease
                                <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
                            </Link>
                            <p className="text-sm text-white/75">
                                Already have an account?{" "}
                                <Link href="/login" className="inline-flex min-h-12 items-center px-1 font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">
                                    Log in
                                </Link>
                            </p>
                        </div>
                    </div>
                </Reveal>
            </section>
        </div>
    );
}