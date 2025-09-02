
Part 1 — Steps 1–5 (Portal first, prove we can receive)

1) Pre-reqs (quick)
	•	Next.js app (Node 18+).
	•	You don’t implement auth here; Webstax/Kerberos sits in front of the portal.
	•	We’ll just expose two routes and log the payload.

2) Create the routes (pick one router style your app uses)

A) App Router (recommended; put files under /app/api/...)

/app/api/events/ping/route.ts

// App Router – GET 204 to prime Kerberos/OIDC session
export const runtime = 'nodejs';

export async function GET() {
  console.log('[ping] ok');
  return new Response(null, { status: 204 });
}

/app/api/events/workspace-modified/route.ts

// App Router – POST JSON, log it, return 204
export const runtime = 'nodejs';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  console.log('[workspace-modified]', body);
  return new Response(null, { status: 204 });
}

B) Pages Router (if your app still uses /pages/api)

/pages/api/events/ping.ts

import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  console.log('[ping] ok');
  res.status(204).end();
}

/pages/api/events/workspace-modified.ts

import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });
  console.log('[workspace-modified]', req.body);
  res.status(204).end();
}

CSRF note: if your portal uses cookie sessions + CSRF protection, make sure /api/events/workspace-modified is exempted or configured appropriately, otherwise POSTs from the plugin might 403.

3) Run & sanity check

pnpm dev  # or npm run dev
# App should be listening (e.g., http://localhost:3000)

4) Verify with curl (no Kerberos yet, just local)

curl -i http://localhost:3000/api/events/ping
curl -i -X POST http://localhost:3000/api/events/workspace-modified \
  -H "Content-Type: application/json" \
  -d '{"eventType":"WORKSPACE_MODIFIED","workspaceId":"123","modifiedAt":"2025-09-02T12:00:00Z","eventId":"11111111-1111-1111-1111-111111111111"}'
# Expect 204s and see logs in the Next.js console

5) Commit

Commit these two routes. Portal is ready to receive.

⸻

Part 2 — Steps 6–11 (Plugin → Kerberos/SPNEGO client → emit event → deploy)

We’ll use Apache HttpClient 5 under Spring RestTemplate (or plain if you don’t use Spring). We’ll prime the session with a GET (SPNEGO/OIDC handshake, cookies set), then POST the event reusing the same cookie store.

Dependencies (Gradle)

dependencies {
  implementation 'org.springframework:spring-web:6.1.10'                 // if you use RestTemplate
  implementation 'org.apache.httpcomponents.client5:httpclient5:5.3.1'    // HttpClient5
  // plus whatever internal msjava/jpe-kerberos you were told to use
}

6) RestTemplate with SPNEGO + redirects + cookie store

com/ms/szr/plugin/http/RestTemplateConfig.java

package com.ms.szr.plugin.http;

import org.apache.hc.client5.http.auth.AuthSchemeFactory;
import org.apache.hc.client5.http.auth.StandardAuthScheme;
import org.apache.hc.client5.http.impl.DefaultRedirectStrategy;
import org.apache.hc.client5.http.impl.auth.BasicSchemeFactory;
import org.apache.hc.client5.http.impl.auth.SPNegoSchemeFactory;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.cookie.BasicCookieStore;
import org.apache.hc.client5.http.cookie.CookieStore;
import org.apache.hc.core5.http.config.Lookup;
import org.apache.hc.core5.http.config.RegistryBuilder;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

public final class RestTemplateConfig {

  private final CookieStore cookieStore = new BasicCookieStore();
  private final RestTemplate restTemplate;

