
Spike: Drift Detection in SecArch Cases (iDesigner)

Purpose

This spike explored how drift detection applies to Security Architecture (SecArch) cases and where gaps exist between approved security intent and deployed system reality.

The focus was on understanding the problem space — not on proposing solutions or tooling.


Spike Outcome (Summary)

This spike established that:
	1.	SecArch drift is not a detection problem
Existing tooling already detects configuration change. The challenge lies in interpreting those changes in relation to approved security architecture decisions.
	2.	Architectural intent and runtime state operate at different levels
SecArch approvals are expressed as architectural intent and patterns, while drift tooling operates on low-level configuration data. Bridging this gap is the core difficulty.
	3.	iDesigner Case IDs are necessary but insufficient
They provide governance traceability but do not encode intent at a level that can be directly enforced or monitored.
	4.	Drift detection and implementation validation are distinct concerns
Detecting post-approval change is different from validating whether approved intent was ever implemented. These should not be conflated.
	5.	Not all SecArch decisions are drift-detectable
Some decisions are abstract, assumption-based, or time-bound. Any future approach must explicitly scope what is observable.



Context: SecArch Cases and iDesigner

A SecArch case represents the outcome of a formal security architecture review.
Each case is tracked using an iDesigner Case ID, which records:
	•	approved architectural patterns and controls,
	•	risk acceptances and exceptions,
	•	Permit-to-Build / Permit-to-Operate decisions.

While SecArch reviews occur at a point in time, they implicitly define expectations about a system’s security posture as it evolves.

This spike treats iDesigner as a governance reference, not a complete or precise specification.



What “Drift” Means in This Context

In this spike, drift refers to security-relevant changes that cause a system to diverge from what was approved during SecArch review.

Examples include:
	•	IAM policy changes affecting privilege scope,
	•	network exposure changes (e.g. internal → external),
	•	encryption configuration changes,
	•	weakening or removal of logging and audit controls,
	•	introduction of unreviewed infrastructure components.

Drift detection, in this sense, is about identifying material deviations from approved security decisions, not detecting every change.

⸻

Observations on Existing Drift Detection Tooling

Current cloud security tooling is effective at detecting configuration-level change.

However:
	•	findings are typically asset-centric, not case-centric,
	•	baselines are defined independently of SecArch approvals,
	•	architectural and risk context is not preserved.

As a result, these tools surface change, but do not reliably convey architectural significance.

⸻

Key Challenges Identified
	•	Abstraction mismatch
SecArch intent is architectural; drift signals are configuration-level. The mapping between the two is inconsistent.
	•	Intent ambiguity
SecArch cases often approve patterns (e.g. “OAuth-based authentication”) without specifying all enforceable parameters.
	•	Interpretation overhead
Determining whether a drift finding violates approved intent frequently requires manual judgement.
	•	Shared ownership
Drift may occur in shared platforms or infrastructure where remediation responsibility is unclear.

These challenges are as much governance-related as they are technical.

⸻

Related Area Explored: Architecture Evidence Validation

A related idea discussed during the spike was architecture evidence validation — assessing whether approved security intent is reflected in implementation artefacts.

This involves:
	•	using iDesigner artefacts as a record of approved intent,
	•	translating that intent into descriptive architectural views,
	•	and searching code or configuration repositories for supporting evidence.

This does not detect drift over time.
It highlights potential gaps between approved intent and initial implementation.

There are clear limitations:
	•	descriptive models (e.g. C4) are not formal specifications,
	•	evidence may exist but still be ineffective,
	•	absence of evidence does not prove non-compliance.

This area remains exploratory.

⸻

Areas Not Touched in This Spike

This spike did not:
	•	propose tooling or architecture,
	•	define enforcement or remediation mechanisms,
	•	assume all SecArch decisions are machine-detectable,
	•	or treat iDesigner data as complete or authoritative.

These were intentionally left out to keep the investigation focused.

⸻

Candidate Areas for Further Investigation

Based on this spike, possible follow-on investigations include:
	•	identifying which SecArch decisions are observable, in practice, at runtime,
	•	reviewing a small set of real SecArch cases to assess baseline clarity,
	•	mapping existing drift findings to architectural relevance,
	•	or exploring one narrowly scoped control area (e.g. authentication) in depth.

⸻

Closing Note

This spike shows that SecArch drift detection is fundamentally a governance and interpretation problem, not simply a monitoring problem.

Further work is required to clarify enforceable baselines, preserve architectural context, and explicitly scope what drift detection can and cannot cover.


