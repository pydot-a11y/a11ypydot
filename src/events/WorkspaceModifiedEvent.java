package events;

// File: com/ms/msde/szr/workspaceplugin/events/WorkspaceModifiedEvent.java
//package com.ms.msde.szr.workspaceplugin.events;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class WorkspaceModifiedEvent {
    private String eventId = UUID.randomUUID().toString();
    private String workspaceId;
    private String modifiedBy;
    private Instant modifiedAt = Instant.now();
    
    // Constructors, Getters, Setters...
    public WorkspaceModifiedEvent(String workspaceId, String modifiedBy) {
        this.workspaceId = workspaceId;
        this.modifiedBy = modifiedBy;
    }
}