# ClauseGuard
AI-powered lease checker for Irish renters. Upload a lease, and ClauseGuard flags potentially unlawful or unfair clauses with plain-English explanations and citations to the Residential Tenancies Acts and RTB guidance.

**Introduction & Background**

Renting is the primary form of housing tenure for a growing share of the population, yet the residential lease agreement — the single most important document governing that tenancy — remains largely inaccessible to the people who sign it. Leases are drafted in a legal jargon and tenants, especially first-time renters, students and non-native speakers often sign without knowing their rights or the invalid clauses in the lease under the country's national tenancy regulations.
In Ireland the Residential Tenancies Acts 2004-2022, coupled with guidance from the Residential Tenancies Board (RTB), impose clear restrictions on what a landlord can include in a lease, including provisions which preclude tenants from notifying of disrepair, which impose full responsibility on the tenant for all repairs or which prevent the application of statutory notice periods. But in reality, tenants seldom have the legal expertise or resources to discover these provisions before signing.
This project aims to develop an AI-assisted lease review tool designed to assist a tenant in uploading their rental agreement and receiving a breakdown, in simple language, of any clause that may be illegal, unfair and/or inconsistent with the provisions in the rental lease and a reference to the relevant statutory provision. Beyond building the tool, the project will rigorously evaluate how best to build it, by comparing rule-based, fine-tuned and retrieval-grounded approaches on a purpose-built labelled dataset.

**Objectives**

1.	Design and curate a structured, version-aware knowledge base of clause categories mapped to Irish tenancy legislation and RTB guidance.
2.	Build a document ingestion pipeline that reliably extracts and segments clauses from PDF, DOCX, and scanned lease documents, and report parsing success rates by document type.
3.	Create a gold-standard labelled dataset of at least 500 clauses (real, synthetic and adversarial), with written annotation guidelines and inter-annotator agreement measured using Cohen’s kappa. Annotation is accelerated by an active-learning annotation tool that selects the most informative clauses to label next; its labelling efficiency is compared with random sampling.
4.	Conduct a comparative study of four classification approaches: keyword/regex baseline, zero-shot LLM, fine-tuned small model, and LLM with RAG.
5.	Build a hybrid analysis engine combining a deterministic rule engine with LLM reasoning, and evaluate where each performs better.
6. Extract structured lease terms (rent, deposit, notice periods, date) to validate to a schema that has deterministic date and arithmetic tools, and measure extraction accuracy and propagation of extraction errors to verdicts issued by the rule engine.
7. Conduct point-in-time legal reasoning: Ask the versioned knowledge base at a particular time to evaluate each clause against the clause in effect at that time, and report on a test set on a date sensitive basis how many clauses were judged as correct.
8. Have citation verification and confidence based abstention so each flag is connected to a real provision. Confidence is calibrated (reported with expected calibration error) and abstention is set by conformal prediction.
9. Privacy by design: PII redaction prior to external API calls, data retention and deletion controls, and a short Data Protection Impact Assessment (DPIA).
10. Make the pipeline more resistant to prompt injection: Assume that uploaded leases are untrusted input, look for hidden text and injected instructions, and compute attack success rate, accuracy (or loss) and latency (or delay) cost of the defenses.
11.	Build a usable web interface for upload, a document-anchored review report, and interactive grounded Q&A.
12.	Evaluate the system with classifier metrics and a usability study (SUS score, at least 10 prospective tenant users).
