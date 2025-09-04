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