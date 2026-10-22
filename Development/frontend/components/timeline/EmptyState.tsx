import { CalendarClock } from "lucide-react";

export default function EmptyState({ onAdd, className }: { onAdd: () => void; className?: string }) {
    return (
        <div data-tour="event-list" className="mt-6 rounded-2xl border border-line bg-white p-6 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand">
                <CalendarClock size={25} />
            </div>
            <h2 className="mt-5 font-display text-xl font-semibold text-brand-dark">No events yet</h2>
            <p className="mx-auto mt-2 max-w-md text-mute">
                Add an event to keep track of your tenancy timeline.
            </p>
            <button
                onClick={onAdd}
                className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-semibold text-white"
            >
                Add first event
            </button>
        </div>
    );
}