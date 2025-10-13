import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getDb } from '../db';

const MONGO_ENABLED = process.env.MONGO_ENABLED === 'true';
const TRUSTED_USER_HEADER = process.env.TRUSTED_USER_HEADER || 'x-authenticated-user';

// Schema for validation
const eventSchema = z.object({
  eventId: z.string().uuid(),
  workspaceId: z.string(),
  modifiedAt: z.string().datetime(),
  modifiedBy: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Validate content-type
  const contentType = req.headers['content-type'];
  if (!contentType || !contentType.includes('application/json')) {
    return res.status(415).json({ message: 'Content-Type must be application/json' });
  }

  // Parse body with fallback from trusted header
  let parsed;
  try {
    parsed = eventSchema.parse(req.body);
  } catch (err: any) {
    return res.status(400).json({ message: 'Invalid request body', error: err.errors });
  }

  if (!MONGO_ENABLED) {
    return res.status(204).end();
  }

  try {
    const db = await getDb();
    const workspaceActivity = db.collection('workspace_activity');

    // Upsert into workspace_activity
    await workspaceActivity.updateOne(
      { workspaceId: parsed.workspaceId },
      {
        $set: {
          workspaceId: parsed.workspaceId,
          modifiedAt: new Date(parsed.modifiedAt),
          ...(parsed.modifiedBy ? { modifiedBy: parsed.modifiedBy } : {}),
          eventId: parsed.eventId,
          receivedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return res.status(204).end();
  } catch (e: any) {
    console.error('[workspace-modified] persistence error', e);
    return res.status(500).json({ message: 'Server error' });
  }
}