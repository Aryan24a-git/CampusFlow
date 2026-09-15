import { Router } from 'express';
import { db } from '../../db/client';

const router = Router();

// GET /api/departments — List all departments
router.get('/', async (_req, res, next) => {
  try {
    const { data, error } = await db
      .from('departments')
      .select('id, name, description, contact')
      .order('name', { ascending: true });

    if (error) throw error;
    res.json({ success: true, data: data ?? [] });
  } catch (err) {
    next(err);
  }
});

export default router;