Spike outcome: This spike clarified that SecArch drift detection is primarily a governance and interpretation problem rather than a detection problem. Existing tooling already surfaces configuration change, but lacks architectural and decision context needed to assess SecArch relevance. The investigation highlighted a mismatch between architectural intent captured during SecArch review and the configuration-level signals available at runtime, established that iDesigner Case IDs provide necessary traceability but are insufficient as enforceable baselines, and distinguished drift detection from initial implementation validation. The spike intentionally avoided proposing solutions and instead identified where further, more targeted investigation is required.



No immediate implementation work is proposed as part of this spike. Follow-on investigation is required to determine which SecArch decisions are observable and interpretable via drift detection in practice, and where architectural intent cannot be reliably mapped to runtime signals. Any further work should focus on grounding this problem using real SecArch cases and existing drift findings before solution design is considered.


 Ticket 1 (Recommended Next Spike)

Title:
Spike: Identify Which SecArch Decisions Are Drift-Detectable in Practice

Type: Spike

Brief Description:
Investigate a small sample of recent SecArch cases to determine which approved security decisions can be meaningfully observed and assessed via runtime drift detection, and which cannot. The goal is to ground the drift discussion in real cases and existing drift findings, not to propose tooling or implementation.

Why this ticket exists:
This directly addresses the current spike’s main open question and reviewer feedback about operational grounding.

⸻

🔍 Ticket 2 (Optional, Only If Capacity Allows)

Title:
Spike: Map Existing Drift Findings to SecArch Relevance

Type: Spike

Brief Description:
Review a limited set of drift findings from existing cloud security tooling and assess whether they can be meaningfully linked back to SecArch decisions using iDesigner Case IDs. Identify where architectural context is missing or ambiguous.

Why this is separate:
	•	Keeps focus on interpretation, not detection
	•	Avoids mixing “what drifts” with “what should drift”

If capacity is tight, this can wait.

⸻

⚠️ Ticket 3 (Optional, Exploratory Only)

Title:
Spike: Explore Feasibility of Architecture Evidence Validation

Type: Spike

Brief Description:
Explore, at a high level, whether approved SecArch intent can be validated against implementation artefacts (e.g. code or configuration) in a reliable way. This spike is exploratory and intended to surface limits, risks, and false-assurance concerns rather than propose an approach.

Important note:
Only create this if stakeholders explicitly want it.
Otherwise, keep it as a noted future investigation, not an active ticket.


Hi Ebuka,
Hope you’re doing well 😊
With your masterclass session coming up this month, could you share the dates that work best for you so we can get it scheduled?



Once the date is confirmed, please complete the form found in the reminder email with your masterclass details. [I could resend the link, if you missed it].



Happy to support you along the way — whether that’s refining the topic, shaping the session, or anything else you need.




Thanks for the update — I really appreciate you being open about this.

Pushing the date sounds sensible given everything on your plate right now. Let’s plan to move your session to a later month.

When things settle a bit, feel free to reach out with dates that work better, and we’ll pick it up from there. Happy to support whenever you’re ready.



Here’s the text from the image (verbatim, cleaned for readability):

⸻

Important Note: I cannot provide an exact total count of all repositories with DSL files because:
	•	The search results are limited in size (showing 15 files at a time)
	•	There appear to be many more repositories with .dsl files across the organization
	•	An exhaustive search across all repositories would be needed for a precise count

To get an accurate total count, you would need to run a comprehensive query like:

/search?q=file:.*\.dsl$ workspace

This will show all repositories containing .dsl workspace files, and you can then manually check each for the !adrs directive.

From my analysis, at least 23 repositories have .dsl files without ADRs, but the actual number is likely higher.



So we have the umbrella Epic, which is an epic called the Structurizr product adoption metrics. I will share with you the description, what's in the description box for that, and some of the metrics we want to see, and let you know which of the metrics are currently possible and which of them are not. Linked to this epic is the EA analytics metrics epic, which is the epic that covered the custom front-end and back-end for us to be able to get flexibility on what metrics to show. But whilst we were almost at the product stage, the T4TM, the data lake approach was introduced to us, right? So then we created another epic to say tech metric ETL pipeline for us to investigate that. Under the tech metric ETL pipeline, the creates the scripts for ETL story that is in review and also to set up auto-scheduling for the tech for tech metrics ETL pipeline, which is in a to-do. But this has been paused a bit to introduce the information that I shared with you, right, in the write-up. So I want to understand, are we still going to go, all the stories we're going to create, and even the description you've given me, should it go under the tech metric ETL pipeline or should it go under the mother Structurizr product adoption epic, or should this be a different epic altogether? What do you think? And if it should be anything, buttress with explanation and also what's the names should be.