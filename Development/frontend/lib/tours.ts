export type TourStep = {
  target: string;
  title: string;
  text: string;
};

export const DASHBOARD_TOUR: TourStep[] = [
  {
    target: "spotlight",
    title: "Tenancy snapshot",
    text: "Rent, deposit, when the lease ends, how the lease check went and how far into the tenancy you are. Use the arrows to switch lease.",
  },
  {
    target: "action-list",
    title: "Action list",
    text: "Things to do, most urgent first. The coloured edge shows how soon each one needs doing.",
  },
  {
    target: "my-leases",
    title: "My leases",
    text: "Your latest leases with when you uploaded them and what the check found. Click one to open it.",
  },
  {
    target: "timeline-strip",
    title: "Your timeline",
    text: "Your dates in order, from past to upcoming. Use the arrows to see more, or click a date to open it in the timeline.",
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
    text: "All your important dates in one place. If you've analysed your lease, you'll also see how far into it you are.",
  },
  {
    target: "event-list",
    title: "Your dates",
    text: "Upcoming dates are grouped by week and month. Pick a day on the calendar to see only that day, and use the arrows to see more.",
  },
  {
    target: "add-to-calendar",
    title: "Get reminders",
    text: "We don't send reminders, so put your dates into the calendar you already use and it will remind you.",
  },
  {
    target: "add-event",
    title: "Add a date",
    text: "Add your own dates, such as an inspection or a rent payment.",
  },
]

export const NOTICES_FORM_TOUR: TourStep[] = [
  {
    target: "notice-intro",
    title: "Check a notice",
    text: "Check a notice from your landlord against Irish tenancy rules, such as a rent increase, a notice to end the tenancy or a visit.",
  },
  {
    target: "notice-start",
    title: "Choose the notice",
    text: "Pick what the notice is about. Each option shows what we check for it.",
  },
  {
    target: "notice-lease",
    title: "Link your lease",
    text: "If the notice is about a lease you uploaded, pick it and we fill in your rent and start date.",
  },
  {
    target: "previous-checks",
    title: "Your past checks",
    text: "Open an earlier check to see its result again. The coloured edge shows the result.",
  },
]

export const NOTICE_DETAILS_TOUR: TourStep[] = [
  {
    target: "notice-start",
    title: "Fill in the details",
    text: "Enter the dates and amounts from the notice and answer each question. Pick Not sure if you don't know.",
  },
  {
    target: "notice-numbers",
    title: "Your numbers",
    text: "As you type, this shows the numbers from what you entered. We check them when you press Check this notice.",
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
