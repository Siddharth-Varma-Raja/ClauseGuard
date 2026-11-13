import { useState } from "react";
import { House, Plus } from "lucide-react";
import Pager from "@/components/timeline/Pager";
import type { NoticeType } from "@/lib/notice-types";
import type { NoticeLease } from "./LeasePicker";

export type Answer = "yes" | "no" | "unsure";
export type Values = Record<string, string>;

type Question = { name: string; question: string; hint: string };

export const QUESTIONS: Record<NoticeType, Question[]> = {
  termination: [
    { name: "isWritten", question: "Is it a written notice?", hint: "Not a text message or a phone call." },
    { name: "isSigned", question: "Is it signed by the landlord or their agent?", hint: "Look for a signature at the end." },
    { name: "hasStatutoryDeclaration", question: "Did a statutory declaration come with it?", hint: "A signed statement, needed for some reasons such as a sale." },
    { name: "copySentToRtb", question: "Does it say a copy was sent to the RTB?", hint: "The Residential Tenancies Board." },
    { name: "disputeRights", question: "Does it say you can refer a dispute to the RTB?", hint: "Usually near the end of the notice." },
  ],
  rent: [
    { name: "inRpz", question: "Is your home in a Rent Pressure Zone?", hint: "You can look up your area on the RTB website." },
    { name: "hasThreeComparables", question: "Does the notice list 3 similar homes and their rents?", hint: "The landlord has to include these." },
  ],
  entry: [
    { name: "isEmergency", question: "Is it an emergency?", hint: "For example a burst pipe or a fire." },
    { name: "agreedTime", question: "Did you agree to the time of the visit?", hint: "By message, email or in person." },
  ],
  other: [],
};

export const REASONS = [
  { value: "sale", label: "The landlord is selling the home" },
  { value: "own_use", label: "The landlord is moving in" },
  { value: "family", label: "A family member of the landlord is moving in" },
  { value: "refurbishment", label: "Major work on the home" },
  { value: "breach", label: "I broke a term of the lease, such as missed rent" },
  { value: "other", label: "Another reason, or no reason given" },
];

export const NOTE_LIMIT = 500;
export const QUESTIONS_PER_PAGE = 3;
const DESCRIPTION_LIMIT = 2000;

const input = "h-11 w-full rounded-xl border border-[#cfdcde] px-3 text-[15px] text-ink outline-none transition focus:border-brand focus:ring-3 focus:ring-brand/15";

function LeaseBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-brand-soft px-1.5 py-0.5 text-[11px] font-semibold text-brand">
      <House size={11} aria-hidden />
      From your lease
    </span>
  );
}

function Label({ htmlFor, children, badge }: { htmlFor: string; children: React.ReactNode; badge?: boolean }) {
  return (
    <span className="mb-1.5 flex min-h-5 items-center justify-between gap-2">
      <label htmlFor={htmlFor} className="text-[13.5px] font-semibold text-brand-dark">
        {children}
      </label>
      {badge && <LeaseBadge />}
    </span>
  );
}

function DateField({ label, name, hint, values, onChange, type = "date", fromLease = false, required = true }: {
  label: string;
  name: string;
  hint: string;
  values: Values;
  onChange: (name: string, value: string) => void;
  type?: "date" | "datetime-local";
  fromLease?: boolean;
  required?: boolean;
}) {
  return (
    <div className="min-w-0">
      <Label htmlFor={name} badge={fromLease}>
        {label}
      </Label>
      <input
        id={name}
        type={type}
        required={required}
        value={values[name] ?? ""}
        onChange={(e) => onChange(name, e.target.value)}
        className={`${input} ${fromLease ? "bg-brand-soft/30" : "bg-white"}`}
      />
      <p className="mt-1 text-xs text-mute">{hint}</p>
    </div>
  );
}

