import { router, protectedProcedure } from "../trpc";
import WorkspaceInfoDB from "../../database";
import { z } from "zod";
import { ObjectId } from 'mongodb';

// Define a custom Zod schema for ObjectId
const objectIdSchema = z.custom<ObjectId>((val) => {
  try {
    if (typeof val === 'string') {
      return new ObjectId(val);
    }
    return val instanceof ObjectId;
  } catch {
    return false;
  }
});

// Define the workspace schema
const workspaceSchema = z.object({
  _id: objectIdSchema,
  instance: z.string(),
  workspaceId: z.number(),
  eonid: z.number(),
  readRole: z.string(),
  writeRole: z.string(),
  archived: z.boolean(),
  // NEW FIELD: optional lastUpdated field in schema validation
  lastUpdated: z.date().optional()
});

export const workspaceRouter = router({
  // EXISTING ENDPOINT: Get all workspaces
  getAllWorkspaces: protectedProcedure
    .query(async () => {
      const db = await WorkspaceInfoDB.connect();
      try {
        const response = await db.getAllWorkspaces();
        console.log('Router getAllWorkspaces response:', 
          response.result.data.json.length);
        return response.result.data.json;
      } finally {
        await db.close();
      }
    }),

  // EXISTING ENDPOINT: Get analytics data
  getAnalytics: protectedProcedure
    .input(
      z.object({
        range: z.enum(["lastWeek", "lastMonth", "last3Months", "lastYear", "last2Years"]),
        eonid: z.number().optional()
      })
    )
    .query(async ({ input }) => {
      const db = await WorkspaceInfoDB.connect();
      try {
        console.log('Router getAnalytics input:', input);
        const response = await db.getWorkspaceAnalytics(input);
        const analyticsData = response.result.data.json;
        console.log('Router getAnalytics response:', 
          analyticsData.length, 'records');
        
        return analyticsData.map(({ _id, count }) => ({
          date: `${_id.year}-${String(_id.month).padStart(2, "0")}-${String(_id.day).padStart(2, "0")}`,
          count,
        }));
      } finally {
        await db.close();
      }
    }),
    
  // NEW ENDPOINT: Get total workspace count
  getWorkspaceCount: protectedProcedure
    .input(
      z.object({
        eonid: z.number().optional()
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await WorkspaceInfoDB.connect();
      try {
        console.log('Router getWorkspaceCount input:', input);
        const count = await db.getWorkspaceCount(input);
        console.log('Router getWorkspaceCount response:', count);
        return count;
      } finally {
        await db.close();
      }
    }),

  // NEW ENDPOINT: Get newly created workspaces count
  getNewlyCreatedCount: protectedProcedure
    .input(
      z.object({
        hours: z.number().default(24),
        eonid: z.number().optional()
      })
    )
    .query(async ({ input }) => {
      const db = await WorkspaceInfoDB.connect();
      try {
        console.log('Router getNewlyCreatedCount input:', input);
        const count = await db.getNewlyCreatedWorkspaces(input.hours, input.eonid);
        console.log('Router getNewlyCreatedCount response:', count);
        return count;
      } finally {
        await db.close();
      }
    }),

  // NEW ENDPOINT: Get recently created workspaces
  getRecentlyCreated: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(10),
        skip: z.number().default(0),
        eonid: z.number().optional()
      })
    )
    .query(async ({ input }) => {
      const db = await WorkspaceInfoDB.connect();
      try {
        console.log('Router getRecentlyCreated input:', input);
        const workspaces = await db.getRecentlyCreatedWorkspaces(
          input.limit,
          input.skip,
          input.eonid
        );
        console.log('Router getRecentlyCreated response:', workspaces.length, 'workspaces');
        return workspaces;
      } finally {
        await db.close();
      }
    }),

  // NEW ENDPOINT: Get active workspaces count
  getActiveCount: protectedProcedure
    .input(
      z.object({
        days: z.number().default(45),
        eonid: z.number().optional()
      })
    )
    .query(async ({ input }) => {
      const db = await WorkspaceInfoDB.connect();
      try {
        console.log('Router getActiveCount input:', input);
        const count = await db.getActiveWorkspaces(input.days, input.eonid);
        console.log('Router getActiveCount response:', count);
        return count;
      } finally {
        await db.close();
      }
    }),
});
