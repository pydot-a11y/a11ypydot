Totally fine—let’s knock out Part 2 (plugin side) so you’re unblocked. I’ll give you paste-ready code + exact steps. You can wire this now; when Part 1 is sorted, it’ll “just work”.

⸻

0) What we’re building (quick)
	•	A Kerberos/SPNEGO-capable RestTemplate (Apache HttpClient 5, shared CookieStore, redirects).
	•	An EventEmitter that does GET /api/events/ping (prime) → POST /api/events/workspace-modified (send).
	•	A hook in your plugin (afterSave preferred; else at the end of beforeSave).
	•	Minimal retry so user saves aren’t blocked.
	•	Runtime flags so Kerberos works on your JDK.

⸻

1) Gradle deps

dependencies {
  implementation 'org.springframework:spring-web:6.1.10'
  implementation 'org.apache.httpcomponents.client5:httpclient5:5.3.1'
  // If your environment uses an internal Kerberos provider, ensure it’s on the classpath too
  // implementation 'com.msjava:jpe-kerberos:<<version>>'   // example; use your real coord
}


⸻

2) Rest client (SPNEGO + redirects + cookie store)

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
    // If your corp provides a Kerberos JGSS provider, install it (safe if absent).
    try {
      Class.forName("com.ms.security.MSKerberosJgssProvider")
           .getMethod("install").invoke(null);
      Class.forName("com.ms.security.MSKerberosConfiguration")
           .getMethod("setClientConfiguration").invoke(null);
    } catch (Throwable ignored) {}

    Lookup<AuthSchemeFactory> authSchemes = RegistryBuilder.<AuthSchemeFactory>create()
      .register(StandardAuthScheme.SPNEGO, new SPNegoSchemeFactory(true)) // 'true' strips host port
      .register(StandardAuthScheme.BASIC, new BasicSchemeFactory())
      .build();

    CloseableHttpClient http = HttpClients.custom()
      .setDefaultAuthSchemeRegistry(authSchemes)
      .setRedirectStrategy(new DefaultRedirectStrategy()) // follow 3xx
      .setDefaultCookieStore(cookieStore)                 // persist session cookie
      .build();

    HttpComponentsClientHttpRequestFactory rf = new HttpComponentsClientHttpRequestFactory(http);
    rf.setConnectTimeout(10_000);
    rf.setReadTimeout(20_000);

    this.restTemplate = new RestTemplate(rf);
  }

  public RestTemplate rest() { return restTemplate; }
  public CookieStore cookies() { return cookieStore; }
}


⸻

3) Payload builder

com/ms/szr/plugin/emit/EventPayloads.java

package com.ms.szr.plugin.emit;

import java.time.Instant;
import java.util.UUID;

public final class EventPayloads {
  public static String workspaceModifiedJson(String workspaceId) {
    return """
      {"eventId":"%s",
       "eventType":"WORKSPACE_MODIFIED",
       "workspaceId":"%s",
       "modifiedAt":"%s"}"""
      .formatted(UUID.randomUUID(), workspaceId, Instant.now().toString());
  }
}


⸻

4) Event emitter (GET-prime → POST, with retries)

com/ms/szr/plugin/emit/EventEmitter.java

package com.ms.szr.plugin.emit;

import com.ms.szr.plugin.http.RestTemplateConfig;
import org.springframework.http.*;
import org.springframework.web.client.RestTemplate;

public final class EventEmitter {
  private final RestTemplate rest;
  private final String base;

  public EventEmitter(String baseUrl) {
    this.base = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length()-1) : baseUrl;
    this.rest = new RestTemplateConfig().rest();
  }

  private void prime() {
    rest.exchange(base + "/api/events/ping", HttpMethod.GET, null, Void.class);
  }

  public void emitWorkspaceModified(String workspaceId) {
    int tries = 0; long backoff = 400;
    while (true) {
      try {
        prime();
        String url = base + "/api/events/workspace-modified";
        String json = EventPayloads.workspaceModifiedJson(workspaceId);
        HttpHeaders h = new HttpHeaders(); h.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> req = new HttpEntity<>(json, h);
        ResponseEntity<Void> res = rest.exchange(url, HttpMethod.POST, req, Void.class);
        if (!res.getStatusCode().is2xxSuccessful())
          throw new RuntimeException("HTTP " + res.getStatusCode());
        return; // success
      } catch (Exception e) {
        tries++;
        if (tries >= 3) {
          System.err.println("[SZR plugin] WARN: failed to emit event after retries: " + e.getMessage());
          return; // do not block the save
        }
        try { Thread.sleep(backoff); } catch (InterruptedException ignored) {}
        backoff *= 2;
      }
    }
  }
}


