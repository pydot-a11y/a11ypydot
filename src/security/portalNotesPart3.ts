
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


import type { NextApiRequest, NextApiResponse } from "next";

// Prove this file is actually loaded:
console.log("[debug/db] file loaded");

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    // If mongodb isn’t installed, this throws and we catch it.
    const { MongoClient } = await import("mongodb");
    const uri = process.env.MONGO_URI || "";
    const dbName = process.env.MONGO_DB_NAME || "d_workspaces";

    console.log("[debug/db] connecting", { uriLen: uri.length, dbName });

    const client = new MongoClient(uri, {
      maxPoolSize: 5,
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
    });

    await client.connect();
    const db = client.db(dbName);
    const ok = await db.command({ ping: 1 });

    res.status(200).json({ ok, db: dbName });
  } catch (e: any) {
    const msg = e?.message || String(e);
    console.error("[debug/db] error:", msg);
    // FORCE JSON so curl shows it (no more plain text).
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.status(500).end(JSON.stringify({ error: msg }));
  }
}

//At the very top of src/pages/api/debug/db.ts, before imports that might use fetch:
// Force NO proxy for this route (and Mongo)
process.env.HTTP_PROXY = "";
process.env.HTTPS_PROXY = "";
process.env.NO_PROXY = "localhost,127.0.0.1,.ms.com";


// If your app uses undici’s global proxy (via setGlobalDispatcher) or initializes https-proxy-agent globally, add this too inside the handler (or once in this file) to reset undici just for this route:

// Optional: reset undici global dispatcher to default (no proxy)
import { setGlobalDispatcher, Agent } from "undici";
setGlobalDispatcher(new Agent());


MONGO_ENABLED=true
MONGO_DB_NAME=d_workspaces
MONGO_URI=mongodb://<principal-encoded>@<host>:27000/?authMechanism=GSSAPI&authSource=%24external&authMechanismProperties=SERVICE_NAME:<your_service>&tls=true&tlsInsecure=true