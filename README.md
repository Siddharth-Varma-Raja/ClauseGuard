# ClauseGuard

**Understand your lease before you agree: AI-assisted compliance checking for Irish residential leases.**

*Technological University Dublin, School of Computer Science. MSc in Computer Science, Team Project (Group 3).*

![ClauseGuard Status](https://img.shields.io/badge/Status-Active_Development-brightgreen)
![RTB Aligned](https://img.shields.io/badge/Compliance-RTB_2026-10b981)
![Project type](https://img.shields.io/badge/Project-Educational-blue)

<p align="center"> <img src="Design/clauseguard-logo.png" alt="ClauseGuard: Irish Tenancy Validation" width="420"> </p>

ClauseGuard is an Irish web application designed for web tenants privacy. A tenant uploads a lease (PDF or photo), the system removes the personal data, breaks the lease into clauses, cross-checks the clauses against a set of written rules, which are based on tenancy law and guidance from the Residential Tenancies Board (RTB); and explains, in plain English, what the flagged clauses mean, why they were flagged, what steps the tenant should take next, and which legal source the check is based on. It also verifies landlord notices (termination, rent increase, entry) and maintains a landlord's timeline.

> **Disclaimer.** ClauseGuard is an educational project and does not give legal advice. It will compare leases with guidance from the RTB published and Irish tenancy law as far as we know and may be incorrect or outdated. If you want information about your case, please speak with the RTB, Threshold or a solicitor.

> **Status.** Work in progress (interim stage, October 2026). The sections below say clearly what works today and what is still being built. See [Known limitations](#known-limitations).

---

## Table of contents

1. [Why ClauseGuard](#why-clauseguard)
2. [What works today](#what-works-today)
3. [How it works](#how-it-works)
4. [Tech stack](#tech-stack)
5. [Repository structure](#repository-structure)
6. [Getting started](#getting-started)
7. [API overview](#api-overview)
8. [Rule engine](#rule-engine)
9. [Legal source register](#legal-source-register)
10. [Model experiments](#model-experiments)
11. [Data and privacy](#data-and-privacy)
12. [Testing](#testing)
13. [Deployment](#deployment)
14. [Evaluation](#evaluation)
15. [Known limitations](#known-limitations)
16. [Roadmap](#roadmap)
17. [Team and roles](#team-and-roles)
18. [Project management and contributing](#project-management-and-contributing)

---

## Why ClauseGuard

In Ireland, most people who rent live in the main and this is for increasing numbers of people, but a lease is drafted in the legal language and is typically signed under time pressure. Where clauses are contrary to the tenancy law or guidance given by RTB, for instance, a rent review every 6 months or an entry clause with no notice passes by without being noticed. There were also two changes to the law in 2026, so the rule used will be based on the dates.

Our target users are tenants who are least able to check a lease: students (including international students), recent arrivals to Ireland, people with little time, and older tenants and tenants with disabilities. Advice services such as Threshold are a secondary user group. The test of the product is whether an ordinary person with no legal background understands the output, so lawyers are not the right judges of the interface.

---

## What works today

| Area | Status |
|---|---|
| Sign-in and registration | Working. Firebase Authentication, with the back end verifying the ID token on every request. Registration needs 8+ characters, an upper-case letter and a number. |
| Upload checks | Working. File size (25 MB) and type checked from the file bytes. PDF and images supported. |
| Text extraction | Working. pdfplumber for text PDFs, Tesseract OCR for scans and photos. |
| Lease validator | Working. A template diff engine scores tenancy vocabulary, rejects documents that are not leases, and compares the text with an RTB-style model agreement. |
| Personal-data redaction | Working, needs tuning. Irish-specific patterns (IBAN, PPS number, phone, email, Eircode) plus spaCy for names and places. |
| Storage | Working. Only redacted text is stored (AWS S3). A SHA-256 hash of the upload is stored in MySQL. |
| Clause analysis | In progress. Clause splitter and keyword topic classifier work; the rule engine has three draft rules (deposit, entry, termination). |
| Review screen | Working. Verdict banner, red/amber/green/grey counts, page-by-page lease view with highlighted clauses, explanation panel, mark-as-reviewed, text report download. |
| Ask ClauseGuard | Working, not yet grounded. Answers a question about one clause using Gemini. |
| Notice checker | Working. Termination, rent-review and entry notices, with checks, key dates and next steps. |
| Timeline, settings, account | Working. Rent dates and deadlines; simple or detailed explanations; GDPR data export; delete all data. |
| Guided tours, public pages | Working. Landing, about, terms, privacy and contact pages. |
| Topic traffic lights | Designed, not built. |
| Retrieval-augmented explanations | Planned. |

---

## How it works

```
Upload (PDF / image)
   -> check size and type (from the file bytes)
   -> extract text (pdfplumber; Tesseract OCR for scans)
   -> lease check (is this a residential lease? compare with the RTB-style model agreement)
   -> redact personal data (Irish regex + spaCy)
   -> store redacted text in S3, SHA-256 hash in MySQL
   -> split into clauses -> classify topic (keyword baseline for now)
   -> rule engine: verdict + reason + citation, or "needs review" when unsure
   -> review screen: verdict, colour-coded clauses, plain-English explanation, sources
```

Design principles:

- **Deterministic first, AI second.** Repeatable and explainable means anything with a number or date threshold (deposit, notice period, rent review, rent cap) is a written rule with a source. Language models are designed to comprehend the meaning of words and respond to queries.
- **Honest uncertainty.** "Needs review" is a normal outcome. Clauses that have not been assessed are grey, never green.
- **Law versus guidance.** A clause that breaks the law is shown differently from one that goes against RTB advice, in words as well as colour.
- **Point-in-time law.** The rules are assigned with a date corresponding to the rules they apply to; if it is unknown, it will say "needs review".
- **Privacy by design.** Before storing, redact; do not store the original file; send only one clause to language model; fail closed when redaction will not run.
- **Plain English for non-lawyers.** Reason and next step first; legal sources available but not in the way.

---

## Tech stack

| Layer | Technology |
|---|---|
| Front end | Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, lucide-react |
| Identity | Firebase Authentication (web SDK and Admin SDK) |
| API | Python 3.11, FastAPI, Pydantic 2, Uvicorn |
| Database | MySQL 8, SQLAlchemy 2 (async, aiomysql), Alembic migrations |
| Documents | pdfplumber, pytesseract and Tesseract, pdf2image and Poppler, Pillow, python-magic |
| Privacy | Regular expressions and spaCy (`en_core_web_sm`) |
| Analysis | Own rule engine (PyYAML), clause splitter, keyword baseline; PyTorch and Hugging Face for experiments |
| Language model | Google Gemini (google-genai) for per-clause questions |
| Storage | AWS S3 (private bucket, redacted text only) |
| Operations | Docker, Render (back end), Vercel (front end), Google Cloud SQL, slowapi (rate limits), structlog |

---

## Repository structure

```
ClauseGuard/
├── Development/
│   ├── frontend/            # Next.js 16 app (public pages, auth, dashboard, review, notices, timeline, settings)
│   └── backend/             # FastAPI app
│       ├── app/             # API, services, models, schemas, migrations hooks
│       ├── document_checker/    # lease validator and template diff engine
│       ├── rules_engine/        # YAML rules, engine, extraction, tests
├── Documentation/           # requirement specification, project plan, legal source register, presentations
├── Design/                  # UX/UI designs
├── Evaluation/
├── Research/
├── Project_Management/      # meeting logs, retrospectives
└── Submissions/
```

---

## Getting started

### Prerequisites

- Git
- Python 3.11
- Node.js (current LTS)
- MySQL 8
- System packages for documents: Tesseract OCR, Poppler (`poppler-utils`) and libmagic
- A Firebase project (Authentication enabled) and its service account key
- An AWS S3 bucket and IAM credentials (put, get and delete on the bucket)
- A Gemini API key (for Ask ClauseGuard)

### Back end

```bash
git clone https://github.com/Siddharth-Varma-Raja/ClauseGuard.git
cd ClauseGuard/Development/backend

python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm

# create .env (see below), then apply the database migrations
alembic upgrade head

uvicorn app.main:app --reload --port 8081
```

API docs (Swagger) are served at `http://localhost:8081/docs` and a health check at `/health`.

Create `Development/backend/.env` with these variables (there is no `.env.example` yet; adding one is on the to-do list). **Never commit this file.**

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Async MySQL URL (`mysql+aiomysql://user:pass@host:3306/clauseguard`) |
| `DATABASE_URL_SYNC` | Sync URL used by Alembic (`mysql+pymysql://...`) |
| `ALLOWED_ORIGINS` | Comma-separated front-end origins allowed by CORS |
| `FIREBASE_CREDENTIALS_JSON` | Path to the service account file, or the JSON itself |
| `FIREBASE_WEB_API_KEY` | Firebase web API key |
| `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME` | S3 storage for redacted text |
| `GEMINI_API_KEY` | Gemini API key |
| `RATE_LIMIT_API`, `RATE_LIMIT_AUTH` | Rate limits (defaults `60/minute` and `10/minute`) |

### Front end

```bash
cd ClauseGuard/Development/frontend
npm install
```

Create `Development/frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8081/api
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

```bash
npm run dev          # http://localhost:3000
```

If `NEXT_PUBLIC_API_URL` is not set, the front end runs on sample data so you can work on the interface without the back end. Restart `npm run dev` after changing environment variables.

> To try the analysis logic without Firebase, MySQL or S3, run the rule engine tests (below). The analysis step takes plain text, so it does not need those services.

---

## API overview

All product endpoints sit under `/api` and need a Firebase ID token (`Authorization: Bearer <token>`), except the public health check. Every query is filtered by the signed-in user, and a user can never read another user's data. Errors are returned as `{ "message": "..." }`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create the profile linked to the Firebase user |
| POST | `/api/auth/logout`, `/api/auth/forgot-password` | Revoke tokens; send a password-reset email |
| GET, POST | `/api/analyses` | List analyses; upload a lease and analyse it |
| GET | `/api/analyses/{id}` | Full clause-by-clause review |
| PATCH | `/api/analyses/{id}/clauses/{clause_id}` | Mark a clause as reviewed |
| POST | `/api/analyses/{id}/clauses/{clause_id}/questions` | Ask ClauseGuard about one clause |
| DELETE | `/api/analyses` | Delete all analyses and purge stored files |
| GET, POST | `/api/notices`, `/api/notices/{id}` | List, run and read notice checks |
| GET, POST, PATCH, DELETE | `/api/events`, `/api/events/{id}` | Timeline events |
| GET, PATCH | `/api/me/preferences` | Explanation detail and reminders |
| GET, DELETE | `/api/me`, `/api/me/gdpr-export` | Profile; delete account and all data; GDPR export |

Controls: explicit CORS allow-list, MIME type read from the file bytes, 25 MB limit, rate limits, audit log for account events, and UUID primary keys. Two development-only token routes exist for testing and must not be enabled in production.

---

## Rule engine

The rule engine (Development/backend/rules_engine/), depending on the topic, evaluates one clause, which has the following arguments: classifier's confidence and optionally lease facts (monthly rent, starting date of tenancy, length of tenancy). It provides a verdict, the rule, a plain-English version of the rule (with the numbers filled in), next steps, a citation and a version of the Law.

Rules are data, not code. They are not coded, they are in the file rules.yaml, and can be read and reviewed by anyone, such as a solicitor, who does not program.

| Verdict | Basis | Colour | Meaning shown to the tenant |
|---|---|---|---|
| `breaks_law` | law | Red | The clause is not allowed. |
| `against_guidance` | guidance | Amber | The RTB advises against it, but it is not a legal rule. |
| `needs_review` | any | Grey | We are not sure. No guess is made. |
| `looks_fine` | any | Green | Within the limit we checked. |

The engine answers `needs_review` when the classifier is not confident, a number cannot be extracted, no verified rule covers the topic, or a date-bound rule has no tenancy start date.

**Rules are draft until verified.** If include_drafts=True, then the rules will be ignored, otherwise, the results are labeled as draft in the demo. To add or modify a rule: make a copy of an entry and save it as a draft; quote the Act section and RTB page; ask someone other than the rule writer to write test cases in tests/cases.yaml from the law; ask a reviewer to verify the rule against the statute and fill in verified_on and verified_by; then run pytest. Currently there are three draft rules (deposit, entry, termination; the termination notice table still has to be filled in from the statute). See `rules_engine/README.md` for the full contract.

---

## Legal source register

`Documentation/Notes/ClauseGuard_RTB_Legal_Source_Register_v2_2026-10-09.xlsx` is the team's knowledge base in human-readable form (v2, 9 October 2026). It has six sheets: a legislation register (18 Acts and instruments), a provision register (27 clause-relevant provisions), an RTB compliance check (12 checks), a point-in-time map (11 rule areas), a change log and maintenance notes. Provisions are checked against the RTB's own published guidance, not only law-firm commentary. At the last count 23 of 27 provisions were RTB-verified and 4 were open or partial. A solicitor review has not yet been held.

The two 2026 dates the engine must branch on:

- **1 March 2026:** the Residential Tenancies (Miscellaneous Provisions) Act 2026 replaced Rent Pressure Zones with a national rent cap (the lower of 2% or CPI, once a year, for all tenancies) and introduced the Tenancy of Minimum Duration for tenancies that start on or after this date. Security of tenure, some termination grounds and initial rent setting depend on the tenancy start date.
- **14 September 2026:** new rules on serving notices, copying notices to the RTB within 7 days, and dispute deadlines. These depend on the date the notice was served.

---

## Model experiments

The language stream (`language_stream/`) tests whether a learned model can classify clause topics better than keywords, and whether extra training on Irish law helps.

| Experiment | Result |
|---|---|
| Domain pre-training of Legal-BERT on about 500 Irish Acts, the Residential Tenancies Act 2004 and a 10,000-clause LEDGAR sample ("Irish LegalBERT") | Perplexity on held-out Irish legal text fell from 2.38 to 1.91. Masked-word accuracy on lease wording stayed at 59 to 62%. Statute text did not help with lease language. |
| Clause-topic classification, trained on one lease and tested on the other (152 labelled clauses, two leases) | BERT, Legal-BERT and Irish LegalBERT scored 0.731 to 0.759. Always answering "other" scored 0.741 and 0.765. The keyword baseline scored 68% against 74% for always "other". No model beat the majority class. |

With so few labels the models cannot be told apart, and accuracy is a misleading metric when "other" dominates. A third lease has since been labelled, and the test is being repeated. Per-class precision, recall and F1, and the false-green rate, are the metrics that matter. The keyword baseline is a stand-in, not a result.

---

## Data and privacy

Real lease documents, labelled clause data and trained model weights are **never committed to this repository**. Only redacted text is processed by the back end and used for training.

| Data | Where | Handling |
|---|---|---|
| Original uploaded file | Nowhere | Processed in memory only. Never written to disk or S3. |
| Raw (unredacted) text | Nowhere | Exists only in memory during the request. |
| SHA-256 hash, file name, size, type | MySQL | Tamper-evident fingerprint and metadata; deleted with the account. |
| Redacted lease text | S3 (private bucket) | Per-user key; deleted by "delete all" and account deletion; lifecycle expiry planned. |
| Clause review results | MySQL | Clause text (from redacted text), verdict, explanation, sources; cascade-deleted. |
| Questions to Ask ClauseGuard | Gemini API | Only the selected clause, the question and the conversation so far are sent. |
| Account and audit log | Firebase and MySQL | Email, display name, consent time; audit events with IP address. |

Redaction fails closed: if the language model for names cannot load, the upload is stopped instead of stored unredacted. One trade-off is open: Ask ClauseGuard sends redacted clause text to an external service (Google Gemini). Redaction quality must be fixed before real users are invited, and ethics approval and a short Data Protection Impact Assessment are planned before real leases are used for the labelled test set.

**Licences of third-party material.** Datasets and templates keep their own licences: LEDGAR (contract provisions), the text of the Irish Acts, and the DSBA specimen tenancy form, which is copyrighted. Do not copy their text into documentation or slides.

**Keep data and weights out of Git.** Add these to `.gitignore` (after checking that no `.jsonl` file is needed elsewhere in the repository):

```
# Language stream data and models
*.jsonl
Development/backend/language_stream/data/
Development/backend/language_stream/models/
*.safetensors
*.pt
*.bin
```

Trained model weights must live outside the repository (shared drive, S3 or Git LFS, to be agreed).

---

## Testing

```bash
cd Development/backend
pytest
```

Backend tests run on in-memory SQLite with S3, Firebase and libmagic mocked, so they need no credentials. They cover the rule engine (expected-verdict cases, draft handling, law-versus-guidance, law version by tenancy start date), the analysis service and the upload-then-read API flow. Test cases are written from the law by someone other than the rule author, so they check the rule rather than restate it.

Not yet covered: extraction, redaction, the notice checker and the front end. There is no continuous-integration pipeline yet. The front end is checked with `npm run build`, which type-checks all routes.

---

## Deployment

- **Front end:** Vercel.
- **Back end:** a Docker image (Python 3.11-slim with Tesseract, Poppler and libmagic, and the spaCy model baked in) on Render. On start-up the container runs `alembic upgrade head` and then Uvicorn on the port Render assigns.
- **Database:** MySQL 8 on Google Cloud SQL (SSL only). **Storage:** a private S3 bucket with public access blocked.
- Firebase credentials are mounted as a secret file. A free-tier cold start of 30 to 60 seconds (loading spaCy and checking migrations) is a known risk for demonstrations.
- Cost is kept low with free tiers and credits.

After deploying, check: the health endpoint, Swagger, CORS from the front-end origin, migrations applied, a test upload and a non-lease rejection, the notice checker, a clause question, and the sign-in flow.

---

## Evaluation

The main technical evaluation compares four approaches on one frozen, lease-split test set: (1) keyword and rule baseline, (2) zero-shot language model, (3) fine-tuned small model feeding the rule engine, and (4) a hybrid retrieval-augmented system with citation checks and abstention. Metrics are per-class precision, recall and F1 with bootstrapped confidence intervals, false-green rate, abstention coverage, calibration, citation validity, extraction accuracy, point-in-time accuracy, injection robustness, and latency and cost. The target is at least 500 labelled clauses with a second annotator and Cohen's kappa, with the test set frozen on 15 November.

User evaluation uses ordinary non-lawyers, starting with international students. A first round with 24 participants (a task-based usability questionnaire) gave a mean rating of 4.0 out of 5; upload was the strongest step (4.33). Only 58% fully understood the risk labels and 29% got lost at some point, so the next sprint covers plainer risk labels, clearer navigation and visible upload requirements. The next round adds the System Usability Scale (benchmark 68) and a comprehension quiz. Legal correctness is checked separately, by a solicitor reviewing the rules and sources, not the interface.

---

## Known limitations

- **Few rules.** Only deposit and entry rules are active in the lease analysis. Rent review, repairs, fees and Tenancy of Minimum Duration termination rules are still to be written, so many clauses are shown as grey (not assessed). On our 11-clause synthetic lease, both flags raised were correct, and no clause was wrongly shown as fine, but three clauses that should have been flagged were not assessed.
- **No model beats the baseline yet.** The keyword classifier is a stand-in. Splitting keeps very long special-provision blocks as a single clause, so one label can cover several topics.
- **Redaction over-redacts.** The name detector can tag "Landlord" and "Tenant" as personal data, and the passport pattern can match ordinary reference codes. Fix planned: an allow-list of legal role words and a narrower passport pattern, plus a labelled test set.
- **Documents.** DOCX files are accepted at upload but not yet extracted. Page numbers are not preserved, so clauses may all show as page 1.
- **Ask ClauseGuard is not grounded** in retrieved legal text, there is no enforced "I don't know", and its error fallback text still needs replacing with an honest error message.
- **Wording to update.** The notice checker's rent-cap wording still refers to Rent Pressure Zones and needs updating to the March 2026 national cap after legal review. A raw `{reason}` placeholder can appear in some "not sure" explanations.
- **Draft rules.** All rules are draft until a second person verifies them against the statute. Some register items (for example the deposit protection scheme) are open and deliberately not encoded.
- **Testing.** No CI, and no tests for extraction, redaction, the notice checker or the front end.

---

## Roadmap

- [x] Idea confirmed after mentor review; project plan, requirement specification, personas and user flows
- [x] Legal source register v2
- [x] Front end: public pages, auth, dashboard, upload, review workspace, notice checker, timeline, settings, guided tours
- [x] Back end core: auth, upload checks, OCR, lease validator, redaction, S3, notice checker, timeline, preferences, data export and deletion
- [x] Rule engine with draft rules and tests
- [x] First user evaluation round (24 participants)
- [ ] Rules for rent review, repairs, fees and termination (before and after 1 March 2026); fill in the termination table
- [ ] Redaction allow-list and a labelled personal-data test set
- [ ] DOCX extraction and page numbers
- [ ] CI that runs the test suite on every pull request
- [ ] **1 Nov:** first end-to-end slice on real leases with real flags and citations
- [ ] **15 Nov:** 500+ labelled clauses, second annotator, test set frozen, topic traffic lights, second user round with SUS
- [ ] **29 to 30 Nov:** four-way comparison (keyword, zero-shot, fine-tuned, hybrid), solicitor check of rules, feature freeze
- [ ] **13 Dec:** hardening, injection tests, performance and cost, DPIA, final report and demo

---

## Team and roles

| Member | Role | Focus |
|---|---|---|
| Siddharth Varma Raja | Project manager, legal research lead, back end | Sprint board, repository and meeting logs, lease validator and template diff engine, redaction, cost and deployment, integration |
| Prasad Nitin Pansare | Back-end and knowledge-base engineer | FastAPI service, Firebase authentication, database models and migrations, upload and OCR pipeline, S3, API documentation |
| Shubham Tatyasaheb Patil | NLP and AI engineer | Clause splitting and classification (Irish LegalBERT), labelling tool, model experiments, rule engine. Ownership of the rules and legal checks is to be confirmed with the team. |
| Kameshwara Karthik Ayyalasomayajula | Front-end and UX developer | Personas, mind map, prototypes and wireframes, Next.js front end, Vercel deployment |
| Jude Fernandes | QA, data and documentation lead, front end | Personas and user flows, testing and hosting research, front-end development, user evaluation questionnaire |

---

## Project management and contributing

- **Process:** Scrum over twelve teaching weeks (21 September to 13 December 2026), planned as six two-week sprints, with a weekly class presentation and a written retrospective at the end of each sprint. Every team and mentor meeting is logged in `Project_Management/Meetings/`, and retrospectives are in `Project_Management/Retrospectives/`. Supervisor feedback is kept in a typed feedback log and reviewed every week.
- **Branching:** commit to the `stage` branch. `stage` is merged to `main` every Wednesday once tested. Open a pull request, and pull the latest `main` often.
- **Reviews:** a pull request needs a reviewer other than its author. Rule changes also need a separate legal-source check (see [Rule engine](#rule-engine)).
- **Conventions:** keep commits small with clear messages; never commit secrets, real leases, labelled data or model weights; keep this README current when the stack, structure or setup steps change.
- **Decisions:** consensus first; otherwise the role owner decides within their area; cross-cutting decisions by majority. On legal-content disputes, whoever completed the RTB cross-check for that item decides.

This is an academic group project. ClauseGuard is **not** endorsed by the Residential Tenancies Board.

### Licence

No licence has been chosen yet, so all rights are reserved by default. Add a `LICENSE` file (and a licence badge) once the team has decided.
