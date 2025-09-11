Short answer: Yes — this is PR-ready with 3 tiny polish items. Ship it, and note the Mongo/Kerberos bit as a known, feature-flagged follow-up.

✅ What looks good
	•	ping.ts returns 204 (good for auth priming).
	•	workspace-modified.ts:
	•	Strict method/content-type checks.
	•	Zod validation ✅
	•	TRUSTED_USER_HEADER support ✅
	•	Feature flag MONGO_ENABLED gate ✅
	•	Idempotent insert by eventId + upsert of lastModified* ✅
	•	debug/db.ts returns JSON errors (great for infra).
	•	Clean logging and HTTP codes.

🧼 3 tiny tweaks before you push
	1.	.env.example (in repo)

# Feature flag (leave off by default)
MONGO_ENABLED=false

# Mongo (fill locally; keep placeholders in repo)
MONGO_URI=mongodb://<USERNAME>@<HOST>:27000/?authMechanism=GSSAPI&authSource=%24external&authMechanismProperties=SERVICE_NAME:<SERVICE>&tls=true
MONGO_DB_NAME=d_workspaces
TRUSTED_USER_HEADER=x-authenticated-user


	2.	package.json scripts (add test helpers)

{
  "scripts": {
    "dev": "next dev -p 4015",
    "test:ping": "curl -i http://localhost:4015/api/events/ping",
    "test:wm": "curl -i -X POST http://localhost:4015/api/events/workspace-modified -H 'Content-Type: application/json' --data '{\"eventId\":\"11111111-1111-1111-1111-111111111111\",\"eventType\":\"WORKSPACE_MODIFIED\",\"workspaceId\":\"123\",\"modifiedAt\":\"2025-09-03T12:00:00Z\"}'",
    "probe:db": "curl -s http://localhost:4015/api/debug/db"
  }
}


// 	3.	README section (brief)
// 	•	How to run locally.
// 	•	Test commands above.
// 	•	Note: DB writes are disabled by default; flip MONGO_ENABLED=true once Kerberos is configured.

// 📝 Suggested PR title & description

// Title: Structurizr Portal — add “workspace-modified” API (+ping), schema validation, and feature-flagged persistence

// Description:
// 	•	Adds POST /api/events/workspace-modified with Zod validation and trusted header support.
// 	•	Adds GET /api/events/ping for auth/session priming.
// 	•	Adds GET /api/debug/db for Mongo diagnostics (returns JSON error details).
// 	•	Implements idempotent activity log (workspace_activity) and workspaces upsert, gated by MONGO_ENABLED.
// 	•	Provides .env.example, helper curl scripts, and README instructions.
// 	•	Open item: Mongo Kerberos connectivity in DEV. See “Infra help” below.

// Infra help requested (DEV):
// 	1.	Confirm the Compass Kerberos URI we should use (GSSAPI, $external, SERVICE_NAME, TLS).
// 	2.	Clarify SSPI vs keytab expectation for the Node process.
// 	3.	Guidance on proxy/NO_PROXY for the Mongo host to avoid ECONNREFUSED 127.0.0.1:*.
// 	4.	Is @mongodb-js/kerberos the supported provider?

// 👀 Inline comments you can leave
// 	•	In debug/db.ts (top): “Explicitly null out HTTP(S)_PROXY and set NO_PROXY to avoid routing DB over corp proxy.”
// 	•	In workspace-modified.ts: “Persistence behind MONGO_ENABLED until Kerberos is confirmed in DEV.”
// 	•	On the indexes: “eventId unique to ensure idempotency; workspaceId unique in workspaces to upsert latest state.”

// 🧪 What reviewers can test now (no DB)

// npm run dev
// npm run test:ping      # 204
// npm run test:wm        # 204 (when MONGO_ENABLED=false)
// npm run probe:db       # JSON error until Kerberos is configured

// 🚦Go/No-go
// 	•	With these small polish items, Go. Open the PR and tag:
// 	•	Structurizr portal owners
// 	•	Platform/SRE for Kerberos
// 	•	Security (for header & proxy note)

