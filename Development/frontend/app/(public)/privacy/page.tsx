import type { Metadata } from "next";
import LegalDocument from "@/components/layout/LegalDocument";

export const metadata: Metadata = { title: "Privacy policy" };

const SECTIONS = [
  {
    heading: "What we store",
    body: "Your name and email, the documents you upload, the text extracted from them, your analysis results, notice checks, timeline events and the questions you ask about clauses.",
  },
  {
    heading: "How you log in",
    body: "Accounts are managed by Google Firebase Authentication. Your password is handled by Firebase and is never stored by ClauseGuard.",
  },
  {
    heading: "Why we store it",
    body: "To analyse your documents, show your reports and remind you of any deadlines. We don't sell your data or use it for advertising.",
  },
  {
    heading: "Your control",
    body: "You can delete your history or your account at any time in Profile & settings. Deleting your account removes all of your data.",
  },
];

export default function PrivacyPage() {
  return <LegalDocument title="Privacy policy" updated="10 October 2026" sections={SECTIONS} />;
}
