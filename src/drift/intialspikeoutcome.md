
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