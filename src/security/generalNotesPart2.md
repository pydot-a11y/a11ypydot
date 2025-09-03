Great—your plugin layout is perfect to drop Part 2 in. Here’s exactly what to do, step-by-step, tailored to your tree.

⸻

1) Create the packages & files

Under src/main/java/com/ms/msde/szr/workspaceplugin/ add:

com/ms/msde/szr/workspaceplugin/http/RestTemplateConfig.java
com/ms/msde/szr/workspaceplugin/emit/EventPayloads.java
com/ms/msde/szr/workspaceplugin/emit/EventEmitter.java

RestTemplateConfig.java

package com.ms.msde.szr.workspaceplugin.http;

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
    // Install corp Kerberos provider if present (safe no-op if absent)
    try {
      Class.forName("com.ms.security.MSKerberosJgssProvider").getMethod("install").invoke(null);
      Class.forName("com.ms.security.MSKerberosConfiguration").getMethod("setClientConfiguration").invoke(null);
    } catch (Throwable ignore) {}

    Lookup<AuthSchemeFactory> auth = RegistryBuilder.<AuthSchemeFactory>create()
      .register(StandardAuthScheme.SPNEGO, new SPNegoSchemeFactory(true))
      .register(StandardAuthScheme.BASIC,  new BasicSchemeFactory())
      .build();

    CloseableHttpClient http = HttpClients.custom()
      .setDefaultAuthSchemeRegistry(auth)
      .setRedirectStrategy(new DefaultRedirectStrategy())
      .setDefaultCookieStore(cookieStore)
      .build();

    var rf = new HttpComponentsClientHttpRequestFactory(http);
    rf.setConnectTimeout(10_000);
    rf.setReadTimeout(20_000);

    this.restTemplate = new RestTemplate(rf);
  }

  public RestTemplate rest() { return restTemplate; }
  public CookieStore cookies() { return cookieStore; }
}

EventPayloads.java

package com.ms.msde.szr.workspaceplugin.emit;

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

EventEmitter.java

package com.ms.msde.szr.workspaceplugin.emit;

import com.ms.msde.szr.workspaceplugin.http.RestTemplateConfig;
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
        var url = base + "/api/events/workspace-modified";
        var json = EventPayloads.workspaceModifiedJson(workspaceId);
        var headers = new HttpHeaders(); headers.setContentType(MediaType.APPLICATION_JSON);
        var req = new HttpEntity<>(json, headers);
        var res = rest.exchange(url, HttpMethod.POST, req, Void.class);
        if (!res.getStatusCode().is2xxSuccessful())
          throw new RuntimeException("HTTP " + res.getStatusCode());
        return; // success
      } catch (Exception e) {
        tries++;
        if (tries >= 3) {
          System.err.println("[SZR plugin] WARN emit failed after retries: " + e.getMessage());
          return; // do not block save
        }
        try { Thread.sleep(backoff); } catch (InterruptedException ignored) {}
        backoff *= 2;
      }
    }
  }
}

Update your existing WorkspacePlugin.java

Add the emitter and call it at the end of your beforeSave (or move to afterSave if available):

package com.ms.msde.szr.workspaceplugin;

import com.structurizr.Workspace;
import com.structurizr.io.WorkspaceUtils;
import com.structurizr.plugin.WorkspaceEvent;
import com.structurizr.plugin.WorkspaceEventListener;
import com.ms.msde.szr.workspaceplugin.emit.EventEmitter;

public class WorkspacePlugin implements WorkspaceEventListener {

  private static final String PORTAL_BASE =
      System.getenv().getOrDefault("SZR_PORTAL_BASE", "https://szr.portal.internal");

  private final EventEmitter emitter = new EventEmitter(PORTAL_BASE);

  @Override
  public void beforeSave(WorkspaceEvent event) {
    try {
      // ...your existing code...

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


⸻

2) Gradle: add dependencies & sync

Edit build.gradle:

repositories {
    mavenCentral()
    // if your company uses an internal Nexus/Artifactory, keep that too
}

dependencies {
    implementation 'org.springframework:spring-web:6.1.10'
    implementation 'org.apache.httpcomponents.client5:httpclient5:5.3.1'
    // implementation 'com.msjava:jpe-kerberos:<version>' // if provided internally
}

Then fetch deps:
	•	In IntelliJ: click “Load Gradle Changes”, or
	•	Terminal: ./gradlew clean build

Yes—you do need to run/sync after editing build.gradle. That downloads the libs and recompiles.

⸻

3) Run configuration?

You usually don’t need a new IntelliJ Run Configuration for the plugin itself, because it’s loaded by Structurizr at runtime. What you do need configured on the Structurizr process (where the plugin runs):
	•	Env var: SZR_PORTAL_BASE=https://<your-portal-host>
	•	JVM flags (Kerberos, JDK ≥16):

--add-exports=java.security.jgss/sun.security.jgss=ALL-UNNAMED
--add-exports=java.security.jgss/sun.security.jgss.spi=ALL-UNNAMED
--add-exports=java.security.jgss/sun.security.krb5=ALL-UNNAMED
--add-exports=java.security.jgss/sun.security.krb5.internal=ALL-UNNAMED
--add-exports=java.security.jgss/sun.security.krb5.internal.ccache=ALL-UNNAMED
--add-exports=java.base/sun.security.util=ALL-UNNAMED
-Djavax.security.auth.useSubjectCredsOnly=false


	•	If not Windows domain: -Djava.security.krb5.conf=/etc/krb5.conf and make sure a TGT exists (kinit/keytab).

If you do want to run a quick local test from IntelliJ, you can create a tiny main() that instantiates EventEmitter and calls emitWorkspaceModified("123") pointing at a mock URL—but that’s optional.

⸻

4) Build & deploy
	•	./gradlew build (or your CI job).
	•	Flip the releaseLink, run the release job, train deploy --env prod, restart Structurizr (per Gregory’s notes).

That’s it. Once Part 1 is reachable, the emitter will start sending ping then workspace-modified automatically on every save.