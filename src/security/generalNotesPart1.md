Perfect—your repo uses the Pages Router under src/pages, plus some server/api (tRPC). So we’ll adapt Part 1 (steps 1–5) to your structure. Parts 2 & 3 (plugin + Mongo/idempotency) stay the same.

⸻

Part 1 (Steps 1–5) — Portal endpoints in your repo layout

1) Where to put files

Create these two routes:

src/
└─ pages/
   └─ api/
      └─ events/
         ├─ ping.ts
         └─ workspace-modified.ts

Nothing else in your structure needs to change.

2) Add ping.ts (GET 204 for session priming)

src/pages/api/events/ping.ts

import type { NextApiRequest, NextApiResponse } from 'next';

// Purpose: trigger the Kerberos/Webstax OIDC flow. If we reach here, session is established.
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  console.log('[ping] ok');
  res.status(204).end(); // No Content
}

3) Add workspace-modified.ts (POST JSON, log for Phase-1)

src/pages/api/events/workspace-modified.ts

import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Next.js API routes auto-parse JSON when Content-Type is application/json
  console.log('[workspace-modified]', req.body);

  // Phase-1: just log & return 204. (Phase-2 will validate & write to Mongo.)
  res.status(204).end();
}

CSRF: If your app uses a cookie session + CSRF protection, ensure this route is allowed (common exemption: /api/events/*). If you don’t use CSRF middleware, ignore this.

4) Dev run & local sanity check

Start the portal:

npm run dev   # or: pnpm dev
# likely at http://localhost:3000

Verify:

# 1) GET prime
curl -i http://localhost:3000/api/events/ping

# 2) POST event (local)
curl -i -X POST http://localhost:3000/api/events/workspace-modified \
  -H "Content-Type: application/json" \
  -d '{"eventType":"WORKSPACE_MODIFIED","workspaceId":"123","modifiedAt":"2025-09-03T12:00:00Z","eventId":"11111111-1111-1111-1111-111111111111"}'

Expect 204 responses and the logs in your Next.js console.

5) Commit

Commit those two files. Phase-1 receiver is ready.

⸻

Part 2 (Steps 6–11) — Plugin & Kerberos/SPNEGO (unchanged)

These steps are the same as before:
	•	Use Apache HttpClient 5 under your plugin’s RestTemplate.
	•	One shared CookieStore.
	•	GET /api/events/ping → complete SPNEGO/OIDC → cookies set.
	•	POST /api/events/workspace-modified with JSON.
	•	Emit after save (ideal) or at end of beforeSave (fallback).
	•	JVM flags for Kerberos (JDK≥16):

--add-exports=java.security.jgss/sun.security.jgss=ALL-UNNAMED
--add-exports=java.security.jgss/sun.security.jgss.spi=ALL-UNNAMED
--add-exports=java.security.jgss/sun.security.krb5=ALL-UNNAMED
--add-exports=java.security.jgss/sun.security.krb5.internal=ALL-UNNAMED
--add-exports=java.security.jgss/sun.security.krb5.internal.ccache=ALL-UNNAMED
--add-exports=java.base/sun.security.util=ALL-UNNAMED
-Djavax.security.auth.useSubjectCredsOnly=false


	•	Non-Windows: -Djava.security.krb5.conf=/etc/krb5.conf and ensure a TGT (kinit or keytab).
	•	Deploy plugin via bind-mount → flip releaseLink → release job → train deploy --env prod → restart Structurizr.

If you want the ready-to-paste Java files again (RestTemplateConfig + EventEmitter + payload builder + plugin hook), say the word and I’ll drop them inline with your package names.

⸻

Part 3 (Steps 12–14) — Persistence, idempotency, retries (unchanged)

When you’re ready to store data:
	•	Add a small src/server/api/lib/db.ts (or src/lib/db.ts) Mongo helper.
	•	In workspace-modified.ts, validate with zod, insert into workspace_activity (unique eventId), and upsert workspaces.lastModifiedAt/By.
	•	In the plugin, add exponential backoff retries; never block a user save.

⸻

Quick checklist tied to your repo
	•	Create src/pages/api/events/ping.ts (GET 204).
	•	Create src/pages/api/events/workspace-modified.ts (POST 204, logs body).
	•	Run npm run dev and curl both endpoints.
	•	Implement plugin client (HttpClient5 + CookieStore + SPNEGO).
	•	Emit event from plugin after save.
	•	Kerberos runtime flags + krb5.conf (if not Windows domain).
	•	E2E test: save a workspace → see portal logs.
	•	(Later) wire Mongo write + idempotency + retries.

If you want, I’ll tailor the Mongo helper path to src/server/api (since you already have that folder), and give you a Phase-2 version of workspace-modified.ts that drops straight into your Pages Router.