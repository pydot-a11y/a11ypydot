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