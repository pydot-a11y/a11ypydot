Perfect — let’s re-frame the spike as if you were writing it today with what you’ve actually discovered and implemented. Here’s how each section would look now:

⸻

Spike Findings
	•	Structurizr On-Prem (Next.js) only handled workspace creation and stored the workspace and eonid mapping.
	•	There was no mechanism to track modifications (when/by whom a workspace was modified).
	•	Explored extending the Java Structurizr Plugin to hook into the workspace save lifecycle and emit modification events.
	•	Two main approaches considered:
	1.	Direct DB Write from Plugin
	•	Plugin would update MongoDB directly.
	•	Cons: exposed DB credentials, tightly coupled plugin to schema, weak audit trail.
	2.	Authenticated API Call to Portal (Recommended)
	•	Plugin emits a workspace-modified event to the portal API.
	•	Portal validates/authenticates and updates Mongo.
	•	Pros: centralized schema changes, strong audit logging, better security.
	•	Auth Mechanism: Initially considered JWT/mTLS/HMAC.
	•	During implementation, Kerberos was adopted due to enterprise domain constraints (integration with existing MSAD infrastructure).

⸻

Proposed Implementation Approach

In Structurizr Plugin (Java):
	•	Hook into putWorkspace(...) save lifecycle.
	•	Construct workspace-modified event payload:
	•	workspaceId, modifiedAt, modifiedBy, eventId (unique), optional eonId.
	•	Send event securely to Portal API (/api/events/workspace-modified) using Kerberos authentication.
	•	Retry logic + exponential backoff added.
	•	Idempotency ensured by eventId.

In Structurizr Portal (Next.js):
	•	Added new API routes:
	•	/api/events/ping → used by plugin to verify session/auth.
	•	/api/events/workspace-modified → accepts modification events.
	•	/api/debug/db → debug Mongo connectivity.
	•	Middleware validates Kerberos session and resolves user identity.
	•	Events are:
	•	Logged into a new workspace_activity collection (audit log).
	•	Used to upsert lastModifiedAt and lastModifiedBy into the workspaces collection.

MongoDB Schema Updates:
	•	workspaces collection:
	•	Added lastModifiedAt (Date), lastModifiedBy (String).
	•	New workspace_activity collection:
	•	eventId (String, unique)
	•	workspaceId (String)
	•	eonId (optional String)
	•	modifiedAt (Date)
	•	modifiedBy (String)
	•	pluginVersion (optional String)
	•	receivedAt (Date)

⸻

Spike Outcome
	•	Final approach chosen: Plugin → Kerberos-authenticated API → Structurizr Portal → MongoDB.
	•	Verified flow:
	•	Plugin can emit events and portal receives them (confirmed via /ping).
	•	MongoDB persistence currently blocked by Kerberos write permissions, being resolved.
	•	Design validated and implementation path is clear — spike objective complete.

⸻

👉 This way, your spike ticket shows what you explored, what you chose, what changed (JWT → Kerberos), and where you landed.

Would you like me to also draft a short “lessons learned” paragraph you can add at the bottom of the spike (something like: “Escalating early could have unblocked Kerberos faster”) so you frame the delay as a growth point rather than a weakness?