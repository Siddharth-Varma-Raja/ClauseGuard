"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Send, X } from "lucide-react";
import { askAboutClause, errorMessage } from "@/lib/api";
import type { ChatMessage, Clause } from "@/lib/notice-types";
import { cn } from "@/lib/cn";

const SUGGESTIONS = ["Is this clause legal in Ireland?", "What should I ask my landlord to change?", "What happens if I sign it as it is?"];
const MAX_QUESTION_LENGTH = 1000;

export default function ClauseChat({
    analysisId,
    clause,
    onClose,
}: {
    analysisId: string;
    clause: Clause;
    onClose: () => void;
}) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [question, setQuestion] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => inputRef.current?.focus(), []);
    useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, sending]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    async function ask(text: string) {
        const trimmed = text.trim();
        if (!trimmed || sending) return;

        const history = messages;
        setMessages([...history, { role: "user", text: trimmed }]);
        setQuestion("");
        setError("");
        setSending(true);

        try {
            const answer = await askAboutClause(analysisId, clause.id, trimmed, history);
            setMessages((prev) => [...prev, { role: "assistant", text: answer }]);
        } catch (err) {
            setMessages(history);
            setQuestion(trimmed);
            setError(errorMessage(err, "We couldn't get an answer. Please try again."));
        } finally {
            setSending(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="clause-chat-title">
            <button type="button" aria-label="Close chat" onClick={onClose} className="absolute inset-0 cursor-default bg-brand-dark/30" />

            <section className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
                <header className="flex items-start justify-between gap-3 border-b border-line p-5">
                    <div className="min-w-0">
                        <p className="flex items-center gap-2 text-sm font-semibold text-brand">
                            <MessageCircle size={16} aria-hidden /> Ask about this clause
                        </p>
                        <h2 id="clause-chat-title" className="mt-1 truncate font-display text-xl font-semibold text-brand-dark">
                            {clause.number}. {clause.title}
                        </h2>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="cursor-pointer rounded-lg p-1.5 text-mute hover:bg-surface">
                        <X size={20} />
                    </button>
                </header>

                <div className="flex-1 space-y-4 overflow-auto p-5">
                    {messages.length === 0 && (
                        <div>
                            <p className="text-sm text-mute">Ask anything about this clause. Try one of these:</p>
                            <ul className="mt-3 space-y-2">
                                {SUGGESTIONS.map((s) => (
                                    <li key={s}>
                                        <button
                                            type="button"
                                            onClick={() => ask(s)}
                                            className="w-full cursor-pointer rounded-xl border border-line px-3 py-2 text-left text-sm text-brand-dark hover:border-brand hover:bg-brand-soft"
                                        >
                                            {s}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {messages.map((m, i) => (
                        <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                            <p
                                className={cn(
                                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                                    m.role === "user" ? "bg-brand text-white" : "bg-surface text-ink",
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
                    className="border-t border-line p-4"
                >
                    {error && (
                        <p role="alert" className="mb-3 rounded-xl border border-bad-line bg-bad-bg p-3 text-sm text-bad">
                            {error}
                        </p>
                    )}
                    <div className="flex items-end gap-2">
                        <label htmlFor="clause-question" className="sr-only">Your question</label>
                        <textarea
                            id="clause-question"
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
                            placeholder="Type your question…"
                            className="min-h-11 flex-1 resize-none rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                        />
                        <button
                            type="submit"
                            disabled={sending || !question.trim()}
                            aria-label="Send question"
                            className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl bg-brand text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                    <p className="mt-2 text-xs text-mute">AI answers are general information, not legal advice.</p>
                </form>
            </section>
        </div>
    );
}