  public RestTemplateConfig() {
    // Install your internal Kerberos provider if required (per your screenshots)
    try {
      Class<?> prov = Class.forName("com.ms.security.MSKerberosJgssProvider"); // example
      prov.getMethod("install").invoke(null);
      Class<?> cfg = Class.forName("com.ms.security.MSKerberosConfiguration");
      cfg.getMethod("setClientConfiguration").invoke(null);
    } catch (Throwable ignored) {
      // If not present in dev, continue; on corp runtime it should be available
    }

    Lookup<AuthSchemeFactory> authSchemes = RegistryBuilder.<AuthSchemeFactory>create()
      .register(StandardAuthScheme.SPNEGO, new SPNegoSchemeFactory(true)) // true: strip port
      .register(StandardAuthScheme.BASIC, new BasicSchemeFactory())
      .build();

    CloseableHttpClient httpClient = HttpClients.custom()
      .setDefaultAuthSchemeRegistry(authSchemes)
      .setRedirectStrategy(new DefaultRedirectStrategy())   // follow 3xx
      .setDefaultCookieStore(cookieStore)                   // persist session cookies
      .build();

    var requestFactory = new HttpComponentsClientHttpRequestFactory(httpClient);
    requestFactory.setConnectTimeout(10_000);
    requestFactory.setReadTimeout(20_000);

    this.restTemplate = new RestTemplate(requestFactory);
  }

  public RestTemplate restTemplate() { return restTemplate; }
  public CookieStore cookieStore() { return cookieStore; }
}

SPNEGO specifics vary by environment. The above registers the Negotiate scheme; your internal provider (from the screenshots) enables JGSS/Kerberos usage.

7) Event payload & emitter (GET prime → POST event)

com/ms/szr/plugin/emit/EventPayloads.java

package com.ms.szr.plugin.emit;

import java.time.Instant;
import java.util.UUID;

public final class EventPayloads {
  public static String workspaceModifiedJson(long workspaceId) {
    // Build minimal JSON; you can switch to Jackson if preferred
    return """
      {"eventId":"%s",
       "eventType":"WORKSPACE_MODIFIED",
       "workspaceId":"%d",
       "modifiedAt":"%s"}""".formatted(
         UUID.randomUUID(), workspaceId, Instant.now().toString()
    );
  }
}

com/ms/szr/plugin/emit/EventEmitter.java

package com.ms.szr.plugin.emit;

import com.ms.szr.plugin.http.RestTemplateConfig;
import org.springframework.http.*;
import org.springframework.web.client.RestTemplate;

public final class EventEmitter {
  private final RestTemplate rest;
  private final String baseUrl;

  public EventEmitter(String baseUrl) {
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length()-1) : baseUrl;
    this.rest = new RestTemplateConfig().restTemplate(); // shares cookie store inside client
  }

  private void primeSession() {
    try {
      var url = baseUrl + "/api/events/ping";
      rest.exchange(url, HttpMethod.GET, null, Void.class);
    } catch (Exception e) {
      throw new RuntimeException("Kerberos/OIDC priming failed: " + e.getMessage(), e);
    }
  }

  public void postWorkspaceModified(long workspaceId) {
    primeSession(); // complete SPNEGO/OIDC and set cookies

    var url = baseUrl + "/api/events/workspace-modified";
    var json = EventPayloads.workspaceModifiedJson(workspaceId);
    var headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    var entity = new HttpEntity<>(json, headers);

    ResponseEntity<Void> res = rest.exchange(url, HttpMethod.POST, entity, Void.class);
    if (!res.getStatusCode().is2xxSuccessful()) {
      throw new RuntimeException("POST failed: " + res.getStatusCode());
    }
  }
}

If you’re not using Spring, you can use CloseableHttpClient directly—same idea: one client with a CookieStore, GET then POST.

8) Hook into the plugin (after save preferred; else end of beforeSave)

Assuming your listener looks like this:

com/ms/szr/plugin/WorkspacePlugin.java

package com.ms.szr.plugin;

import com.structurizr.Workspace;
import com.structurizr.io.WorkspaceUtils;
import com.structurizr.plugin.WorkspaceEvent;
import com.structurizr.plugin.WorkspaceEventListener;
import com.structurizr.configuration.User;
import com.ms.szr.plugin.emit.EventEmitter;

