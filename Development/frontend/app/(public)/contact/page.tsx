import type { Metadata } from "next";
import LegalDocument from "@/components/layout/LegalDocument";

export const metadata: Metadata = { title: "Contact" };

const SECTIONS = [
  {
    heading: "",
    body: "We’d really like to hear from you, whether you’ve found a bug, think we got a clause wrong, or have an idea that would make ClauseGuard more useful.",
  },
   {
    heading: "Email us",
    body: "TBD",
  },
];

export default function Contact() {
  return (
    <>
      <LegalDocument title="Contact Us" updated="10 October 2026" sections={SECTIONS} />
    </>
  );
}