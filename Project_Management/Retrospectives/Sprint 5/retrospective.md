Retrium Retrospective, October 30, 2026
Technique: What Went Well, What Didn't go Well
======================================

What Went Well?
---------------
- Documentation Progress (4 votes)
    - All the professors' points were noted down and discussed on 24/10, and kept as a typed feedback tracker to show each week
    - Mentor call on 27/10 explained how the presentation must be shown over the next 2 to 3 weeks, with the updates and tasks needed
    - Architecture changes and migrations documented as they were investigated (25/10)
    - README rewritten for GitHub: real repository structure, setup steps, API overview, known limitations, roadmap and the educational-project disclaimer
    - Everyone updated their slides for the Week 6 presentation (29/10)

- Strategic decisions (3 votes)
    - Work split agreed with the mentor on 27/10: one person on extraction and redaction, one on architecture, one on the model, and two on the front end UI
    - Decided to replace the local extraction and redaction libraries (Tesseract, spaCy) with managed Google Cloud services (Document AI and Cloud DLP), and to add a 15-page limit and a lease gatekeeper
    - Rule: all work goes to the stage branch and is tested before it goes to main (28/10)
    - Asked by the mentor to think about extra features to enhance the application, and the first ideas for extra features, model enhancement and chatbot input were discussed (27/10)

- Task Completion (5 votes)
    - Extraction and redaction alternative tested locally (25/10), then connected to the application
    - Domain, extraction, redaction and diff_engine issues solved, and the slice-to-slice flow working properly (29/10)
    - Frontend UI changes and rule engine updates pushed, and all work merged to main on 29/10
    - Front end now handles the gatekeeper's HTTP 400: the upload button stays disabled and the backend's reason is shown
    - Back-end deployment problems fixed: gcp-key.json mounted as a Render secret file, document-ai pip conflict resolved, CORS and start-up crashes fixed, and a lighter Docker image
    - Gatekeeper tested on a synthetic lease (accepted), invoice text (rejected) and a "License to Occupy" (rejected)

- Team collaboration (4 votes)
    - Seven meetings in seven days (six team meetings and one mentor meeting), all on Microsoft Teams
    - 94% attendance across the week (33 of 35 possible attendances); all five members at five of the seven meetings
    - Frontend changes shown to the whole team on 25/10, and decisions made from everyone's opinions
    - Back end and front end teams discussed the look of the summary page and the hosted domain in detail (28/10)


What Didn't Go Well?
--------------------

- Meeting Efficiency (3 votes)
    - Tasks were recorded only on 24/10 and 27/10; the 25/10, 26/10, 28/10 and 29/10 meetings have no task list, so owners and dates are unclear
    - The presentation was left to the last two days, with late meetings on 28/10 (23:00) and 29/10 (23:30 to 00:30), and was only agreed on 28/10 to be ready "by the next day"
    - The 26/10 log is inconsistent (time 12:00 to 12:45 but duration 15 minutes), so the record cannot be trusted for meeting time
    - The mentor asked for extra features, but no decision on any feature has been logged

- Technical Research Delays (4 votes)
    - Extraction, redaction and diff_engine problems were assigned on 27/10 and were not solved until 29/10, and the hosted domain issue ran until then too
    - No logged outcome for the next round of model training, model enhancement or chatbot integration (assigned to Shubham on 24/10 and 27/10)
    - No measured figures yet for the cloud move: Docker image size, cold start time, cost per lease and the redaction accuracy of Cloud DLP
    - Rule coverage is still unconfirmed: the report showed only deposit and entry rules active, and the 29/10 rule engine update does not say whether rent review, repairs and fees rules were added
    - Gatekeeper false rejections on real leases (room rentals, licences, different wording) have not been measured; DOCX extraction and page numbers are still unfixed

- Planning and Documentation Gaps (2 votes)
    - The original file now goes to Google Document AI before redaction, and the processing region, data retention and cost per lease are not yet confirmed or written down
    - Open decision on the 15-page limit: a longer lease would silently lose clauses unless the tenant is warned
    - The literature review on accuracy, simplifying legal language and visualisation, requested by the professors, has not started
    - No decision logged on the open questions from the proposed-changes review: who owns the rules and legal checks, where language_stream and model weights live, and which licence to add

- Product and Usability Issues (3 votes)
    - The 24/10 deadline of Monday for most frontend work, so the next user evaluation round could start, was missed: UI changes were still being discussed on 28/10 and only pushed on 29/10, so round 2 has not started
    - Fixes from the 24-person user study are still open: back button and menu, visible file types, plainer risk labels and clearer progress
    - Topic traffic lights and the more visual summary are designed but not built
    - There is still no CI pipeline, and no automated tests for extraction, redaction, the notice checker or the front end

Wrap-Up
=======

Participants gave this retro an average rating of 3.4.