
// src/server/api/db.ts
import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGO_URI!;
const dbName = process.env.MONGO_DB_NAME || "d_workspaces";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDb(): Promise<Db> {
  if (db) return db;
  if (!uri) throw new Error("MONGO_URI not set");

  try {
    // Important: the presence of @mongodb-js/kerberos enables GSSAPI
    client = new MongoClient(uri, {
      maxPoolSize: 10,
      // timeouts to avoid hanging forever when debugging connectivity
      connectTimeoutMS: 12_000,
      serverSelectionTimeoutMS: 12_000,
    });
    await client.connect();
    db = client.db(dbName);
    return db!;
  } catch (e: any) {
    // Log rich detail once; route handlers will surface 500
    console.error("[mongo] connect failed:", e?.message || e);
    throw e;
  }
}

// src/pages/api/events/workspace-modified.ts — keep your current logic; just enhance the last catch:
} catch (e: any) {
    console.error("[workspace-modified] persistence error", e?.message || e);
    return res.status(500).json({ message: "Server error", error: String(e?.message || e) });
  }



//   src/pages/api/debug/db.ts
  import type { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "../../../server/api/db";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await getDb();
    // cheap operation
    const ok = await db.command({ ping: 1 });
    return res.status(200).json({ ok, db: db.databaseName });
  } catch (e: any) {
    console.error("[debug/db] error:", e?.message || e);
    return res.status(500).json({ error: String(e?.message || e) });
  }
}


// curl -s http://localhost:4015/api/debug/db | jq

// npm run dev

// # Priming (should be 204)
// curl -i http://localhost:4015/api/events/ping

// # DB ping (should be 200 with ok:1)
// curl -i http://localhost:4015/api/debug/db

// # Event write (should be 204)
// curl -i -X POST http://localhost:4015/api/events/workspace-modified \
//   -H "Content-Type: application/json" \
//   --data-binary '{"eventId":"11111111-1111-1111-1111-111111111111","eventType":"WORKSPACE_MODIFIED","workspaceId":"123","modifiedAt":"2025-09-03T12:00:00Z"}'