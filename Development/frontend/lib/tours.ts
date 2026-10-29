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
    text: "Drag a PDF, DOCX of your rental agreement here, or click to pick one of them from your files.",
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
    text: "Three simple steps: upload, review, understand.",
  },
];

export const REVIEW_TOUR: TourStep[] = [
  {
    target: "verdict-banner",
    title: "Your overall result",
    text: "This is the overall rating for your lease. The bar shows how many flagged clauses you have reviewed so far.",
  },
  {
    target: "rating-tiles",
    title: "Clauses by rating",
    text: "Every clause is sorted into one of your four ratings. Select one to see all clauses with that rating.",
  },
  {
    target: "key-details",
    title: "Key lease details",
    text: "Important terms from your lease, extracted and explained.",
  },
  {
    target: "clause-cards",
    title: "Clauses to look at",
    text: "Each card shows the clause in plain English and the page it is on, so you can tell your landlord exactly where to look. Select a card to open it in the lease.",
  },
  {
    target: "view-switch",
    title: "Summary or full lease",
    text: "Switch to the full lease to read it pagr by page.",
  },
  {
    target: "view-full-report",
    title: "Full report",
    text: "Export your review as a PDF or print it to share with your landlord.",
  }
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
  {
    target: "event-list",
    title: "Your events",
    text: "View and manage your upcoming, past and completed tenancy events here.",
  },
]

export const NOTICES_TOUR: TourStep[] = [
  {
    target: "notice-intro",
    title: "Check a notice",
    text: "Answer a few questions about a notice from your landlord. ClauseGuard will check the details against Irish tenancy rules.",
  },
  {
    target: "notice-type",
    title: "Choose your notice type",
    text: "Select the option that matches your situation, such as a rent increase, notice of termination, or property inspection.",
  },
  {
    target: "notice-continue",
    title: "Continue to the questions",
    text: "Once you have selected the type of notice, click Continue to enter the relevant dates and details.",
  },
  {
    target: "previous-checks",
    title: "Previous checks",
    text: "Find your earlier notice checks here. Open a completed check to view its results again.",
  },
]

export const REVIEW_LEASE_TOUR: TourStep[] = [
  {
    target: "annotated-lease",
    title: "Your lease, page by page",
    text: "Each clause is highlighted in the colour of its rating. Select a clause to see what it means.",
  },
  {
    target: "scroll-markers",
    title: "Issue markers",
    text: "Each coloured line on this scroll bar is an issue on this page. Select a line to jump straight to that clause.",
  },
  {
    target: "clause-details",
    title: "Clause explained",
    text: "What the clause means in plain English, why it was flagged under Irish tenancy law, and what you can do.",
  },
];