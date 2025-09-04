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
      System.getenv().getOrDefault("SZR_PORTAL_BASE", "https://szr.portal.internal");

  private final EventEmitter emitter = new EventEmitter(PORTAL_BASE);

  @Override
  public void beforeSave(WorkspaceEvent event) {
    try {
      // --- Your existing code: keep current users on save ---
      WorkspaceProperties currentProperties = event.getWorkspaceProperties();
      var currentUsers = currentProperties.getUsers();
      // If the workspace hasn't yet had permissions initialised, let them be initialised in this request
      if (currentUsers == null || currentUsers.isEmpty()) {
        return;
      }

      String newJson = event.getJson();
      Workspace newWorkspace = WorkspaceUtils.fromJson(newJson);

      // Clear then re-add current users so they persist
      newWorkspace.getConfiguration().clearUsers();
      for (User user : currentUsers) {
        newWorkspace.getConfiguration().addUser(user);
      }

      // Write back the modified JSON
      newJson = WorkspaceUtils.toJson(newWorkspace, /*indentOutput*/ false);
      event.setJson(newJson);

      // --- New code: emit "workspace modified" event to the portal ---
      String workspaceId = resolveWorkspaceId(event, newWorkspace);
      emitter.emitWorkspaceModified(workspaceId);

    } catch (Exception e) {
      e.printStackTrace();
    }
  }

  /**
   * Resolve the workspaceId from the event (preferred) or from the Workspace object.
   */
  private String resolveWorkspaceId(WorkspaceEvent event, Workspace wsFromJson) {
    // Try event.getWorkspaceId() if the plugin API exposes it
    try {
      var m = event.getClass().getMethod("getWorkspaceId");
      Object v = m.invoke(event);
      if (v != null) {
        return String.valueOf(v);
      }
    } catch (Exception ignore) {
      // fall through
    }

    // Try Workspace.getId()
    try {
      Object id = wsFromJson.getClass().getMethod("getId").invoke(wsFromJson);
      if (id != null) {
        return String.valueOf(id);
      }
    } catch (Exception ignore) {
      // fall through
    }

    // Try Workspace.getWorkspaceId() (some versions use this)
    try {
      Object id = wsFromJson.getClass().getMethod("getWorkspaceId").invoke(wsFromJson);
      if (id != null) {
        return String.valueOf(id);
      }
    } catch (Exception ignore) {
      // fall through
    }

    throw new IllegalStateException("Unable to resolve workspaceId from event or workspace JSON.");
  }
}