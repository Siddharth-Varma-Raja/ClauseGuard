Retrium Retrospective, November 6, 2026
Technique: What Went Well, What Didn't go Well
======================================

What Went Well?
---------------
- Documentation Progress (4 votes)
    - The professors' pointers from the previous lectures were discussed as a team on 02/11, and the next tasks were mapped out from them
    - Mentor call on 03/11: Brendan explained how the individual diary has to be updated, and everyone presented their pointers for the week
    - Everyone was reminded on 04/11 to finish and submit their individual diaries before 6pm on Thursday
    - Karthik and Jude showed how the full report page, the downloaded report file and the flow of the application will look (05/11)
    - A user evaluation plan was discussed again and updated in the presentation (05/11)

- Strategic decisions (3 votes)
    - Agreed on 02/11 to search for alternative LLM models for the chatbot and the draft generator, to keep usage and costs low
    - Brendan advised tweaks to everyone's pointers on 03/11, and the pointers were discussed again in the team meeting that night
    - Questions on the chatbot LLM, the move to Google Cloud and the user evaluation were asked and answered in the mentor meeting
    - New feature work agreed for the back end: lease versioning and the draft (mail) generator (02/11)

- Task Completion (5 votes)
    - Shubham got the AskClauseGuard chatbot working (03/11), after weeks of recurring model problems
    - Siddharth raised the page limit of the OCR, so leases of more than 15 pages are now accepted (04/11), which closes the open question on long leases
    - Siddharth added the first version of the draft generator (03/11) and pushed the update to the mail generator (05/11)
    - Karthik and Jude updated the dashboard for new and existing users (04/11) and made UI changes ready to push to GitHub
    - Prasad presented the upload-time calculation and the architecture changes (03/11)
    - Final pushes to main made, deployments updated and the application tested (05/11)

- Team collaboration (3 votes)
    - Five meetings in the week (four team meetings and one mentor meeting), all on Microsoft Teams
    - 96% attendance (24 of 25 possible attendances); all five members at four of the five meetings
    - Prasad and Siddharth checked the extractor page-limit details together before the change was made
    - Opinions on what looked professional in the UI were taken from the whole team on 02/11


What Didn't Go Well?
--------------------

- Meeting Efficiency (4 votes)
    - All four team meetings ran late at night (23:00 to 00:15), and the mentor call was the only daytime meeting
    - Prasad was absent on 05/11, the night of the final pushes to main, so the architecture work had no update that night
    - The 05/11 meeting ran 60 minutes, and the discussion of final pushes, faults and the evaluation plan left little time for each topic
    - Decisions on extra features, asked for by the mentor on 27/10, have still not been logged

- Technical Research Delays (3 votes)
    - The mail (draft) generator has faults because of model availability, still to be worked on (05/11)
    - Model issues kept recurring for the chatbot, and cheaper alternative LLMs had to be researched
    - Shubham is still looking for ways to get more leases to train the self-learning model, so labelled data remains the limit
    - Lease versioning was assigned on 02/11 and 03/11, but no progress is reported on 04/11 or 05/11
    - The rule engine update and the self-learning model check (Shubham) have no logged outcome
    - Migration with little downtime and keeping costs low (Prasad and the team) are still open research items

- Planning and Documentation Gaps (3 votes)
    - User evaluation round 2 has been planned on 02/11, 03/11 and 05/11, but no evaluation session is logged yet
    - The literature review requested by the professors has not started
    - Documents that changed with the cloud move (README, interim report, privacy page) have no logged update
    - Tasks were recorded on 02/11 and 03/11 only; 04/11 and 05/11 list updates but no new tasks or dates
    - The new limit for the OCR page count and its cost per lease are not written down

- Product and Usability Issues (4 votes)
    - The professional look of the UI is still being iterated, with no final design agreed
    - The faults in the mail generator mean it cannot yet be shown reliably
    - Fixes from the 24-person user study (plainer risk labels, back button, visible file types) are not mentioned in this week's updates
    - There is still no CI pipeline and no logged progress on automated tests

Wrap-Up
=======

Participants gave this retro an average rating of 3.9.