// If you want, I can draft the full PR body text verbatim from the bullets above; just say the word.



import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient } from 'mongodb';

process.env.HTTP_PROXY = '';
process.env.HTTPS_PROXY = '';
process.env.NO_PROXY = 'localhost,127.0.0.1,.ms.com';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('content-type', 'application/json; charset=utf-8');

  try {
    const uri = process.env.MONGO_URI;
    const dbName = process.env.MONGO_DB_NAME || 'd_workspaces';
    if (!uri) {
      res.status(500).end(JSON.stringify({ error: 'MONGO_URI not set' }));
      return;
    }

    const client = new MongoClient(uri, {
      maxPoolSize: 2,
      connectTimeoutMS: 12_000,
      serverSelectionTimeoutMS: 12_000,
    });

    await client.connect();
    // ok is a plain object (not any) returned by the driver
    const ok = await client.db(dbName).command({ ping: 1 });
    await client.close();

    res.status(200).end(JSON.stringify({ ok, db: dbName }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).end(JSON.stringify({ error: msg }));
  }
}



import type { NextApiRequest, NextApiResponse } from 'next';
import type { MongoServerError } from 'mongodb';
import { WorkspaceModifiedSchema, type WorkspaceModified } from '../validation';
import { getDb } from '../db';

const MONGO_ENABLED = process.env.MONGO_ENABLED === 'true';
const TRUSTED_USER_HEADER = (process.env.TRUSTED_USER_HEADER || 'x-authenticated-user').toLowerCase();

function firstHeaderValue(h: unknown): string | undefined {
  if (typeof h === 'string') return h;
  if (Array.isArray(h) && typeof h[0] === 'string') return h[0];
  return undefined;
}

function isMongoServerError(e: unknown): e is MongoServerError {
  return typeof e === 'object' && e !== null && 'code' in e;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const ct = String(req.headers['content-type'] || '');
  if (!ct.includes('application/json')) return res.status(415).json({ message: 'Content-Type must be application/json' });

  // Safely materialize a mutable object for validation (no 'any')
  const bodyUnknown: unknown = req.body;
  const candidate: Record<string, unknown> =
    bodyUnknown && typeof bodyUnknown === 'object'
      ? (bodyUnknown as Record<string, unknown>)
      : {};

  // Auto-fill modifiedBy from trusted header if not provided
  const headerUser = firstHeaderValue(req.headers[TRUSTED_USER_HEADER]);
  if (headerUser !== undefined && candidate.modifiedBy === undefined) {
    candidate.modifiedBy = headerUser;
  }

  const parsed = WorkspaceModifiedSchema.safeParse(candidate);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid JSON', errors: parsed.error.issues });
  }

  const ev: WorkspaceModified = parsed.data;

  if (!MONGO_ENABLED) return res.status(204).end();

  try {
    const db = await getDb();
    const activity = db.collection('workspace_activity');
    const workspaces = db.collection('workspaces');

    // Create indexes (ignore races)
    try {
      await activity.createIndex({ eventId: 1 }, { unique: true });
    } catch {
      /* no-op */
    }
    try {
      await workspaces.createIndex({ workspaceId: 1 }, { unique: true });
    } catch {
      /* no-op */
    }

    // Idempotent insert into activity
    try {
      await activity.insertOne({ ...ev, receivedAt: new Date() });
    } catch (e: unknown) {
      if (isMongoServerError(e) && e.code === 11000) {
        // duplicate eventId -> already processed
        return res.status(204).end();
      }
      return res.status(500).json({ message: 'DB insert failed' });
    }

    // Upsert latest modified info
    await workspaces.updateOne(
      { workspaceId: ev.workspaceId },
      {
        $set: {
          workspaceId: ev.workspaceId,
          lastModifiedAt: new Date(ev.modifiedAt),
          ...(ev.modifiedBy ? { lastModifiedBy: ev.modifiedBy } : {}),
        },
      },
      { upsert: true }
    );

    return res.status(204).end();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ message: 'Server error', error: msg });
  }
}