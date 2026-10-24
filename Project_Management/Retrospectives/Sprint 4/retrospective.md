Retrium Retrospective, October 23, 2026 (covering October 17 – October 23, 2026)
Technique: What Went Well, What Didn't go Well
======================================

What Went Well?
---------------
- Documentation Progress (4 votes)
    - Interim report and presentation compiled and read through together on 22/10 (2.5 hours) before submitting both on Brightspace
    - Everyone collected pointers from their own area for the interim documents (19/10)
    - API documents prepared after the deployment pointers (21/10)
    - User evaluation questionnaire confirmed and Google Form made (17/10)
    - Professors' feedback from 16/10 turned into a typed feedback log and work tracker

- Strategic decisions (3 votes)
    - Deadlines for deployment and integration set after the mentor call with Brendan (20/10)
    - Model training to be made more extensive, with added models (20/10)
    - UI changes for the application's output agreed from the mentor's advice (20/10)
    - Deployment plan and the integration steps after deployment agreed (19/10, 21/10)

- Task Completion (5 votes)
    - Backend deployed, then frontend, backend and model integrated in one working session on the night of 21/10
    - Clause analysis now runs on the uploaded lease's own text, with a rule engine (three draft rules) and 19 automated tests passing
    - Test on an 11-clause synthetic lease: both flags raised were correct and no clause was wrongly shown as fine
    - First user evaluation round completed with 24 participants: mean rating 4.0 out of 5, upload the strongest step (4.33)
    - Frontend login redesigned and all 15 pages built and type-checked

- Team collaboration (5 votes)
    - Seven meetings in six days (six team meetings and one mentor meeting), all online
    - 94% attendance across the week (33 of 35 possible attendances); all five members at five of the seven meetings
    - Joint late-night session on 21/10 (23:00 to 01:30) to get the application working for the demo
    - Everyone contributed to both documentation and implementation, as the professors asked


What Didn't Go Well?
--------------------

- Meeting Efficiency (2 votes)
    - No tasks were recorded for the 17/10 and 22/10 meetings, so issues raised (chatbot, redactor) had no named owner or date
    - Work bunched into the last two days: a 2.5-hour session on 21/10 ending at 01:30 and another 2.5-hour session on 22/10
    - Decisions on migrations, costs and making the application "enterprise ready" were pushed to next week

- Technical Research Delays (4 votes)
    - Clause analysis is still thin: only deposit and entry rules are active, so 9 of the 11 clauses in the synthetic lease were not assessed (rent review, repairs and fees have no rules yet)
    - No model beats the "always other" baseline; about 150 to 290 labelled clauses are too few to tell the models apart, and model integration is only at an initial stage
    - Redaction over-redacts words such as "Landlord" and "Tenant" and ordinary reference codes; the chatbot and redactor issues raised on 17/10 are not fully fixed
    - Backend deployment errors took until 21/10 to resolve, and a 30 to 60 second cold start is a risk for demos
    - Known bugs: page numbers lost (every clause shows page 1), DOCX accepted but not extracted, a raw "{reason}" placeholder shown to users, Ask ClauseGuard fallback text mentions rent pressure zones, notice checker wording still pre-2026

- Planning and Documentation Gaps (3 votes)
    - Literature review on accuracy standards, simplifying legal language and visualisation has not been done
    - No solicitor review of the rules yet; 4 provisions in the legal source register are still open or partial
    - No CI pipeline (due 18/10), and no automated tests for extraction, redaction, the notice checker or the frontend
    - Topic traffic lights and a more visual summary are designed but not built
    - Interim report was written against fast-moving code, so proper formatting couldn't be done for the report

- Product and Usability Issues (4 votes)
    - Only 14 of 24 participants (58%) fully understood the risk labels; the labels need plainer wording
    - 7 of 24 participants (29%) got lost, with no back button from the review page to home and harder navigation on mobile
    - Accepted file types were not visible on the upload page, and large leases took a long time to analyse
    - The Explanation, Sources and Ask tabs felt duplicated and "Finding clauses" was the weakest rated step (3.79)

Wrap-Up
=======

Participants gave this retro an average rating of 4.