public class WorkspacePlugin implements WorkspaceEventListener {

  private static final String PORTAL_BASE =
      System.getenv().getOrDefault("SZR_PORTAL_BASE", "https://szr.portal.internal");

  private final EventEmitter emitter = new EventEmitter(PORTAL_BASE);

  @Override
  public void beforeSave(WorkspaceEvent event) {
    try {
      // your existing logic that preserves users:
      var currentProperties = event.getWorkspaceProperties();
      var currentUsers = currentProperties.getUsers();
      if (currentUsers.isEmpty()) return;

      String newJson = event.getJson();
      Workspace newWorkspace = WorkspaceUtils.fromJson(newJson);
      newWorkspace.getConfiguration().clearUsers();
      for (User u : currentUsers) newWorkspace.getConfiguration().addUser(u);
      newJson = WorkspaceUtils.toJson(newWorkspace, false);
      event.setJson(newJson);

      // Fallback emit if you don't have afterSave:
      long workspaceId = resolveWorkspaceId(event, newWorkspace);
      emitter.postWorkspaceModified(workspaceId);

    } catch (Exception e) {
      e.printStackTrace();
    }
  }

  // If your API supports afterSave, move the emit there instead:
  // @Override
  // public void afterSave(WorkspaceEvent event) { ... emitter.postWorkspaceModified(...); }

  private long resolveWorkspaceId(WorkspaceEvent event, Workspace ws) {
    try {
      // Prefer a direct getter on event if it exists:
      var m = event.getClass().getMethod("getWorkspaceId");
      Object v = m.invoke(event);
      if (v instanceof Number n) return n.longValue();
    } catch (Exception ignore) { /* fall through */ }

    try {
      // else from workspace:
      var getId = ws.getClass().getMethod("getId");
      Object id = getId.invoke(ws);
      if (id instanceof Number n) return n.longValue();
    } catch (Exception ignore) { /* try alternative */ }

    try {
      var getWid = ws.getClass().getMethod("getWorkspaceId");
      Object id = getWid.invoke(ws);
      if (id instanceof Number n) return n.longValue();
    } catch (Exception ignore) { /* out of options */ }

    throw new IllegalStateException("Unable to resolve workspaceId");
  }
}

If afterSave exists in your plugin interface, move the emitter.postWorkspaceModified(...) call there (best: only emit if save truly succeeded).

9) Kerberos runtime (JVM flags + config)

Add (JDK ≥ 16):

--add-exports=java.security.jgss/sun.security.jgss=ALL-UNNAMED
--add-exports=java.security.jgss/sun.security.jgss.spi=ALL-UNNAMED
--add-exports=java.security.jgss/sun.security.krb5=ALL-UNNAMED
--add-exports=java.security.jgss/sun.security.krb5.internal=ALL-UNNAMED
--add-exports=java.security.jgss/sun.security.krb5.internal.ccache=ALL-UNNAMED
--add-exports=java.base/sun.security.util=ALL-UNNAMED
-Djavax.security.auth.useSubjectCredsOnly=false

	•	Non-Windows: ensure a TGT is available (kinit) and set -Djava.security.krb5.conf=/etc/krb5.conf.
	•	Containers: mount ticket cache/keytab and pass the flags in your run script.

10) Smoke tests

From a Kerberized host (Windows domain or after kinit):

curl --negotiate -u : -L https://<portal>/api/events/ping
# Expect 204 (proves SPNEGO→OIDC→session works)

Run Structurizr & the plugin, save a workspace → check portal logs for [workspace-modified] ... and a 204 response to the plugin.

11) Deploy (confirmed path)
	•	Update plugin jar, flip releaseLink for msde/szr-workspace-plugin.
	•	Run your release job → train deploy --env prod.
	•	Restart Structurizr to pick up the bind-mounted plugin.

⸻

Part 3 — Steps 12–14 (Persistence, idempotency, retries)

12) Persist to Mongo (portal)

/lib/db.ts

