import { Router } from 'express';
import { IssuesController } from './issues.controller';
import { auth } from '../../middleware/auth';

const router = Router();

// All issue routes require authentication
router.use(auth);

// POST /api/issues — Create new issue
router.post('/', (req, res, next) => {
  IssuesController.create(req, res).catch(next);
});

// GET /api/issues — List issues based on user role and query filters
router.get('/', (req, res, next) => {
  IssuesController.list(req, res).catch(next);
});

// GET /api/issues/:id — Single issue with full timeline
router.get('/:id', (req, res, next) => {
  IssuesController.getById(req, res).catch(next);
});

// PATCH /api/issues/:id/status — Update issue status
router.patch('/:id/status', (req, res, next) => {
  IssuesController.updateStatus(req, res).catch(next);
});

export default router;
