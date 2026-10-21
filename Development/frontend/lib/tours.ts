export type TourStep = {
  target: string;
  title: string;
  text: string;
};

export const DASHBOARD_TOUR: TourStep[] = [
  {
    target: "validate-lease",
    title: "Start here",
    text: "Upload a draft lease and ClauseGuard checks every clause against Irish tenancy law, so you know what to question before you sign.",
  },
  {
    target: "check-notice",
    title: "Check a notice",
    text: "Check a rent increase or notice to quit to see if anything looks wrong.",
  },
  {
    target: "tenancy-timeline",
    title: "Tenancy timeline",
    text: "Keep track of important dates like your rent review dates and notice periods.",
  },
  {
    target: "recent-analyses",
    title: "Recent analyses",
    text: "Come back to your previous lease reviews whenever you need them.",
  },
  {
    target: "tour-button",
    title: "Replay the tour",
    text: "You can take this quick tour again whenever you need.",
  },
];

export const LEASES_TOUR: TourStep[] = [
  {
    target: "lease-list",
    title: "Your leases",
    text: "All the leases you've uploaded appear here. Click one to see the full clause-by-clause review.",
  },
];

export const UPLOAD_TOUR: TourStep[] = [
  {
    target: "drop-zone",
    title: "Drop your lease",
    text: "Drag a PDF, DOCX of your rental agreement here, or click to pick one from your files.",
  },
  {
    target: "check-button",
    title: "Check my lease",
    text: "Once your file is selected, press this button to start the review.",
  },
  {
    target: "what-happens",
    title: "What happens next",
    text: "These three steps explain exactly what ClauseGuard does with your lease after you upload it.",
  },
];

export const HOME_TOUR: TourStep[] = [
  {
    target: "hero",
    title: "Welcome to ClauseGuard",
    text: "ClauseGuard helps tenants in Ireland understand their lease before signing. Upload your agreement and get a plain-English review.",
  },
  {
    target: "get-started",
    title: "Get started",
    text: "Create a free account to upload your first lease and see what ClauseGuard can do.",
  },
  {
    target: "how-it-works",
    title: "How it works",
    text: "Three simple steps: upload, review, understand. No legal jargon.",
  },
];

export const ABOUT_TOUR: TourStep[] = [
  {
    target: "about-title",
    title: "About ClauseGuard",
    text: "Learn why ClauseGuard was built, what it does (and doesn't do), and who's behind it.",
  },
  {
    target: "about-sections",
    title: "Read each section",
    text: "Scroll down to see sections on privacy, how the analysis works, and the team.",
  },
];

export const CONTACT_TOUR: TourStep[] = [
  {
    target: "contact-title",
    title: "Get in touch",
    text: "Found a bug, think we got a clause wrong, or have an idea? This is where to reach us.",
  },
  {
    target: "contact-sections",
    title: "Contact details",
    text: "Our contact information is listed below.",
  },
];

export const REVIEW_TOUR: TourStep[] = [
  {
    target: "verdict-banner",
    title: "Overall summary",
    text: "Get an instant summary of your lease, showing any clauses that look unfair or need your attention.",
  },
  {
    target: "annotated-lease",
    title: "Annotated lease",
    text: "Browse your agreement with colour-coded flags highlighting unfair terms and clauses to question.",
  },
  {
    target: "clause-details",
    title: "Clause breakdown",
    text: "Read what each clause means in plain English, why it was flagged under Irish tenancy rules, and what you can do.",
  },
];

export const TIMELINE_TOUR: TourStep[] = [
  {
    target: "timeline-summary",
    title: "Your tenancy timeline",
    text: "See all your important tenancy dates in one place, including rent reviews and notice periods.",
  },
  {
    target: "add-event",
    title: "Add an event",
    text: "Click this button to add a new event to your timeline, such as a rent review or notice period.",
  },
]