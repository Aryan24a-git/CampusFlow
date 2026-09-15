import { Request, Response, NextFunction } from 'express';
import type { UserRole } from '../../../packages/types/src/index';

// ─── RBAC Guard Factory ────────────────────────────────────────────────────────
export const rbac = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthenticated' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
      });
      return;
    }
    next();
  };
};
