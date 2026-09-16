import { Request, Response } from 'express';
import { IssuesService } from './issues.service';
import type { IssueStatus, Priority } from '../../types';

export class IssuesController {
  static async create(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { title, description, category, subcategory, location_id, location_label, severity, image_urls } = req.body;

    const issue = await IssuesService.createIssue(userId, {
      title,
      description,
      category,
      subcategory,
      location_id,
      location_label,
      severity: severity as Priority,
      image_urls,
    });

    res.status(201).json({
      success: true,
      data: issue,
    });
  }

  static async list(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { status, category, priority, scope } = req.query;

    const issues = await IssuesService.listIssues(userId, userRole, {
      status: status as string | undefined,
      category: category as string | undefined,
      priority: priority as string | undefined,
      scope: scope as string | undefined,
    });

    res.json({
      success: true,
      data: issues,
    });
  }

  static async getById(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const id = req.params.id as string;

    const issue = await IssuesService.getIssueById(id, userId, userRole);

    res.json({
      success: true,
      data: issue,
    });
  }

  static async updateStatus(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const id = req.params.id as string;
    const { status, comment, attachment_url } = req.body;

    if (!status) {
      res.status(400).json({ success: false, error: 'Status is required' });
      return;
    }

    const updated = await IssuesService.updateStatus(
      id,
      userId,
      userRole,
      status as IssueStatus,
      comment,
      attachment_url
    );

    res.json({
      success: true,
      data: updated,
    });
  }
}
