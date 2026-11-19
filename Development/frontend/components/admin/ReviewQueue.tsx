"use client";

import { useState } from "react";
import { Check, CircleCheck, CircleX, Inbox, LoaderCircle, X } from "lucide-react";
import Pager from "@/components/timeline/Pager";
import type { CorrectionStatus, ReviewCorrection } from "@/lib/notice-types";
import { topicLabel, useTopics, type Topic } from "@/lib/topics";
import { TopicChip, day } from "./shared";

const PAGE_SIZE = 8;

type Decide = (row: ReviewCorrection, status: CorrectionStatus) => void;

function Decision({ row, busy, topics, onDecide }: { row: ReviewCorrection; busy: boolean; topics: Topic[]; onDecide: Decide }) {
  if (busy) {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-mute">
        <LoaderCircle size={16} aria-hidden className="animate-spin" />
        Saving
      </span>
    );
  }
  if (row.status !== "pending") {
    const approved = row.status === "approved";
    return (
      <span className="inline-flex items-center gap-2.5">
        <span
          className={
            approved
              ? "inline-flex items-center gap-1.5 rounded-full bg-ok-bg px-2.5 py-1 text-[13px] font-semibold text-ok ring-1 ring-ok-line"
              : "inline-flex items-center gap-1.5 rounded-full bg-bad-bg px-2.5 py-1 text-[13px] font-semibold text-bad ring-1 ring-bad-line"
          }
        >
          {approved ? <CircleCheck size={14} aria-hidden /> : <CircleX size={14} aria-hidden />}
          {approved ? "Approved" : "Rejected"}
        </span>
        <button type="button" onClick={() => onDecide(row, "pending")} className="cursor-pointer text-[13px] font-semibold text-brand underline underline-offset-[3px] hover:text-brand-dark">
          Undo
        </button>
      </span>
    );
  }
  return (
    <span className="inline-flex gap-2">
      <button
        type="button"
        onClick={() => onDecide(row, "approved")}
        aria-label={`Approve: ${topicLabel(row.userTopic, topics)}`}
        className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-ok-solid px-3.5 text-sm font-semibold text-white hover:bg-ok focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ok"
      >
        <Check size={15} aria-hidden />
        Approve
      </button>
      <button
        type="button"
        onClick={() => onDecide(row, "rejected")}
        aria-label={`Reject: ${topicLabel(row.userTopic, topics)}`}
        className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-bad-line bg-white px-3.5 text-sm font-semibold text-bad hover:bg-bad-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bad"
      >
        <X size={15} aria-hidden />
        Reject
      </button>
    </span>
  );
}

function Meta({ row }: { row: ReviewCorrection }) {
  return (
    <span className="mt-1 block text-xs text-mute">
      {row.note ? <>Note: “{row.note}”</> : "No note"} · {day(row.createdAt)}
    </span>
  );
}

export default function ReviewQueue({
  rows,
  busy,
  errors,
  onDecide,
}: {
  rows: ReviewCorrection[];
  busy: string[];
  errors: Record<string, string>;
  onDecide: Decide;
}) {
  const topics = useTopics();
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const shown = rows.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  const first = current * PAGE_SIZE + 1;

  return (
    <section aria-labelledby="queue-title" className="mt-4 rounded-3xl border border-[#d5e3e4] bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="queue-title" className="font-display text-[21px] font-semibold text-brand-dark">
          Queue
        </h2>
        <p className="text-xs text-mute">Oldest first. Clause text has personal details removed.</p>
      </div>

      {rows.length === 0 ? (
        <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-neu-line bg-surface/60 px-6 py-12 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-ok-bg text-ok">
            <Inbox size={26} aria-hidden />
          </span>
          <p className="mt-3 font-semibold text-ink">Nothing waiting for review</p>
          <p className="mt-1 max-w-sm text-sm text-mute">New corrections from tenants will show up here.</p>
        </div>
      ) : (
        <>
          <div className="mt-3 hidden lg:block">
            <table className="w-full table-fixed border-collapse text-left text-sm">
              <thead>
                <tr className="border-y border-line text-xs font-bold uppercase tracking-wide text-mute">
                  <th scope="col" className="w-[44%] px-2 py-2.5">
                    Clause
                  </th>
                  <th scope="col" className="px-2 py-2.5">
                    ClauseGuard said
                  </th>
                  <th scope="col" className="px-2 py-2.5">
                    Tenant said
                  </th>
                  <th scope="col" className="w-[220px] px-2 py-2.5">
                    Your decision
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => (
                  <tr key={row.id} className="border-b border-line align-middle">
                    <td className="px-2 py-3.5 text-ink">
                      <span className="line-clamp-3">{row.clauseText}</span>
                      <Meta row={row} />
                    </td>
                    <td className="px-2 py-3.5">
                      <TopicChip label={topicLabel(row.modelTopic, topics)} />
                    </td>
                    <td className="px-2 py-3.5">
                      <TopicChip label={topicLabel(row.userTopic, topics)} strong />
                    </td>
                    <td className="px-2 py-3.5">
                      <Decision row={row} busy={busy.includes(row.id)} topics={topics} onDecide={onDecide} />
                      {errors[row.id] && (
                        <p role="alert" className="mt-1.5 text-xs font-medium text-bad">
                          {errors[row.id]}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="mt-3 divide-y divide-line border-t border-line lg:hidden">
            {shown.map((row) => (
              <li key={row.id} className="py-4">
                <p className="text-[15px] text-ink">{row.clauseText}</p>
                <Meta row={row} />
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-mute">
                  <TopicChip label={topicLabel(row.modelTopic, topics)} />
                  <span aria-hidden>→</span>
                  <span className="sr-only">tenant suggested</span>
                  <TopicChip label={topicLabel(row.userTopic, topics)} strong />
                </div>
                <div className="mt-3">
                  <Decision row={row} busy={busy.includes(row.id)} topics={topics} onDecide={onDecide} />
                  {errors[row.id] && (
                    <p role="alert" className="mt-1.5 text-xs font-medium text-bad">
                      {errors[row.id]}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between pt-3">
            <span className="text-xs text-mute">
              Showing {first}–{first + shown.length - 1} of {rows.length}
            </span>
            <Pager page={current} pages={pages} label="Pages of the review queue" onChange={setPage} />
          </div>
        </>
      )}
    </section>
  );
}
