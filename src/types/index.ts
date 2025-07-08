// src/types.ts
export interface Workspace {
    _id: string;
    instance: string;
    workspaceId: number;
    eonid: number;
    readRole: string;
    writeRole: string;
    archived: boolean;
    lastUpdated?: Date;
  }
  
  export type TimeRange = 'lastWeek' | 'lastMonth' | 'last3Months' | 'lastYear' | 'last2Years';
  
  export interface AnalyticsDataPoint {
    date: string;
    count: number;
  }
  
  // Additional types for API responses
  export interface WorkspaceCountResponse {
    count: number;
  }
  
  export interface WorkspaceAnalyticsFilters {
    range: TimeRange;
    eonid?: number;
  }
  
  export interface NewlyCreatedFilters {
    hours?: number;
    eonid?: number;
  }
  
  export interface ActiveWorkspacesFilters {
    days?: number;
    eonid?: number;
  }
  
  export interface RecentWorkspacesFilters {
    limit?: number;
    skip?: number;
    eonid?: number;
  }
  
  // C4 Model types
  export interface C4Workspace {
    _id: string;
    workspaceId: number;
    name: string;
    description?: string;
    owner: string;
    createdAt: Date;
    lastModified?: Date;
    viewCount: number;
  }
  
  export interface C4AnalyticsDataPoint {
    date: string;
    count: number;
  }
  
  export interface C4WorkspaceFilters {
    range: TimeRange;
    owner?: string;
  }