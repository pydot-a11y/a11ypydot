plugins {
    id 'java'
    id 'maven-publish'
}

group = 'com.ms.msde.szr.workspaceplugin'
version = '1.0.0'

java {
    toolchain { languageVersion = JavaLanguageVersion.of(17) }
}

repositories {
    mavenCentral()
    // If you use an internal repo, add it here:
    // maven { url = uri("https://<your-artifactory>/maven") }
}

dependencies {
    // Structurizr (keep the versions you used when it last compiled successfully)
    implementation 'com.structurizr:structurizr-core:1.17.0'          // gives Workspace + WorkspaceUtils
    implementation 'com.structurizr:structurizr-client:3.0.0'         // ok to keep if you already had it
    implementation 'com.structurizr:structurizr-onpremises-plugin:0.0.1' // WorkspaceEvent*, WorkspaceProperties

    // HTTP client via Spring + Apache HttpClient 5
    implementation 'org.springframework:spring-web:6.1.10'
    implementation 'org.apache.httpcomponents.client5:httpclient5:5.3.1'

    // JSON (if you need ObjectMapper)
    implementation 'com.fasterxml.jackson.core:jackson-databind:2.17.1'

    testImplementation 'org.junit.jupiter:junit-jupiter:5.10.2'
}

test {
    useJUnitPlatform()
}





package com.ms.msde.szr.workspaceplugin.emit;

import com.ms.msde.szr.workspaceplugin.http.RestTemplateConfig;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

public final class EventEmitter {

    private final String base;
    private final RestTemplate rest;

    public EventEmitter(String baseUrl) {
        this.base = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length()-1) : baseUrl;
        this.rest = new RestTemplateConfig().rest();   // our configured client
    }

    private void prime() {
        rest.exchange(base + "/api/events/ping", HttpMethod.GET, HttpEntity.EMPTY, Void.class);
    }

    public void emitWorkspaceModified(String workspaceId) {
        int tries = 0; long backoff = 400;
        while (true) {
            try {
                prime(); // make sure session/cookies are set

                String url = base + "/api/events/workspace-modified";
                String json = EventPayloads.workspaceModifiedJson(workspaceId);

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);

                HttpEntity<String> req = new HttpEntity<>(json, headers);
                ResponseEntity<Void> res = rest.exchange(url, HttpMethod.POST, req, Void.class);

                if (!res.getStatusCode().is2xxSuccessful()) {
                    throw new RuntimeException("HTTP " + res.getStatusCode());
                }
                return;  // success
            } catch (Exception e) {
                tries++;
                if (tries >= 3) {
                    System.err.println("[SZR plugin] WARN emit failed after retries: " + e.getMessage());
                    return; // do not block the Structurizr save
                }
                try { Thread.sleep(backoff); } catch (InterruptedException ignored) {}
                backoff *= 2;
            }
        }
    }
}




package com.ms.msde.szr.workspaceplugin.http;

import org.apache.hc.client5.http.classic.HttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

public final class RestTemplateConfig {

    public RestTemplate rest() {
        HttpClient hc = HttpClients.custom()
                .disableCookieManagement() // RestTemplate will still store cookies per request factory
                .build();

        HttpComponentsClientHttpRequestFactory rf = new HttpComponentsClientHttpRequestFactory(hc);
        rf.setConnectTimeout(10_000);
        rf.setConnectionRequestTimeout(10_000);
        rf.setReadTimeout(10_000);

        return new RestTemplate(rf);
    }
}


package com.ms.msde.szr.workspaceplugin.emit;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

public final class EventPayloads {
    private static final ObjectMapper M = new ObjectMapper();

    public static String workspaceModifiedJson(String workspaceId) {
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("eventId", UUID.randomUUID().toString());
            body.put("eventType", "WORKSPACE_MODIFIED");
            body.put("workspaceId", String.valueOf(workspaceId));
            body.put("modifiedAt", Instant.now().toString());
            return M.writeValueAsString(body);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}




package com.ms.msde.szr.workspaceplugin;

import com.ms.msde.szr.workspaceplugin.emit.EventEmitter;
import com.structurizr.Workspace;
import com.structurizr.configuration.User;
import com.structurizr.io.WorkspaceUtils;
import com.structurizr.plugin.WorkspaceEvent;
import com.structurizr.plugin.WorkspaceEventListener;
import com.structurizr.plugin.WorkspaceProperties;

public class WorkspacePlugin implements WorkspaceEventListener {

    private static final String PORTAL_BASE =
            System.getenv().getOrDefault("SZR_PORTAL_BASE", "http://localhost:4015");

    private final EventEmitter emitter = new EventEmitter(PORTAL_BASE);

    @Override
    public void beforeSave(WorkspaceEvent event) {
        try {
            // --- your existing code: keep current users on save ---
            WorkspaceProperties currentProperties = event.getWorkspaceProperties();
            var currentUsers = currentProperties.getUsers();
            if (currentUsers == null || currentUsers.isEmpty()) {
                return;
            }

            String newJson = event.getJson();
            Workspace newWorkspace = WorkspaceUtils.fromJson(newJson);
            newWorkspace.getConfiguration().clearUsers();
            for (User user : currentUsers) {
                newWorkspace.getConfiguration().addUser(user);
            }
            newJson = WorkspaceUtils.toJson(newWorkspace, false);
            event.setJson(newJson);

            // --- emit event to portal ---
            String workspaceId = resolveWorkspaceId(event, newWorkspace);
            emitter.emitWorkspaceModified(workspaceId);

        } catch (Exception e) {
            e.printStackTrace(); // never block the save
        }
    }

    private String resolveWorkspaceId(WorkspaceEvent event, Workspace wsFromJson) {
        // 1) event.getWorkspaceId() if available
        try {
            var m = event.getClass().getMethod("getWorkspaceId");
            Object v = m.invoke(event);
            if (v != null) return String.valueOf(v);
        } catch (Exception ignore) {}

        // 2) workspace.getId() if present
        try {
            Object id = wsFromJson.getClass().getMethod("getId").invoke(wsFromJson);
            if (id != null) return String.valueOf(id);
        } catch (Exception ignore) {}

        throw new IllegalStateException("Unable to resolve workspaceId");
    }
}


package com.ms.msde.szr.workspaceplugin;

import com.ms.msde.szr.workspaceplugin.emit.EventEmitter;

public class SmokeMain {
    public static void main(String[] args) {
        String base = System.getenv().getOrDefault("SZR_PORTAL_BASE", "http://localhost:4015");
        new EventEmitter(base).emitWorkspaceModified("123");
        System.out.println("Done.");
    }
}