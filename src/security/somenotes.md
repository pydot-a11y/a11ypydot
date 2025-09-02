Love that. Here’s a clean, concrete implementation structure you can adopt end-to-end (auth = Kerberos/SPNEGO via Webstax; plugin = Java; portal = Next.js; DB = Mongo in phase 2).

1) Architecture (single slide)
	•	Plugin (Java) → SPNEGO (Kerberos) → Webstax/OIDC → session cookie → Portal (Next.js) → Mongo
	•	Event type: WORKSPACE_MODIFIED
	•	Write model (phase 2): workspace_activity (append-only) + workspaces.lastModified* (upsert)

2) Repos & module layout

A. Plugin repo

/src/main/java/...
  com.ms.szr.plugin/
    WorkspacePlugin.java          // beforeSave/afterSave hook
    emit/
      EventPayloads.java          // builds JSON
      EventEmitter.java           // GET prime → POST event
    http/
      RestTemplateConfig.java     // HttpClient5 + SPNEGO + CookieStore + redirects
    util/
      Json.java, Clock.java
/resources/
  logback.xml

B. Portal repo

/app (or /pages)
/api/events/ping/route.ts         // GET 204 (priming)
/api/events/workspace-modified/route.ts // POST 204 (phase1), +DB (phase2)
/lib/db.ts                         // Mongo client
/lib/validation.ts                 // zod schema (phase2)

3) Cross-team contracts

HTTP
	•	GET /api/events/ping → 204
	•	POST /api/events/workspace-modified
	•	Headers: session cookie (from Webstax), Content-Type: application/json
	•	Body:

{
  "eventId":"uuid",
  "eventType":"WORKSPACE_MODIFIED",
  "workspaceId":"12345",
  "modifiedAt":"2025-09-02T10:01:02Z",
  "modifiedBy": "optional@later"
}


	•	Responses: 204 (ok), 400 (bad JSON), 401 (no session), 429/5xx (errors)

4) Kerberos runtime shape
	•	JVM flags (JDK≥16):

--add-exports=java.security.jgss/sun.security.jgss=ALL-UNNAMED
--add-exports=java.security.jgss/sun.security.jgss.spi=ALL-UNNAMED
--add-exports=java.security.jgss/sun.security.krb5=ALL-UNNAMED
--add-exports=java.security.jgss/sun.security.krb5.internal=ALL-UNNAMED
--add-exports=java.security.jgss/sun.security.krb5.internal.ccache=ALL-UNNAMED
--add-exports=java.base/sun.security.util=ALL-UNNAMED
-Djavax.security.auth.useSubjectCredsOnly=false


	•	Non-Windows: -Djava.security.krb5.conf=/etc/krb5.conf; ensure TGT via kinit/keytab.

5) Plugin internals (concrete)

EventEmitter.java
	•	Holds a single RestTemplate built from RestTemplateConfig (shared CookieStore).
	•	emitModified(long workspaceId):
	1.	GET /api/events/ping (consume entity)
	2.	POST /api/events/workspace-modified (payload from EventPayloads.modified(...))
	3.	Log status; thin slice: no retries yet.

WorkspacePlugin.java
	•	Prefer afterSave(event); else call at end of beforeSave after event.setJson(newJson).
	•	Resolve workspaceId (from event or parsed JSON).

RestTemplateConfig.java
	•	Apache HttpClient5:
	•	DefaultRedirectStrategy
	•	BasicCookieStore (shared)
	•	SPNEGO/Kerberos scheme + credentials (install your corp provider)
	•	Wrap in HttpComponentsClientHttpRequestFactory.

6) Portal internals (concrete)

Phase 1
	•	ping: return 204.
	•	workspace-modified: console.log(body); return 204.
	•	(If cookie-session + CSRF is on) exempt this route or use SameSite rules.

Phase 2
	•	Validate with zod:
	•	eventId (uuid), workspaceId (string), modifiedAt (ISO), eventType (“WORKSPACE_MODIFIED”)
	•	Mongo:
	•	workspace_activity: insert {..., receivedAt: new Date()}
	•	Indexes: { eventId: 1 } unique, { workspaceId: 1, modifiedAt: -1 }
	•	workspaces: upsert by workspaceId, set { lastModifiedAt, lastModifiedBy }

7) Deployment path
	•	Plugin: update jar → flip releaseLink → run release job → train deploy --env prod → restart SZR
	•	Portal: normal CI/CD
	•	Config: ship JVM flags + krb5.conf location (and keytab mount if used)

8) Testing strategy

Connectivity
	•	curl --negotiate -u : -L <portal>/api/events/ping → 204
	•	Save a workspace → portal logs show event; plugin gets 204

Negatives
	•	No Kerberos ticket → 401/redirect loop
	•	Bad JSON → 400
	•	(Phase 2) Duplicate eventId → no duplicate insert

Integration
	•	Capture correlation: log eventId, workspaceId both sides

9) Observability & hardening (phase 2)
	•	Structured logs (eventId, workspaceId, status, latency)
	•	Plugin retries: exponential backoff on 5xx/timeout; don’t block saves
	•	Idempotency on server (eventId unique)
	•	Optional: capture modifiedBy from trusted header/session if platform forwards it

10) Risk register & mitigations
	•	SPNEGO in container: add Kerberos libs, mount ticket/keytab, JVM flags → validate in dev first
	•	Redirect POST loss: always GET-prime session then POST using same CookieStore
	•	CSRF with cookie sessions: exempt route or set appropriate SameSite
	•	KDC/realm drift: centralize krb5.conf delivery & version it

11) Acceptance criteria (Phase 1 “Done”)
	•	From plugin host, ping returns 204 via Kerberos.
	•	Saving a workspace emits one event; portal receives it and returns 204.
	•	No secrets (HMAC/JWT) in plugin code/config.

⸻

If you want, I can draft:
	•	the RestTemplateConfig class (HttpClient5 + SPNEGO + CookieStore + redirects), and
	•	the two Next.js route files (App Router and Pages Router versions)
so you can drop them in and run.