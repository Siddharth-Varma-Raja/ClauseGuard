Retrium Retrospective, October 9, 2026
Technique: What Went Well, What Didn't go Well
======================================

What Went Well?
---------------
- Strategic Decisions (4 votes)
    - Decided to host the application on Vercel, with the option of moving to the paid version after mentor feedback.
    - Initial Vercel deployment of the frontend completed.
    - Hosting options (AWS, Vercel, Appwrite, CloudSQL) researched by all members for comparison.
    - Plan made to meet a solicitor to get more data and research for the project

- Task Completion (3 votes)
    - Jude and Karthik pushed the initial frontend code to GitHub
    - Siddharth almost finished the diff_engine code and started refining and integrating it.
    - Shubham researched the points raised by Brendan, discussed the OCR dependency (scan, redaction and extraction) and reported progress on model training
    - Prasad continued the login authentication work based on Shubham's initial model training

- Team collaboration (2 votes)
    - All meetings held online on Microsoft Teams, five meetings in the week (06/10, 07/10, 08/10).
    - All six members attended the 08/10 meeting and worked together on the slides for the upcoming presentation.
    - 80% attendance across the week

What Didn't Go Well?
--------------------
- Meeting Efficiency (4 votes)
    - The deployment decision came up again in the 06/10 and 07/10 meetings and was still not final.
    - Updates had to be repeated for those who missed meetings

- OCR & Data Extraction Limitations (3 votes)
    - failed to reliably extract dates from low-quality physical scans of eviction notices.
    - The integration between the OCR output and the rules engine proved fragile when dates were formatted incorrectly, requiring an emergency fix to enforce strict ISO date formats in Pydantic models.

- Technical Delays (3 votes) 
    - The architecture of the RULE & RAG engine and the Irish LegalBERT approach were still undecided.
    - Need to decide on CloudSQL or another database service.
    - The integration is yet to be tested and worked on.

=======

Participants gave this retro an average rating of 3.