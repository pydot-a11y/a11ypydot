I want to create a squad-specific Jira hygiene/exception view for the **Methods & Tools** squad in Jira Cloud.

Before generating anything, inspect the Jira configuration available to me and identify the actual field(s) currently used to associate work with the Methods & Tools squad — for example Team, Component, parent Capability, or another field. Do not assume field names or values.

Then help me create a saved JQL filter/dashboard called:

**Methods & Tools – Jira Hygiene**

I want it to surface exceptions that need attention, including:

1. **Epics with missing required metadata**, including empty Labels where applicable.
2. **Stale Epics** — Epics that are still open/in progress and have not been updated for a meaningful period. Start with 30 days, but make this easy to adjust.
3. **Work outside the expected hierarchy** — Tasks/Stories/Bugs that should belong to an Epic but currently have no appropriate parent.
4. Any other obvious Jira hygiene problems you can detect for our squad without introducing new process or mandatory fields.

Important:

* Scope everything to **Methods & Tools only**, not the full fleet.
* Use the existing Jira hierarchy and fields rather than duplicating Team/ownership information onto child work items.
* Do not modify any work items.
* Show me the JQL for each check before anything is saved.
* Validate each query against our Jira data and explain briefly what it catches.
* If one combined filter would become difficult to understand, create separate saved filters for each exception and use them together on one dashboard.
* Recommend the best Jira Cloud gadget/view for presenting these as an actionable exception list rather than general reporting.

At the end, give me the exact filters/dashboard configuration I should save.
