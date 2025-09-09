// Gotcha—if you only get one PR for the portal, make it a complete, safe, self-contained change that the plugin can use immediately. Here’s the single-PR plan + paste-ready code.

// ⸻

// What goes in the single PR
// 	1.	Two endpoints (Pages Router):
// 	•	GET /api/events/ping → 204
// 	•	POST /api/events/workspace-modified → validate body, log, and (optionally) write to Mongo if enabled.
// 	2.	Strict validation (zod) + clear 4xx errors.
// 	3.	Idempotent persistence (only if MONGO_ENABLED=true)
// 	•	insert into workspace_activity (uniq eventId)
// 	•	upsert workspaces.lastModifiedAt/By
// 	4.	Auth header pass-through check (optional): read a trusted header like X-Authenticated-User if present.
// 	5.	Config via env (no hardcoding): MONGO_ENABLED, MONGODB_URI, MONGODB_DB, TRUSTED_USER_HEADER.
// 	6.	Minimal docs in README + curl samples.

// No breaking changes to the rest of the app.

// ⸻

// Files to add/change (your structure)

// src/pages/api/events/ping.ts
// src/pages/api/events/workspace-modified.ts
// src/server/api/db.ts           (new)
// src/server/api/validation.ts   (new)
// README.md                      (short section)


// ⸻

// 1) src/pages/api/events/ping.ts

import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  console.log('[ping] ok');
  res.status(204).end();
}

// 2) src/server/api/db.ts

import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB || 'szr';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDb(): Promise<Db> {
  if (db) return db;
  if (!uri) throw new Error('MONGODB_URI not set');
  client = new MongoClient(uri, { maxPoolSize: 10 });
  await client.connect();
  db = client.db(dbName);
  return db!;
}

// 3) src/server/api/validation.ts

import { z } from 'zod';

export const WorkspaceModifiedSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.literal('WORKSPACE_MODIFIED'),
  workspaceId: z.string().min(1),
  modifiedAt: z.string().datetime(),   // ISO8601
  modifiedBy: z.string().optional()
});

4) src/pages/api/events/workspace-modified.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { WorkspaceModifiedSchema } from '@/server/api/validation';

const MONGO_ENABLED = process.env.MONGO_ENABLED === 'true';
const TRUSTED_USER_HEADER = process.env.TRUSTED_USER_HEADER || 'x-authenticated-user';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const ct = req.headers['content-type'] || '';
  if (!ct.toString().includes('application/json')) {
    return res.status(415).json({ message: 'Content-Type must be application/json' });
  }

  // Optionally capture user identity if the proxy adds it
  const headerUser = (req.headers[TRUSTED_USER_HEADER] as string | undefined)?.trim();
  const parsed = WorkspaceModifiedSchema.safeParse(
    headerUser ? { ...req.body, modifiedBy: req.body?.modifiedBy ?? headerUser } : req.body
  );
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid JSON', errors: parsed.error.issues });
  }
  const ev = parsed.data;
  console.log('[workspace-modified]', ev.eventId, ev.workspaceId, ev.modifiedAt, ev.modifiedBy ?? '-');

  if (!MONGO_ENABLED) {
    return res.status(204).end(); // Phase-1 (no DB)
  }

  // Phase-2: persistence (idempotent)
  try {
    const { getDb } = await import('@/server/api/db');
    const db = await getDb();
    const activity = db.collection('workspace_activity');
    const workspaces = db.collection('workspaces');

    await Promise.all([
      activity.createIndex({ eventId: 1 }, { unique: true }),
      activity.createIndex({ workspaceId: 1, modifiedAt: -1 }),
      workspaces.createIndex({ workspaceId: 1 }, { unique: true })
    ]).catch(() => {});

    try {
      await activity.insertOne({ ...ev, receivedAt: new Date() });
    } catch (e: any) {
      if (e?.code === 11000) return res.status(204).end(); // duplicate eventId → idempotent OK
      console.error('[workspace-modified] insert error', e);
      return res.status(500).json({ message: 'DB insert failed' });
    }

    await workspaces.updateOne(
      { workspaceId: ev.workspaceId },
      {
        $set: {
          workspaceId: ev.workspaceId,
          lastModifiedAt: new Date(ev.modifiedAt),
          ...(ev.modifiedBy ? { lastModifiedBy: ev.modifiedBy } : {})
        }
      },
      { upsert: true }
    );

    return res.status(204).end();
  } catch (e) {
    console.error('[workspace-modified] persistence error', e);
    return res.status(500).json({ message: 'Server error' });
  }
}


⸻

// 5) .env entries (document in README)

// # Required only if you want DB writes now
// MONGO_ENABLED=false
// MONGODB_URI=mongodb://user:pass@host:27017/szr?authSource=admin
// MONGODB_DB=szr

// # Optional: what header the proxy sets for user identity
// TRUSTED_USER_HEADER=x-authenticated-user


// ⸻

// 6) README snippet (for the PR)

// ### Workspace modification ingest

- `GET /api/events/ping` → 204 (auth/session priming)
- `POST /api/events/workspace-modified` → 204 on success

Request body (JSON):
{
  "eventId": "<uuid>",
  "eventType": "WORKSPACE_MODIFIED",
  "workspaceId": "<string>",
  "modifiedAt": "<ISO8601>",
  "modifiedBy": "<string, optional>"
}

Env:
- MONGO_ENABLED (default false). If true, writes to Mongo with idempotency.
- MONGODB_URI, MONGODB_DB when MONGO_ENABLED=true.
- TRUSTED_USER_HEADER (default x-authenticated-user) to auto-fill `modifiedBy` if present.

Curl test:
curl -i http://localhost:4015/api/events/ping
curl -i -X POST http://localhost:4015/api/events/workspace-modified \
  -H 'Content-Type: application/json' \
  --data-binary '{"eventId":"11111111-1111-1111-1111-111111111111","eventType":"WORKSPACE_MODIFIED","workspaceId":"123","modifiedAt":"2025-09-03T12:00:00Z"}'


⸻

Why this fits a single PR
	•	Gives the plugin a stable, validated endpoint now.
	•	DB write is feature-flagged (MONGO_ENABLED) so you can merge even if infra isn’t ready.
	•	Keeps security posture (trusted header) without coupling to a specific proxy.
	•	Clear logs & error messages for integration.

⸻

Parallel work on the plugin

While the PR is reviewed, fix plugin imports/build and run the EmitSmokeTest with:

SZR_PORTAL_BASE=http://localhost:4015

You’ll see the portal log ping and workspace-modified.

