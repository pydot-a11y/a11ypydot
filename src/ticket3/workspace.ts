import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getDb } from '../db'; // assuming you have a db helper

// Schema validation for incoming event payload
const workspaceModifiedSchema = z.object({
  eventId: z.string(),
  workspaceId: z.string(),
  modifiedAt: z.string().datetime(),
  modifiedBy: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Validate request body
    const parsed = workspaceModifiedSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.errors });
    }

    const { eventId, workspaceId, modifiedAt, modifiedBy } = parsed.data;

    // 🔹 Log the received event for debugging/visibility
    console.log(
      '[workspace-modified] received event',
      JSON.stringify(parsed.data, null, 2)
    );

    // Get DB and collection
    const db = await getDb();
    const activity = db.collection('workspace_activity');

    // Ensure indexes exist
    await Promise.all([
      activity.createIndex({ eventId: 1 }, { unique: true }),
      activity.createIndex({ workspaceId: 1 }),
    ]);

    // Upsert into workspace_activity collection
    await activity.updateOne(
      { workspaceId },
      {
        $set: {
          workspaceId,
          modifiedAt: new Date(modifiedAt),
          ...(modifiedBy ? { modifiedBy } : {}),
          eventId,
          receivedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return res.status(200).json({ message: 'Workspace activity recorded' });
  } catch (err) {
    console.error('workspace-modified error', err);
    return res.status(500).json({ message: 'Server error' });
  }
}