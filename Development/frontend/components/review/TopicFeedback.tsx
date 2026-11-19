"use client";

import { useId, useState } from "react";
import { CircleCheck, Clock3, LoaderCircle, Lock, Tag, TriangleAlert } from "lucide-react";
import { errorMessage, sendTopicCorrection } from "@/lib/api";
import type { Clause, TopicCorrection } from "@/lib/notice-types";
import { TOPICS, clauseTopic, topicLabel } from "@/lib/topics";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/cn";

const NOTE_MAX = 300;

const STATE = {
  pending: { Icon: Clock3, box: "border-[#cfe1e2] bg-brand-soft/70", icon: "text-brand", title: "Waiting for our team to check it" },
  approved: { Icon: CircleCheck, box: "border-ok-line bg-ok-bg", icon: "text-ok", title: "Our team agreed and will use it in the next update" },
  rejected: { Icon: Tag, box: "border-line bg-surface", icon: "text-mute", title: "Our team checked it and kept the original topic" },
};

export default function TopicFeedback({
  analysisId,
  clause,
  demo,
  onSent,
}: {
  analysisId: string;
  clause: Clause;
  demo: boolean;
  onSent: (correction: TopicCorrection) => void;
}) {
  const current = clauseTopic(clause);
  const choices = TOPICS.filter((t) => t.value !== current);
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const ids = useId();

  if (!current) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!topic) {
      setMissing(true);
      return;
    }
    setSending(true);
    setError("");
    try {
      const saved = demo
        ? { id: "demo", topic, note, status: "pending" as const, createdAt: new Date().toISOString() }
        : await sendTopicCorrection(analysisId, clause.id, topic, note.trim());
      setJustSent(true);
      setOpen(false);
      onSent(saved);
    } catch (err) {
      setError(errorMessage(err, "We couldn't send that. Check your connection and try again."));
    } finally {
      setSending(false);
    }
  }

  const sent = clause.correction;
  const SentIcon = justSent || !sent ? CircleCheck : STATE[sent.status].Icon;

  return (
    <section aria-label="Clause topic" className="border-t border-line pt-4">
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-mute">
        <Tag size={14} aria-hidden className="shrink-0" />
        Topic found by ClauseGuard:
        <span className="rounded-full bg-surface px-2 py-0.5 text-[13px] font-semibold text-ink ring-1 ring-line">{topicLabel(current)}</span>
        {!sent && !open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={false}
            aria-controls={`${ids}-form`}
            className="cursor-pointer rounded font-semibold text-brand underline underline-offset-[3px] hover:text-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Is this topic wrong?
          </button>
        )}
      </p>

      {sent && (
        <div role="status" className={cn("mt-3 flex gap-3 rounded-2xl border p-3.5 text-sm", justSent ? "border-ok-line bg-ok-bg" : STATE[sent.status].box)}>
          <SentIcon size={20} aria-hidden className={cn("mt-0.5 shrink-0", justSent ? "text-ok" : sent && STATE[sent.status].icon)} />
          <div>
            <p className="font-semibold text-ink">{justSent ? "Thanks, we got it." : `You suggested: ${topicLabel(sent.topic)}`}</p>
            <p className="mt-0.5 text-mute">
              {justSent ? (
                <>
                  You suggested <b className="font-semibold text-ink">{topicLabel(sent.topic)}</b>. Our team will check it before it is used.
                </>
              ) : (
                <>
                  {STATE[sent.status].title} · sent {fmtDate(sent.createdAt.slice(0, 10))}
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {open && !sent && (
        <form id={`${ids}-form`} onSubmit={submit} noValidate className="mt-3 animate-pop-in rounded-2xl border border-[#cfe1e2] bg-[#f3f9f9] p-4">
          <p className="font-semibold text-brand-dark">Help us improve: what is this clause about?</p>

          <label htmlFor={`${ids}-topic`} className="mt-3 block text-sm font-semibold text-ink">
            Correct topic
          </label>
          <select
            id={`${ids}-topic`}
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value);
              setMissing(false);
            }}
            aria-invalid={missing}
            aria-describedby={missing ? `${ids}-missing` : undefined}
            className={cn(
              "mt-1.5 min-h-11 w-full cursor-pointer rounded-xl border bg-white px-3 text-[15px] text-ink focus:outline-none focus:ring-2 focus:ring-brand/30",
              missing ? "border-bad-solid" : "border-[#cdd8db] focus:border-brand",
            )}
          >
            <option value="">Choose a topic</option>
            {choices.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          {missing && (
            <p id={`${ids}-missing`} className="mt-1 text-[13px] font-medium text-bad">
              Pick the topic you think is right.
            </p>
          )}

          <label htmlFor={`${ids}-note`} className="mt-3 block text-sm font-semibold text-ink">
            Note <span className="font-normal text-mute">(optional)</span>
          </label>
          <textarea
            id={`${ids}-note`}
            value={note}
            maxLength={NOTE_MAX}
            rows={2}
            onChange={(e) => setNote(e.target.value)}
            placeholder="For example: this is about letting contractors in, not a fee"
            className="mt-1.5 w-full resize-none rounded-xl border border-[#cdd8db] bg-white px-3 py-2.5 text-[15px] text-ink placeholder:text-[#8a989e] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
          <p className="text-right text-xs tabular-nums text-mute">
            {note.length}/{NOTE_MAX}
          </p>

          {error && (
            <p role="alert" className="mt-2 flex items-start gap-2 rounded-xl border border-bad-line bg-bad-bg px-3 py-2.5 text-sm text-bad">
              <TriangleAlert size={16} aria-hidden className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={sending}
              className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-wait disabled:opacity-70"
            >
              {sending && <LoaderCircle size={16} aria-hidden className="animate-spin" />}
              {sending ? "Sending" : error ? "Try again" : "Send feedback"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError("");
                setMissing(false);
              }}
              disabled={sending}
              className="min-h-10 cursor-pointer rounded-xl border border-line bg-white px-4 text-sm font-semibold text-brand-dark hover:bg-surface disabled:opacity-50"
            >
              Cancel
            </button>
          </div>

          <p className="mt-3 flex gap-2 text-xs leading-relaxed text-mute">
            <Lock size={13} aria-hidden className="mt-0.5 shrink-0" />
            Our team checks every correction before it is used to improve ClauseGuard. Your lease stays inside ClauseGuard and is never sent to a public AI service.
          </p>
        </form>
      )}
    </section>
  );
}
