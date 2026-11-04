import { ArrowDown, FileSearch, MessageCircleQuestion, MailWarning, CalendarClock, FileText, ArrowRight, Scale, Lock, Trash2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const RISK = {
    red: { dot: "bg-bad-solid", tag: "bg-bad-bg text-bad" },
    amber: { dot: "bg-warn-solid", tag: "bg-warn-bg text-warn" },
    green: { dot: "bg-ok-solid", tag: "bg-ok-bg text-ok" },
    teal: { dot: "bg-brand", tag: "bg-brand-soft text-brand" },
};

const TILE_CARDS = [
    {
        title: "Check your lease",
        text: "Every clause sorted into high, medium and low risk, explained in plain English with what to ask your landlord.",
        icon: FileSearch,
        iconTone: "bg-brand-soft text-brand",
        image: "/illustrations/lease.svg",
        href: "upload",
        alt: "A lease page with clauses marked red, amber and green",
        link: "Upload a lease"
    },
    {
        title: "Check a landlord's notice",
        text: "Got a rent increase or a notice to leave? Check if it follows the rules before you reply.",
        icon: MailWarning,
        iconTone: "bg-warn-bg text-warn",
        image: "/illustrations/notice.svg",
        link: "Check a notice",
        href: "/notices",
        alt: "A letter from a landlord with a warning mark"
    },
    {
        title: "Never miss a date",
        text: "Rent day, rent reviews and notice deadlines in one timeline, with reminders if you want them.",
        icon: CalendarClock,
        iconTone: "bg-ok-bg text-ok",
        image: "/illustrations/dates.svg",
        link: "Add a date",
        href: "/timeline",
        alt: "A calendar with important tenancy dates marked"
    },
    {
        title: "Ask about any clause",
        text: "Not sure what something means? Ask ClauseGuard and get an answer based on your own lease.",
        icon: MessageCircleQuestion,
        iconTone: "bg-brand-soft text-brand",
        image: "/illustrations/ask.svg",
        link: "Try it on the sample",
        href: "/lease/try",
        alt: "A question about a clause and an answer from ClauseGuard"
    },
]

export default function FeatureTiles() {
    return (
        <>
            <div className="justify-center flex">
                <a href="#features" className="inline-flex items-center gap-3 rounded-full border border-line bg-white py-2 pl-5 pr-2 font-semibold text-brand-dark shadow-soft hover:border-brand">
                    See everything ClauseGuard does
                    <span className="grid size-8 place-items-center rounded-full bg-brand text-white">
                        <ArrowDown size={18} />
                    </span>
                </a>
            </div>

            <section id="features" data-tour="features" className="mx-auto mt-14 max-w-5xl scroll-mt-20">
                <h2 className="text-center font-display text-3xl font-semibold text-brand-dark">Everything ClauseGuard does for renters</h2>
                <p className="mt-2 text-center text-mute">One place for your lease, your landlord's letters and your important dates.</p>

                <div className="mt-8 grid gap-5 *:min-w-0 md:grid-cols-2">
                    {TILE_CARDS.map((tile) => (
                        <div key={tile.title} className="flex flex-col rounded-3xl border border-line bg-white p-5 shadow-soft">
                            <Image src={tile.image} alt={tile.alt} width={560} height={240} className="h-auto w-full rounded-2xl" />
                            <h3 className="mt-5 flex items-center gap-2.5 text-lg font-bold text-ink">
                                <span className={`grid size-8 place-items-center rounded-lg ${tile.iconTone}`}>
                                    <tile.icon size={17} />
                                </span>
                                {tile.title}
                            </h3>
                            <p className="mt-1.5 flex-1 leading-relaxed text-mute">{tile.text}</p>
                            {tile.href === "upload" ? (
                                <label htmlFor="lease-file" className="mt-4 inline-flex w-fit cursor-pointer items-center gap-1.5 font-semibold text-brand hover:underline">
                                    {tile.link}
                                    <ArrowRight size={16} />
                                </label>
                            ) : (
                                <Link href={tile.href} className="mt-4 inline-flex w-fit items-center gap-1.5 font-semibold text-brand hover:underline">
                                    {tile.link}
                                    <ArrowRight size={16} />
                                </Link>
                            )}
                        </div>
                    ))}
                </div>

                <div className="mt-10 flex flex-wrap justify-center gap-x-7 gap-y-2 text-sm text-mute">
                    <span className="inline-flex items-center gap-2">
                        <Scale size={16} className="text-ok-solid" />
                        Built on Irish tenancy law and RTB guidance
                    </span>
                    <span className="inline-flex items-center gap-2">
                        <Lock size={16} className="text-ok-solid" />
                        Personal details removed
                    </span>
                    <span className="inline-flex items-center gap-2">
                        <Trash2 size={16} className="text-ok-solid" />
                        Delete your lease any time
                    </span>
                </div>
            </section>
        </>
    )
}