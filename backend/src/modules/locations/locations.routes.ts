import { Router } from 'express';
import { db } from '../../db/client';

const router = Router();

// GET /api/locations — List all locations
router.get('/', async (_req, res, next) => {
  try {
    const { data, error } = await db
      .from('locations')
      .select('id, building, floor, room, label')
      .order('label', { ascending: true });

    if (error) throw error;
    res.json({ success: true, data: data ?? [] });
  } catch (err) {
    next(err);
  }
});

export default router;
