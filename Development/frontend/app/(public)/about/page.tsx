import type { Metadata } from "next";
import LegalDocument from "@/components/layout/LegalDocument";

export const metadata: Metadata = { title: "About" };

const SECTIONS = [
  {
    heading: "Why it exists",
    body: "Renting in Ireland is stressful enough without having to decode a twelve-page lease. Most people sign because they’re under pressure: the viewing had forty other people at it, the landlord wants an answer by Friday, and the lease is full of wording nobody really understands. We built ClauseGuard because we’ve been there. We wanted a simple way to know, before signing, whether something in a lease was normal, a bit unusual, or not allowed at all.",
  },
  {
    heading: "What it does",
    body: "You upload your lease and ClauseGuard reads through it clause by clause. Each clause is compared with the Residential Tenancies Acts and guidance from the Residential Tenancies Board (RTB). Every result comes with a short explanation in everyday English and a link to the rule it’s based on. You can also check notices, ask questions about clauses, and keep track of important dates in your tenancy.",
  },
  {
    heading: "What it isn’t",
    body: "ClauseGuard isn’t a solicitor, and it doesn’t give legal advice. It’s there to help you spot things and ask better questions. If something serious comes up, talk to someone who can look at your situation properly. Threshold, Citizens Information and the RTB all offer free help.",
  },
  {
    heading: "Your documents stay yours",
    body: "A lease has your private credentials, so we treat it carefully. Your documents are only visible to your account, they’re never sold or used for advertising, and you can delete them or your account whenever you like.",
  },
  {
    heading: "Who we are?",
    body: "ClauseGuard is made by a team of MSc students at Technological University Dublin working on Advanced Software Development. We’re passionate about making renting easier and fairer for everyone. ",
  },
];

export default function About() {
  return (
    <>
      <LegalDocument title="About ClauseGuard" updated="10 October 2026" sections={SECTIONS} tourTitle="about-title" tourSections="about-sections" />
    </>
  );
}