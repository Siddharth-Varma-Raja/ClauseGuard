import Link from "next/link";

type LegalDocumentProps = {
  title: string;
  updated: string;
  sections: { heading: string; body: string }[];
};

// Shared layout for the Terms and Privacy pages.
export default function LegalDocument({ title, updated, sections }: LegalDocumentProps) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl font-semibold text-brand-dark">{title}</h1>
      <p className="mt-2 text-sm text-mute">Last updated {updated}</p>

      {sections.map((section) => (
        <section key={section.heading} className="mt-8">
          <h2 className="font-display text-xl font-semibold text-brand-dark">{section.heading}</h2>
          <p className="mt-2 leading-relaxed">{section.body}</p>
        </section>
      ))}

    </main>
  );
}
