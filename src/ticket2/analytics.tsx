// src/types/analytics.ts

// --- 1. UPDATE RawApiLog INTERFACE ---
export interface RawApiLog {
    _id: { $oid: string };
    user: string;
    uri: string;
    url: string;
    createdAt?: string;
    created_at?: string;
    environment?: string; // Add this optional property
  }
  
  // --- 2. UPDATE RawStructurizrLog INTERFACE ---
  export interface RawStructurizrLog {
    _id: { $oid: string };
    archived: boolean;
    eonid: string;
    instance: string;
    readRole: string;
    workspaceId: number;
    writeRole: string;
    created_at?: string;
    deleted?: boolean;
    environment?: string; // Add this optional property
  }
  
  // ... (The rest of the file remains the same)