function MoneyField({ label, name, values, onChange, fromLease = false }: { label: string; name: string; values: Values; onChange: (name: string, value: string) => void; fromLease?: boolean }) {
  return (
    <div className="min-w-0">
      <Label htmlFor={name} badge={fromLease}>
        {label}
      </Label>
      <span
        className={`flex h-11 items-center overflow-hidden rounded-xl border border-[#cfdcde] transition focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/15 ${
          fromLease ? "bg-brand-soft/30" : "bg-white"
        }`}
      >
        <span className="grid h-full w-10 shrink-0 place-items-center border-r border-[#e1e9ea] bg-[#f4f8f8] font-semibold text-mute">€</span>
        <input
          id={name}
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          required
          value={values[name] ?? ""}
          onChange={(e) => onChange(name, e.target.value)}
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-[15px] font-semibold tabular-nums text-ink outline-none"
        />
        <span className="shrink-0 pr-3 text-xs text-mute">a month</span>
      </span>
    </div>
  );
}

function QuestionRow({ item, value, missing, onChange }: { item: Question; value: string | undefined; missing: boolean; onChange: (name: string, value: string) => void }) {
  const options: { value: Answer; label: string }[] = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
    { value: "unsure", label: "Not sure" },
  ];
  return (
    <div className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p id={`${item.name}-q`} className="text-[14.5px] font-semibold text-ink">
          {item.question}
        </p>
        <p className={`mt-0.5 text-xs ${missing ? "font-semibold text-bad" : "text-mute"}`}>{missing ? "Pick an answer" : item.hint}</p>
      </div>
      <div role="radiogroup" aria-labelledby={`${item.name}-q`} className="flex shrink-0 self-start overflow-hidden rounded-lg border border-[#cfdcde] bg-white sm:self-auto">
        {options.map((option, index) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(item.name, option.value)}
            className={`h-9 cursor-pointer px-3.5 text-[13.5px] font-semibold transition focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand ${
              index > 0 ? "border-l border-[#d5e3e4]" : ""
            } ${value === option.value ? "bg-brand-dark text-white" : "text-ink hover:bg-surface"}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2.5 text-xs font-bold uppercase tracking-[0.08em] text-mute">{title}</p>
      {children}
    </div>
  );
}

function TextBox({ name, label, placeholder, limit, rows, values, onChange, required = false, autoFocus = false }: {
  name: string;
  label: string;
  placeholder: string;
  limit: number;
  rows: number;
  values: Values;
  onChange: (name: string, value: string) => void;
  required?: boolean;
  autoFocus?: boolean;
}) {
  const text = values[name] ?? "";
  return (
    <div>
      <label htmlFor={name} className="mb-2.5 block text-xs font-bold uppercase tracking-[0.08em] text-mute">
        {label}
      </label>
      <div className="relative rounded-xl border border-[#cfdcde] bg-white transition focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/15">
        <textarea
          id={name}
          rows={rows}
          maxLength={limit}
          required={required}
          autoFocus={autoFocus}
          value={text}
          placeholder={placeholder}
          onChange={(e) => onChange(name, e.target.value)}
          className="block w-full resize-none rounded-xl bg-transparent px-3 pb-5 pt-2.5 text-[14.5px] leading-relaxed text-ink outline-none placeholder:text-[#9aabae]"
        />
        <p className="pointer-events-none absolute bottom-1.5 right-3 text-[11.5px] tabular-nums text-mute" aria-live="polite">
          {text.length} / {limit}
        </p>
      </div>
    </div>
  );
}

function NoteBox({ values, onChange }: { values: Values; onChange: (name: string, value: string) => void }) {
  const [open, setOpen] = useState(!!values.note);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 w-full cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[#cfdcde] px-3 text-left text-sm font-semibold text-brand hover:border-brand/40 hover:bg-surface"
      >
        <Plus size={16} aria-hidden />
        Anything else? <span className="font-normal text-mute">(optional)</span>
      </button>
    );
  }
  return (
    <TextBox
      name="note"
      label="Anything else? (optional)"
      placeholder="For example: the notice was sent by text, or the landlord said something different in person."
      limit={NOTE_LIMIT}
      rows={2}
      values={values}
      onChange={onChange}
      autoFocus={!values.note}
    />
  );
}

export default function NoticeDetails({
  type,
  values,
  lease,
  questionPage,
  showMissing,
  onChange,
  onQuestionPage,
}: {
  type: NoticeType;
  values: Values;
  lease: NoticeLease | null;
  questionPage: number;
  showMissing: boolean;
  onChange: (name: string, value: string) => void;
  onQuestionPage: (page: number) => void;
}) {
  const startFromLease = !!lease?.tenancyStart && values.tenancyStart === lease.tenancyStart;
  const rentFromLease = !!lease?.monthlyRent && Number(values.currentRent) === lease.monthlyRent;
  const questions = QUESTIONS[type];
  const questionPages = Math.ceil(questions.length / QUESTIONS_PER_PAGE);
  const page = Math.min(questionPage, Math.max(0, questionPages - 1));
  const shownQuestions = questions.slice(page * QUESTIONS_PER_PAGE, page * QUESTIONS_PER_PAGE + QUESTIONS_PER_PAGE);
  const answered = questions.filter((item) => values[item.name]).length;

  return (
    <>
      {type === "termination" && (
        <Section title="Dates">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <DateField label="Tenancy started" name="tenancyStart" hint="The day your lease began" values={values} onChange={onChange} fromLease={startFromLease} />
            <DateField label="Date on the notice" name="serviceDate" hint="Usually at the top" values={values} onChange={onChange} />
            <DateField label="Tenancy ends" name="terminationDate" hint="The day the notice says you must leave" values={values} onChange={onChange} />
          </div>
        </Section>
      )}

      {type === "rent" && (
        <>
          <Section title="Rent">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <MoneyField label="Current rent" name="currentRent" values={values} onChange={onChange} fromLease={rentFromLease} />
              <MoneyField label="New rent in the notice" name="newRent" values={values} onChange={onChange} />
            </div>
          </Section>
          <Section title="Dates">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <DateField label="Date on the notice" name="serviceDate" hint="Usually at the top" values={values} onChange={onChange} />
              <DateField label="New rent starts" name="effectiveDate" hint="The day the higher rent applies" values={values} onChange={onChange} />
              <DateField label="Rent last changed" name="lastReviewDate" hint="Leave empty if it never has" values={values} onChange={onChange} required={false} />
            </div>
          </Section>
        </>
      )}

      {type === "entry" && (
        <Section title="Times">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DateField label="When you were told" name="toldAt" type="datetime-local" hint="When the landlord first told you about the visit" values={values} onChange={onChange} />
            <DateField label="When the visit is" name="visitAt" type="datetime-local" hint="The date and time they want to come in" values={values} onChange={onChange} />
          </div>
        </Section>
      )}

      {type === "other" && (
        <TextBox
          name="description"
          label="What does the notice say?"
          placeholder="Copy the main parts of the notice, or describe what your landlord is asking for."
          limit={DESCRIPTION_LIMIT}
          rows={8}
          values={values}
          onChange={onChange}
          required
        />
      )}

      {questions.length > 0 && (
        <Section title="The notice">
          {type === "termination" && (
            <div className="mb-3 grid grid-cols-1 gap-1.5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-4">
              <label htmlFor="reason" className="text-[13.5px] font-semibold text-brand-dark">
                Reason given in the notice
              </label>
              <select id="reason" value={values.reason ?? "other"} onChange={(e) => onChange("reason", e.target.value)} className={`${input} cursor-pointer bg-white`}>
                {REASONS.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="rounded-xl border border-[#e1e9ea]">
            <div className="divide-y divide-line px-4">
              {shownQuestions.map((item) => (
                <QuestionRow key={item.name} item={item} value={values[item.name]} missing={showMissing && !values[item.name]} onChange={onChange} />
              ))}
            </div>
            {questionPages > 1 && (
              <div className="flex items-center justify-between gap-3 rounded-b-xl border-t border-line bg-[#f4f8f8] px-4 py-2">
                <span className="text-xs text-mute">
                  {answered} of {questions.length} answered
                </span>
                <Pager page={page} pages={questionPages} label="Pages of questions" onChange={onQuestionPage} />
              </div>
            )}
          </div>
        </Section>
      )}

      <NoteBox values={values} onChange={onChange} />
    </>
  );
}
