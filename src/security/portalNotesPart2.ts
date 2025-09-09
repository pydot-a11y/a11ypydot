// Awesome—here are the complete, paste-ready files for the Next.js (Pages Router) implementation with validation + Mongo persistence + idempotency.

// ⸻

// 1) Install deps

// npm i mongodb zod


// ⸻

// 2) Env (add/update your .env)

// # Toggle DB writes (can be false to merge safely without Mongo)
// MONGO_ENABLED=true

// # Connection
// MONGO_URI=mongodb://USER:PASS@HOST:27017
// MONGO_DB_NAME=d_workspaces   # your DB from Compass

// # Optional: proxy-injected user header (keep default if unsure)
// TRUSTED_USER_HEADER=x-authenticated-user

// # (keep your existing keys too, e.g., PORTAL_ENV, PGE_URL, etc.)


// ⸻

// 3) src/server/api/db.ts

import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGO_URI!;
const dbName = process.env.MONGO_DB_NAME || "d_workspaces";

let client: MongoClient | null = null;
let db: Db | null = null;

// Reuse the client in dev to avoid multiple connections on hot reload
export async function getDb(): Promise<Db> {
  if (db) return db;
  if (!uri) throw new Error("MONGO_URI not set");

  if (!client) {
    client = new MongoClient(uri, { maxPoolSize: 10 });
    await client.connect();
  }
  db = client.db(dbName);
  return db!;
}


// ⸻

// 4) src/server/api/validation.ts

import { z } from "zod";

export const WorkspaceModifiedSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.literal("WORKSPACE_MODIFIED"),
  workspaceId: z.union([z.string().min(1), z.number()]).transform(String),
  modifiedAt: z.string().datetime(),      // ISO8601
  modifiedBy: z.string().optional(),
});


// ⸻

// 5) src/pages/api/events/ping.ts

import type { NextApiRequest, NextApiResponse } from "next";

// Purpose: trigger auth/session with Kerberos/OIDC via proxy.
// If this handler runs, the session is established.
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  console.log("[ping] ok");
  res.status(204).end();
}


// ⸻

// 6) src/pages/api/events/workspace-modified.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { WorkspaceModifiedSchema } from "../../../server/api/validation";

const MONGO_ENABLED = process.env.MONGO_ENABLED === "true";
const TRUSTED_USER_HEADER = process.env.TRUSTED_USER_HEADER || "x-authenticated-user";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method Not Allowed" });

  const ct = (req.headers["content-type"] || "").toString();
  if (!ct.includes("application/json")) {
    return res.status(415).json({ message: "Content-Type must be application/json" });
  }

  // If proxy gives us a trusted user header, auto-fill modifiedBy (unless provided)
  const headerUser = (req.headers[TRUSTED_USER_HEADER] as string | undefined)?.trim();
  const candidate = headerUser ? { ...req.body, modifiedBy: req.body?.modifiedBy ?? headerUser } : req.body;

  const parsed = WorkspaceModifiedSchema.safeParse(candidate);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid JSON", errors: parsed.error.issues });
  }
  const ev = parsed.data;

  console.log("[workspace-modified]", ev.eventId, ev.workspaceId, ev.modifiedAt, ev.modifiedBy ?? "-");

  // If DB writes are disabled, just ack (useful for early rollout)
  if (!MONGO_ENABLED) return res.status(204).end();

  try {
    const { getDb } = await import("../../../server/api/db");
    const db = await getDb();

    const activity = db.collection("workspace_activity"); // audit log
    const workspaces = db.collection("workspaces");       // current state

    // Ensure indexes (no-op if already exist)
    await Promise.all([
      activity.createIndex({ eventId: 1 }, { unique: true }),
      activity.createIndex({ workspaceId: 1, modifiedAt: -1 }),
      workspaces.createIndex({ workspaceId: 1 }, { unique: true }),
    ]).catch(() => { /* ignore index races */ });

    // Idempotent insert into activity
    try {
      await activity.insertOne({ ...ev, receivedAt: new Date() });
    } catch (e: any) {
      if (e?.code === 11000) return res.status(204).end(); // duplicate eventId → already processed
      console.error("[workspace-modified] insert error", e);
      return res.status(500).json({ message: "DB insert failed" });
    }

    // Upsert latest modified fields into workspaces (by workspaceId)
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
  } catch (e) {
    console.error("[workspace-modified] persistence error", e);
    return res.status(500).json({ message: "Server error" });
  }
}

// Paths are relative (no TS path aliases needed). If your project root differs, adjust ../../../server/... accordingly.

// ⸻

// 7) (Optional) package.json scripts for quick testing

{
  "scripts": {
    "dev": "next dev -p 4015",
    "test:ping": "curl -i http://localhost:4015/api/events/ping",
    "test:wm": "curl -i -X POST http://localhost:4015/api/events/workspace-modified -H 'Content-Type: application/json' --data-binary '{\"eventId\":\"11111111-1111-1111-1111-111111111111\",\"eventType\":\"WORKSPACE_MODIFIED\",\"workspaceId\":\"123\",\"modifiedAt\":\"2025-09-03T12:00:00Z\"}'"
  }
}


// ⸻

// 8) How to test
// 	1.	Run dev

// npm run dev

// 	2.	Ping (priming)

// npm run test:ping
// # expect: HTTP/1.1 204 No Content

// 	3.	Send an event

// npm run test:wm
// # expect: HTTP/1.1 204 No Content

// 	4.	Verify in Mongo (Compass or mongosh)

// 	•	DB: d_workspaces
// 	•	Collections:
// 	•	workspace_activity should have a doc with your eventId.
// 	•	workspaces should show workspaceId: "123" (string), and lastModifiedAt (and lastModifiedBy if present).
// 	•	Re-run the same eventId → still 204; workspace_activity stays at 1 doc for that id (idempotent).

// ⸻

// If you want the endpoint to only update existing workspaces (no upsert), change { upsert: true } to { upsert: false } in the updateOne call.

// When you’re ready, we can jump back to the plugin build/import issues and wire this up end-to-end.