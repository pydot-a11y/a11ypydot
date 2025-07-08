import { MongoClient, Collection, Db, ObjectId } from "mongodb";

export type TimeRange = 'lastWeek' | 'lastMonth' | 'last3Months' | 'lastYear' | 'last2Years';

interface WorkspaceDocument {
  _id: ObjectId;
  instance: string;
  workspaceId: number;
  eonid: number;
  readRole: string;
  writeRole: string;
  archived: boolean;
  // NEW FIELD: lastUpdated timestamp for tracking activity
  lastUpdated?: Date;
}

interface AggregationResult {
  _id: {
    year: number;
    month: number;
    day: number;
  };
  count: number;
}

interface AnalyticsResponse {
  result: {
    data: {
      json: AggregationResult[];
    };
  };
}

class WorkspaceInfoDB {
  private client: MongoClient;
  private workspaces: Collection;

  private constructor(client: MongoClient, workspaces: Collection) {
    this.client = client;
    this.workspaces = workspaces;
  }

  static connect = async (): Promise<WorkspaceInfoDB> => {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not defined");
    
    const client = new MongoClient(uri);
    await client.connect();
    const db: Db = client.db();
    return new WorkspaceInfoDB(client, db.collection("workspaces"));
  };

  getAllWorkspaces = async () => {
    const result = await this.workspaces.find({}).toArray();
    console.log('Database getAllWorkspaces result:', result.length);
    return {
      result: {
        data: {
          json: result
        }
      }
    };
  };

  getWorkspaceAnalytics = async (
    filters: {
      range: TimeRange;
      eonid?: number;
    }
  ): Promise<AnalyticsResponse> => {
    const dateRange = new Date();
    
    switch (filters.range) {
      case "lastWeek":
        dateRange.setDate(dateRange.getDate() - 7);
        break;
      case "lastMonth":
        dateRange.setMonth(dateRange.getMonth() - 1);
        break;
      case "last3Months":
        dateRange.setMonth(dateRange.getMonth() - 3);
        break;
      case "lastYear":
        dateRange.setFullYear(dateRange.getFullYear() - 1);
        break;
      case "last2Years":
        dateRange.setFullYear(2023);
        dateRange.setMonth(7); // August 2023
        break;
    }

    // Build match stage dynamically based on provided filters
    const matchStage: Record<string, any> = {
      _id: { 
        $gte: ObjectId.createFromTime(Math.floor(dateRange.getTime() / 1000))
      },
      $or: [
        { archived: { $exists: false } },
        { archived: false }
      ]
    };

    if (filters.eonid) {
      matchStage.eonid = filters.eonid;
    }

    console.log('Aggregation match stage:', JSON.stringify(matchStage, null, 2));

    const result = await this.workspaces
      .aggregate<AggregationResult>([
        { $match: matchStage },
        {
          $group: {
            _id: {
              year: { $year: "$_id" },
              month: { $month: "$_id" },
              day: { $dayOfMonth: "$_id" }
            },
            count: { $sum: 1 }
          }
        },
        { 
          $sort: { 
            "_id.year": 1, 
            "_id.month": 1, 
            "_id.day": 1 
          } 
        }
      ])
      .toArray();

    console.log('Aggregation result:', JSON.stringify(result, null, 2));

    return {
      result: {
        data: {
          json: result
        }
      }
    };
  };

  // NEW METHOD: Get total workspace count
  getWorkspaceCount = async (filters?: { eonid?: number }) => {
    const matchStage: Record<string, any> = {
      $or: [
        { archived: { $exists: false } },
        { archived: false }
      ]
    };
    
    if (filters?.eonid) {
      matchStage.eonid = filters.eonid;
    }
    
    const result = await this.workspaces.countDocuments(matchStage);
    console.log('Database getWorkspaceCount result:', result);
    return result;
  };

  // NEW METHOD: Get newly created workspaces in last N hours
  getNewlyCreatedWorkspaces = async (hours = 24, eonid?: number) => {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);
    
    const matchStage: Record<string, any> = {
      _id: { $gte: ObjectId.createFromTime(Math.floor(cutoff.getTime() / 1000)) },
      $or: [
        { archived: { $exists: false } },
        { archived: false }
      ]
    };
    
    if (eonid) {
      matchStage.eonid = eonid;
    }
    
    const result = await this.workspaces.countDocuments(matchStage);
    console.log('Database getNewlyCreatedWorkspaces result:', result);
    return result;
  };

  // NEW METHOD: Get recently created workspaces with pagination
  getRecentlyCreatedWorkspaces = async (
    limit = 10, 
    skip = 0, 
    eonid?: number
  ) => {
    const matchStage: Record<string, any> = {
      $or: [
        { archived: { $exists: false } },
        { archived: false }
      ]
    };
    
    if (eonid) {
      matchStage.eonid = eonid;
    }
    
    const result = await this.workspaces
      .find(matchStage)
      .sort({ _id: -1 }) // Sort by ObjectId descending (most recent first)
      .skip(skip)
      .limit(limit)
      .toArray();
      
    console.log('Database getRecentlyCreatedWorkspaces result:', result.length);
    return result;
  };

  // NEW METHOD: Get active workspaces count (updated in last N days)
  getActiveWorkspaces = async (days = 45, eonid?: number) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    // Base match criteria - either has lastUpdated >= cutoff or uses ObjectId timestamp as fallback
    const matchStage: Record<string, any> = {
      $or: [
        // Option 1: If lastUpdated field exists and is recent enough
        { 
          lastUpdated: { $gte: cutoff },
          $or: [
            { archived: { $exists: false } },
            { archived: false }
          ]
        },
        // Option 2: For legacy data without lastUpdated, fallback to ObjectId
        // NOTE: This is an approximation since ObjectId only tells us creation date
        { 
          lastUpdated: { $exists: false },
          _id: { $gte: ObjectId.createFromTime(Math.floor(cutoff.getTime() / 1000)) },
          $or: [
            { archived: { $exists: false } },
            { archived: false }
          ]
        }
      ]
    };
    
    // Add eonid filter if provided
    if (eonid) {
      matchStage.$or.forEach((condition: any) => {
        condition.eonid = eonid;
      });
    }
    
    const result = await this.workspaces.countDocuments(matchStage);
    console.log('Database getActiveWorkspaces result:', result);
    return result;
  };

  close = async () => {
    await this.client.close();
  };
}

export default WorkspaceInfoDB;