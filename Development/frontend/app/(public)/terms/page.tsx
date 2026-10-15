import type { Metadata } from "next";
import LegalDocument from "@/components/layout/LegalDocument";

export const metadata: Metadata = { title: "Terms of service" };

const SECTIONS = [
  {
    heading: "What ClauseGuard is",
    body: "ClauseGuard is an information tool for tenants in Ireland to help them better understand rental agreements and notices. This checks the content you upload against tenancy rules and published guidance and provides a plain English explanation.",
  },
  {
    heading: "Not legal advice",
    body: "ClauseGuard is NOT a law firm and is not providing legal advice. Automated results are incomplete or may be incorrect, particularly with unconventional wording or poor scanning. Always verify results from the original sources and seek expert advice from Threshold, Citizens Information or a solicitor if in any doubt.",
  },
  {
    heading: "Your account",
    body: "Keep your password private. You are responsible for activity on your account. You can delete your account and its data at any time from Settings.",
  },
  {
    heading: "Acceptable use",
    body: "Upload only documents that you have the right to use, e.g. your tenancy agreement, notices served to you. Don't try to access other people's data or disrupt the service.",
  },
  {
    heading: "Changes",
    body: "We may update these terms as the service and the law change. The date of the latest version is shown above.",
  },
];

export default function TermsPage() {
  return <LegalDocument title="Terms of service" updated="10 October 2026" sections={SECTIONS} />;
}
