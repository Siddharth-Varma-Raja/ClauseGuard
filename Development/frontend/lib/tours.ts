export type TourStep = {
  target: string;
  title: string;
  text: string;
};

export const DASHBOARD_TOUR: TourStep[] = [
  {
    target: "spotlight",
    title: "What matters most",
    text: "This card always shows the most important thing right now, like a deadline that is close or clauses you still need to review.",
  },
  {
    target: "also-on-list",
    title: "Also on your list",
    text: "Everything else that needs your attention. When there is nothing left to do, you see a quick summary of your lease instead.",
  },
  {
    target: "my-leases",
    title: "My leases",
    text: "Your latest leases with their verdict and how far you got with the review. Click one to open it.",
  },
  {
    target: "upcoming-dates",
    title: "Upcoming dates",
    text: "The next dates from your tenancy timeline, like rent day or a notice period.",
  },
  {
    target: "quick-actions",
    title: "Quick actions",
    text: "Check a landlord's notice, add a date or upload another lease.",
  },
  {
    target: "tour-button",
    title: "Replay the tour",
    text: "Click the ? button in the menu any time to take this tour again.",
  },
];

export const NEW_USER_TOUR: TourStep[] = [
  {
    target: "upload-box",
    title: "Start here",
    text: "Click the button or drop your lease anywhere in this box. ClauseGuard checks every clause against Irish tenancy law, so you know what to question before you sign.",
  },
  {
    target: "features",
    title: "Everything else",
    text: "Not ready to upload? Explore the sample lease, check a landlord's notice or add your important dates.",
  },
  {
    target: "tour-button",
    title: "Replay the tour",
    text: "   Click the ? button in the menu any time to take this tour again.",
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
    target: "upload-box",
    title: "Upload your lease",
    text: "Click the button or drop a PDF, Word file or photo anywhere in this box. The check starts straight away.",
  },
  {
    target: "tour-button",
    title: "Replay the tour",
    text: "   Click the ? button in the menu any time to take this tour again.",
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
    text: "Switch to the full lease to read it page by page.",
  },
  {
    target: "view-full-report",
    title: "Full report",
    text: "Export your review as a PDF or print it to share with your landlord.",
  },
  {
    target: "email-landlord",
    title: "Email your landlord",
    text: "Choose the clauses you want to raise and we'll write a draft you can edit and send yourself.",
  },
  {
    target: "upload-updated",
    title: "Got an updated lease?",
    text: "Upload it here and it's added as a new version, so you can see exactly what changed.",
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

export const NOTICES_UPLOAD_TOUR: TourStep[] = [
  {
    target: "notice-intro",
    title: "Check a notice",
    text: "Check a notice from your landlord against Irish tenancy rules such as a rent increase, a notice of termination or an inspection request.",
  },
  {
    target: "notice-mode",
    title: "Upload or answer questions",
    text: "Uplaod the letter for fastest check or choose Quick Form to answer few questions instead.",
  },
  {
    target: "notice-start",
    title: "Upload your notice",
    text: "Upload PDF or a photo of the letter from your landlord. Then fill in the dates and details.",
  },
  {
    target: "previous-checks",
    title: "Previous checks",
    text: "Find your earlier notice checks here. Open one to see its results again.",
  },
]

export const NOTICES_FORM_TOUR: TourStep[] = [
  {
    target: "notice-intro",
    title: "Check a notice",
    text: "Check a notice from your landlord against Irish tenancy rules such as rent increase, a notice of termination or an inspection request.",
  },
  {
    target: "notice-mode",
    title: "Upload or answer questions",
    text: "Answer few questions here or switch to Upload Notice Letter to upload the letter instead.",
  },
  {
    target: "notice-start",
    title: "Choose your notice type",
    text: "Pick the type of notice you received, then press Continue to enter the dates and details.",
  },
  {
    target: "previous-checks",
    title: "Previous checks",
    text: "Find your earlier notice checks here. Open one to see its results again.",
  },
]

export const NOTICE_DETAILS_TOUR: TourStep[] = [
  {
    target: "notice-intro",
    title: "Check a notice",
    text: "Check a notice from your landlord against Irish tenancy rules such as a rent increase, a notice of termination or an inspection request.",
  },
  {
    target: "notice-mode",
    title: "Upload or answer questions",
    text: "You're using the Quick Form. You can switch to Upload Notice Letter to upload the letter instead.",
  },
  {
    target: "notice-start",
    title: "Fill in the details",
    text: "Enter the dates from your notice and tick everything that applies, then press Check notice.",
  },
  {
    target: "previous-checks",
    title: "Previous checks",
    text: "Find your earlier notice checks here. Open one to see its results again.",
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

export const SAMPLE_TOUR: TourStep[] = [
  {
    target: "key-details",
    title: "Found straight away",
    text: "The deposit in this lease is three months' rent. In Ireland the limit is one month, so ClauseGuard flags it here first.",
  },
  {
    target: "clause-cards",
    title: "Every problem in plain English",
    text: "These are the clauses worth raising. Open one to see why it was flagged and what you could say to your landlord.",
  },
  {
    target: "sample-own",
    title: "Now try yours",
    text: "That's how ClauseGuard works. When you're ready, check your own lease the same way.",
  },
];
