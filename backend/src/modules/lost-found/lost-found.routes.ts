import { Router, Request, Response } from 'express';
import { auth } from '../../middleware/auth';
import { db } from '../../db/client';

const router = Router();

// GET /api/lost-found — Get both lost and found items
router.get('/', auth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const { data: lostItems, error: lostErr } = await db
      .from('lost_items')
      .select('id, user_id, object_type, description, color, location, lost_at, status, created_at, users(name)')
      .order('created_at', { ascending: false });

    const { data: foundItems, error: foundErr } = await db
      .from('found_items')
      .select('id, user_id, object_type, description, color, location, found_at, status, created_at, users(name)')
      .order('created_at', { ascending: false });

    if (lostErr) throw lostErr;
    if (foundErr) throw foundErr;

    res.json({
      success: true,
      data: {
        lost: lostItems ?? [],
        found: foundItems ?? [],
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch lost & found items' });
  }
});

// POST /api/lost-found/lost — Report a lost item
router.post('/lost', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { object_type, description, color, location, private_detail } = req.body;

    if (!object_type || !description) {
      res.status(400).json({ success: false, error: 'Object type and description are required' });
      return;
    }

    const { data, error } = await db
      .from('lost_items')
      .insert({
        user_id: userId,
        object_type: object_type.trim(),
        description: description.trim(),
        color: color?.trim() || null,
        location: location?.trim() || null,
        private_detail: private_detail?.trim() || null,
        status: 'searching',
      })
      .select()
      .single();

    if (error) throw error;

    // Check for matching found items
    const { data: potentialMatches } = await db
      .from('found_items')
      .select('id, object_type, description, location')
      .ilike('object_type', `%${object_type.trim()}%`)
      .eq('status', 'available')
      .limit(3);

    res.status(201).json({
      success: true,
      data,
      matches: potentialMatches ?? [],
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to report lost item' });
  }
});

// POST /api/lost-found/found — Report a found item
router.post('/found', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { object_type, description, color, location } = req.body;

    if (!object_type || !description) {
      res.status(400).json({ success: false, error: 'Object type and description are required' });
      return;
    }

    const { data, error } = await db
      .from('found_items')
      .insert({
        user_id: userId,
        object_type: object_type.trim(),
        description: description.trim(),
        color: color?.trim() || null,
        location: location?.trim() || null,
        status: 'available',
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to report found item' });
  }
});

export default router;
