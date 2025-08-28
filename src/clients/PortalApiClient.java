package clients;

// File: com/ms/msde/szr/workspaceplugin/clients/PortalApiClient.java
package com.ms.msde.szr.workspaceplugin.clients;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.ms.msde.szr.workspaceplugin.events.WorkspaceModifiedEvent;
import com.ms.msde.szr.workspaceplugin.security.HmacUtils;
import okhttp3.*;

import java.io.IOException;
import java.util.logging.Level;
import java.util.logging.Logger;

public class PortalApiClient {
    private static final Logger LOGGER = Logger.getLogger(PortalApiClient.class.getName());
    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");

    // --- CONFIGURATION ---
    // These should be loaded from environment variables for security!
    private final String portalApiUrl;
    private final String sharedSecret;

    private final OkHttpClient httpClient;
    private final ObjectMapper objectMapper;

    public PortalApiClient() {
        this.portalApiUrl = System.getenv().getOrDefault("PORTAL_API_URL", "http://localhost:3000/api/events/workspace-modified");
        this.sharedSecret = System.getenv("PORTAL_API_SECRET"); // Must be set!

        if (this.sharedSecret == null || this.sharedSecret.isBlank()) {
            LOGGER.severe("PORTAL_API_SECRET environment variable not set. API client will not be able to send events.");
        }

        this.httpClient = new OkHttpClient();
        this.objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    public void sendEvent(WorkspaceModifiedEvent event) {
        if (sharedSecret == null || sharedSecret.isBlank()) {
            LOGGER.warning("Skipping event send because shared secret is not configured.");
            return;
        }

        try {
            String jsonPayload = objectMapper.writeValueAsString(event);
            String signature = HmacUtils.calculateSignature(sharedSecret, jsonPayload);

            Request request = new Request.Builder()
                .url(portalApiUrl)
                .post(RequestBody.create(jsonPayload, JSON))
                .header("X-Hub-Signature-256", signature) // Custom header for the signature
                .build();

            try (Response response = httpClient.newCall(request).execute()) {
                if (response.isSuccessful()) {
                    LOGGER.info("Successfully sent event " + event.getEventId() + ". Status: " + response.code());
                } else {
                    LOGGER.warning("Failed to send event " + event.getEventId() + ". Status: " + response.code() + ", Body: " + response.body().string());
                }
            }
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Error sending workspace modified event " + event.getEventId(), e);
        }
    }
}
