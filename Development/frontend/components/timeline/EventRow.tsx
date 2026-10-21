import { TimelineEvent, EventSource, EventKind } from "@/lib/types";
import { Trash2, Undo2, Check } from "lucide-react";
import Card from "../ui/Card";
import SmallPill from "./SmallPill";

const SOURCE: Record<EventSource, string | null> = {
    user: null,
    lease: "From your lease",
    notice: "From a notice check",
};

const KIND: Record<EventKind, { label: string; pill: string }> = {
    deadline: { label: "Deadline", pill: "border-warn-line bg-warn-bg text-warn" },
    rent: { label: "Rent", pill: "border-ok-line bg-ok-bg text-ok" },
    event: { label: "Event", pill: "border-brand/20 bg-brand-soft text-brand-dark" },
};

export default function EventRow({
    event,
    today,
    past,
    onToggleDone,
    onDelete
}: {
    event: TimelineEvent,
    today: string,
    past: boolean,
    onToggleDone: () => void,
    onDelete: () => void
}) {
    const date = new Date(`${event.date}T00:00:00`);
    const day = date.getDate();
    const month = date.toLocaleString("en-IE", { month: "short" });
    const year = date.getFullYear();
    const source = SOURCE[event.source];
    return (
        <li className="relative flex gap-3">
            <div className="z-10 grid size-14 shrink-0 place-items-center sm:size-[72px] rounded-2xl border border-line bg-white text-center shadow-soft">
                <div>
                    <p className="font-display text-xl font-semibold leading-none text-brand-dark">{day}</p>
                    <p className="text-xs font-bold uppercase text-mute">{month} {year}</p>
                </div>
            </div>

            <Card className="flex min-w-0 flex-1 items-start gap-2 p-3 sm:gap-3 sm:p-4">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border px-2.5 py-0.5 text-xs font-bold">
                            {KIND[event.kind].label}
                        </span>
                        {event.done && <SmallPill>Done</SmallPill>}
                        {!event.done && event.date < today && <SmallPill>Passed</SmallPill>}
                        {source && <SmallPill brand>{source}</SmallPill>}
                    </div>
                    <p className="mt-1.5 font-semibold line-through decoration-mute">{event.title}</p>
                    {event.note && <p className="text-mute">{event.note}</p>}
                </div>

                <div className="flex gap-1">
                    <button
                        onClick={onToggleDone}
                        aria-label={event.done ? `Mark "${event.title}" as not done` : `Mark "${event.title}" as done`}
                        title={event.done ? "Mark as not done" : "Mark as done"}
                        className="cursor-pointer rounded-lg p-2 text-mute hover:bg-surface hover:text-brand"
                    >
                        {event.done ? <Undo2 size={17} /> : <Check size={17} />}
                    </button>
                    <button
                        onClick={onDelete}
                        aria-label={`Delete "${event.title}"`}
                        title="Delete"
                        className="cursor-pointer rounded-lg p-2 text-mute hover:bg-bad-bg hover:text-bad"
                    >
                        <Trash2 size={17} />
                    </button>
                </div>
            </Card>
        </li>


    )
}