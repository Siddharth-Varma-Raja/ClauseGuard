"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, FileText, Loader2, MessageCircleQuestion, Send, X } from "lucide-react";
import { askAboutClause, askAboutLease, errorMessage } from "@/lib/api";
import type { ChatMessage, Clause } from "@/lib/notice-types";
import { STATUS } from "@/lib/status";
import { cn } from "@/lib/cn";

type Message = ChatMessage & { clause?: Pick<Clause, "id" | "number" | "title"> };

const CLAUSE_SUGGESTIONS = ["Is this clause legal in Ireland?", "What should I ask my landlord to change?", "What happens if I sign it as it is?"];
const GENERAL_SUGGESTIONS = ["Which clauses should I worry about most?", "Is my deposit within the legal limit?", "What should I ask my landlord before signing?"];
const MAX_QUESTION_LENGTH = 1000;

export default function AskClauseGuard({
  analysisId,
  open,
  reference,
  onOpenChange,
  onClearReference,
}: {
  analysisId: string;
  open: boolean;
  reference: Clause | null;
  onOpenChange: (open: boolean) => void;
  onClearReference: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, reference?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const history = messages;
    const about = reference ? { id: reference.id, number: reference.number, title: reference.title } : undefined;
    setMessages([...history, { role: "user", text: trimmed, clause: about }]);
    setQuestion("");
    setError("");
    setSending(true);

    const plainHistory: ChatMessage[] = history.map(({ role, text: t }) => ({ role, text: t }));
    try {
      const answer = about
        ? await askAboutClause(analysisId, about.id, trimmed, plainHistory)
        : await askAboutLease(analysisId, trimmed, plainHistory);
      setMessages((prev) => [...prev, { role: "assistant", text: answer }]);
    } catch (err) {
      setMessages(history);
      setQuestion(trimmed);
      setError(errorMessage(err, "We couldn't get an answer. Please try again."));
    } finally {
      setSending(false);
    }
  }

  const suggestions = reference ? CLAUSE_SUGGESTIONS : GENERAL_SUGGESTIONS;

  return (
    <>
      <section
        role="dialog"
        aria-label="Ask ClauseGuard"
        aria-hidden={!open}
        className={cn(
          "fixed inset-x-3 bottom-24 z-50 flex h-[min(600px,calc(100vh-8rem))] origin-bottom-right flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-2xl transition-all duration-300 ease-out motion-reduce:transition-none sm:inset-x-auto sm:right-6 sm:w-[400px]",
          open ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-4 scale-95 opacity-0",
        )}
      >
        <header className="flex items-center justify-between gap-3 bg-brand-dark px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-full bg-white/15">
              <MessageCircleQuestion size={19} aria-hidden />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold leading-tight">Ask ClauseGuard</h2>
              <p className="text-xs text-white/70">Questions about your lease</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Collapse chat"
            title="Collapse"
            className="grid size-9 cursor-pointer place-items-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white"
          >
            <ChevronDown size={20} />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-auto p-4">
          {messages.length === 0 && (
            <div>
              <p className="text-sm text-mute">
                {reference
                  ? "Ask anything about the referenced clause. Try one of these:"
                  : "Ask anything about your lease. Try one of these:"}
              </p>
              <ul className="mt-3 space-y-2">
                {suggestions.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => ask(s)}
                      className="w-full cursor-pointer rounded-xl border border-line px-3 py-2 text-left text-sm text-brand-dark transition-colors hover:border-brand hover:bg-brand-soft"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={cn("flex flex-col", m.role === "user" ? "items-end" : "items-start")}>
              {m.clause && (
                <span className="mb-1 inline-flex max-w-[85%] items-center gap-1 truncate rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-dark">
                  <FileText size={11} aria-hidden />
                  Clause {m.clause.number} · {m.clause.title}
                </span>
              )}
              <p
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  m.role === "user" ? "rounded-br-md bg-brand text-white" : "rounded-bl-md bg-surface text-ink",
                )}
              >
                {m.text}
              </p>
            </div>
          ))}

          {sending && (
            <p role="status" className="flex items-center gap-2 text-sm text-mute">
              <Loader2 size={16} className="animate-spin" aria-hidden /> Thinking…
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
          className="border-t border-line p-3"
        >
          {error && (
            <p role="alert" className="mb-2 rounded-xl border border-bad-line bg-bad-bg p-2.5 text-sm text-bad">
              {error}
            </p>
          )}

          <div className="rounded-2xl border border-line bg-white transition-colors focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
            {reference && (
              <div className="px-2.5 pt-2.5">
                <span
                  key={reference.id}
                  className="inline-flex max-w-full animate-pop-in items-center gap-1.5 rounded-xl border border-line bg-surface py-1 pl-2 pr-1 text-xs"
                >
                  <span className={cn("size-2 shrink-0 rounded-full", STATUS[reference.status].solid)} aria-hidden />
                  <FileText size={13} className="shrink-0 text-brand" aria-hidden />
                  <span className="truncate font-semibold text-ink">
                    Clause {reference.number} · {reference.title}
                  </span>
                  <span className="shrink-0 text-mute">p. {reference.page}</span>
                  <button
                    type="button"
                    onClick={onClearReference}
                    aria-label={`Remove clause ${reference.number} and ask in general`}
                    title="Remove (ask in general)"
                    className="grid size-5 shrink-0 cursor-pointer place-items-center rounded-full text-mute transition-colors hover:bg-line hover:text-ink"
                  >
                    <X size={12} />
                  </button>
                </span>
              </div>
            )}
            <div className="flex items-end gap-2 p-1.5 pl-3">
              <label htmlFor="ask-clauseguard-question" className="sr-only">
                Your question
              </label>
              <textarea
                id="ask-clauseguard-question"
                ref={inputRef}
                rows={2}
                value={question}
                maxLength={MAX_QUESTION_LENGTH}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    ask(question);
                  }
                }}
                placeholder={reference ? `Ask about clause ${reference.number}…` : "Ask about your lease…"}
                className="min-h-10 flex-1 resize-none bg-transparent py-1.5 text-sm"
                style={{ outline: "none" }}
              />
              <button
                type="submit"
                disabled={sending || !question.trim()}
                aria-label="Send question"
                className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-brand text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send size={17} />
              </button>
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-mute">AI answers are general information, not legal advice.</p>
        </form>
      </section>

      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-label={open ? "Collapse Ask ClauseGuard" : "Open Ask ClauseGuard"}
        title={open ? "Collapse" : "Ask ClauseGuard"}
        data-tour="ask-clauseguard"
        className="fixed bottom-6 right-6 z-50 grid size-14 cursor-pointer place-items-center rounded-full bg-brand-dark text-white shadow-xl transition-all duration-300 hover:scale-105 hover:bg-brand"
      >
        <span key={open ? "open" : "closed"} className="animate-pop-in">
          {open ? <ChevronDown size={24} /> : <MessageCircleQuestion size={24} />}
        </span>
        {!open && reference && (
          <span className="absolute right-1 top-1 size-3.5 rounded-full border-2 border-white bg-warn-solid" aria-hidden />
        )}
      </button>
    </>
  );
}