⸻

5) Hook it into your plugin

com/ms/szr/plugin/WorkspacePlugin.java (adapt to your package/interface)

package com.ms.szr.plugin;

import com.structurizr.Workspace;
import com.structurizr.io.WorkspaceUtils;
import com.structurizr.plugin.WorkspaceEvent;
import com.structurizr.plugin.WorkspaceEventListener;
import com.ms.szr.plugin.emit.EventEmitter;

public class WorkspacePlugin implements WorkspaceEventListener {

  private static final String PORTAL_BASE =
      System.getenv().getOrDefault("SZR_PORTAL_BASE", "https://szr.portal.internal");

  private final EventEmitter emitter = new EventEmitter(PORTAL_BASE);

  @Override
  public void beforeSave(WorkspaceEvent event) {
    try {
      // ... your existing permissions/JSON adjustments here ...

      // Emit *after* JSON is final. If you have afterSave(), move this there.
      String workspaceId = resolveWorkspaceId(event);
      emitter.emitWorkspaceModified(workspaceId);
    } catch (Exception e) {
      e.printStackTrace();
    }
  }

  private String resolveWorkspaceId(WorkspaceEvent event) {
    try {
      var m = event.getClass().getMethod("getWorkspaceId");
      Object v = m.invoke(event);
      if (v != null) return String.valueOf(v);
    } catch (Exception ignore) {}

    try {
      Workspace ws = WorkspaceUtils.fromJson(event.getJson());
      var getId = ws.getClass().getMethod("getId");
      Object id = getId.invoke(ws);
      if (id != null) return String.valueOf(id);
    } catch (Exception ignore) {}

    throw new IllegalStateException("Unable to resolve workspaceId");
  }
}

If your plugin interface exposes afterSave(WorkspaceEvent), emit there (best: only after a successful save).

⸻

6) Runtime flags (Kerberos on JDK ≥16)

Add to the JVM that runs Structurizr + plugin:

--add-exports=java.security.jgss/sun.security.jgss=ALL-UNNAMED
--add-exports=java.security.jgss/sun.security.jgss.spi=ALL-UNNAMED
--add-exports=java.security.jgss/sun.security.krb5=ALL-UNNAMED
--add-exports=java.security.jgss/sun.security.krb5.internal=ALL-UNNAMED
--add-exports=java.security.jgss/sun.security.krb5.internal.ccache=ALL-UNNAMED
--add-exports=java.base/sun.security.util=ALL-UNNAMED
-Djavax.security.auth.useSubjectCredsOnly=false

	•	Non-Windows: ensure a TGT (kinit) and point to your realm:
-Djava.security.krb5.conf=/etc/krb5.conf

⸻

7) Config knobs
	•	Set the portal base URL at runtime:
	•	Env var: SZR_PORTAL_BASE=https://<your-portal-host>
	•	If you need to temporarily test without Kerberos (e.g., hitting a mock server), the code still works against plain HTTP endpoints. Just set SZR_PORTAL_BASE to your mock URL.

⸻

8) How to test now (even before Part 1 is fixed)
	•	Option A (mock server): run a tiny local server that responds 204 to /api/events/ping and /api/events/workspace-modified. Example (Node):

npx http-server # or use a minimal Express app returning 204s for those paths

Set SZR_PORTAL_BASE to that server; save a workspace → see the emitter’s requests in your mock.

	•	Option B (curl as receiver): Use nc -l 4019 or a simple Express app to print requests. Point SZR_PORTAL_BASE to http://localhost:4019.

Once Part 1 is up, just point SZR_PORTAL_BASE back to your portal.

⸻

9) Deploy (when ready)
	•	Update plugin jar, flip the releaseLink for msde/szr-workspace-plugin.
	•	Run your release job → train deploy --env prod.
	•	Restart Structurizr (it picks up the bind-mounted plugin).

⸻

TL;DR

Paste these three classes, add the Gradle deps + JVM flags, set SZR_PORTAL_BASE, and you’re done with Part 2. You can even test against a mock endpoint today; when the portal endpoints come alive, no code changes are needed—only the base URL.