import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI!;
let client: MongoClient;
export async function getDb() {
  client ||= await new MongoClient(uri).connect();
  return client.db();
}

Update /app/api/events/workspace-modified/route.ts (App Router)

import { getDb } from '@/lib/db';
import { z } from 'zod';

export const runtime = 'nodejs';

const Schema = z.object({
  eventId: z.string().uuid(),
  eventType: z.literal('WORKSPACE_MODIFIED'),
  workspaceId: z.string(),
  modifiedAt: z.string().datetime()
});

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Bad payload', details: parsed.error.issues }, { status: 400 });

  const ev = parsed.data;
  const db = await getDb();

  // idempotency (unique eventId)
  await db.collection('workspace_activity').createIndex({ eventId: 1 }, { unique: true }).catch(()=>{});
  await db.collection('workspace_activity').createIndex({ workspaceId: 1, modifiedAt: -1 }).catch(()=>{});
  await db.collection('workspaces').createIndex({ workspaceId: 1 }, { unique: true }).catch(()=>{});

  // append-only
  try {
    await db.collection('workspace_activity').insertOne({ ...ev, receivedAt: new Date() });
  } catch (e: any) {
    if (e?.code === 11000) {
      // duplicate eventId → already processed
      return new Response(null, { status: 204 });
    }
    throw e;
  }

  // fast lookup
  await db.collection('workspaces').updateOne(
    { workspaceId: ev.workspaceId },
    {
      $set: {
        workspaceId: ev.workspaceId,
        lastModifiedAt: new Date(ev.modifiedAt),
        // lastModifiedBy: add later if you pass user identity
      }
    },
    { upsert: true }
  );

  return new Response(null, { status: 204 });
}

13) Plugin retries (don’t block user saves)

com/ms/szr/plugin/emit/EventEmitter.java (retry wrapper)

public void postWorkspaceModified(long workspaceId) {
  int attempts = 0;
  long backoff = 500; // ms
  while (true) {
    try {
      primeSession();
      var url = baseUrl + "/api/events/workspace-modified";
      var json = EventPayloads.workspaceModifiedJson(workspaceId);
      var headers = new HttpHeaders(); headers.setContentType(MediaType.APPLICATION_JSON);
      var entity = new HttpEntity<>(json, headers);
      var res = rest.exchange(url, HttpMethod.POST, entity, Void.class);
      if (!res.getStatusCode().is2xxSuccessful()) throw new RuntimeException("HTTP " + res.getStatusCode());
      return; // success
    } catch (Exception e) {
      attempts++;
      if (attempts >= 3) {
        System.err.println("[WARN] emit failed after retries: " + e.getMessage());
        return; // do NOT block the save; log & drop
      }
      try { Thread.sleep(backoff); } catch (InterruptedException ignored) {}
      backoff *= 2; // exponential
    }
  }
}

14) Acceptance checklist
	•	ping returns 204 via Kerberos from curl and plugin host.
	•	Saving a workspace triggers one POST; portal logs payload and returns 204.
	•	With Mongo enabled: records appear in workspace_activity, and workspaces.lastModifiedAt is up to date.
	•	Duplicated eventId does not duplicate rows.
	•	Transient failures are retried; the user save is never blocked by analytics.

⸻

Notes & tips
	•	Prefer afterSave if your plugin interface exposes it. If not, emitting at the end of beforeSave is OK for the first increment.
	•	Cookies & redirects are the critical duo: use one client with a shared CookieStore. Prime with GET to avoid POST → GET downgrades during auth redirects.
	•	Kerberos config: on Windows domain it’s typically automatic; on Linux/mac or in containers, you’ll need krb5.conf and a TGT (kinit or keytab).
	•	If SPNEGO is blocked in a target environment, your fallback is Webstax OIDC client-credentials (JWT). The portal route doesn’t change.

You can copy/paste these pieces and wire them exactly as shown. If you hit a snag at any step, tell me where it breaks (error text/log) and I’ll adjust the code to your environment.