import { db } from '../../db/client';
import { HTTP } from '../../utils/errors';
import type { IssueStatus, Priority, UserRole } from '../../types';

export interface CreateIssueInput {
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  location_id?: string;
  location_label?: string;
  severity?: Priority;
  image_urls?: string[];
}

export class IssuesService {
  /**
   * Create a new issue
   */
  static async createIssue(userId: string, input: CreateIssueInput) {
    if (!input.title?.trim()) throw HTTP.badRequest('Title is required');
    if (!input.description?.trim()) throw HTTP.badRequest('Description is required');
    if (!input.category?.trim()) throw HTTP.badRequest('Category is required');

    // Auto-resolve department by category name if available
    let assignedDepartmentId: string | null = null;
    const { data: dept } = await db
      .from('departments')
      .select('id')
      .ilike('name', `%${input.category}%`)
      .maybeSingle();

    if (dept) {
      assignedDepartmentId = dept.id;
    }

    const severity: Priority = input.severity ?? 'medium';
    const priority: Priority = severity; // Default 1:1 mapping until Level 6 engine

    // 24 hour SLA deadline default
    const slaDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: issue, error } = await db
      .from('issues')
      .insert({
        created_by: userId,
        title: input.title.trim(),
        description: input.description.trim(),
        category: input.category.trim(),
        subcategory: input.subcategory?.trim() ?? null,
        location_id: input.location_id ?? null,
        location_label: input.location_label?.trim() ?? null,
        severity,
        priority,
        status: 'reported',
        assigned_department: assignedDepartmentId,
        sla_deadline: slaDeadline,
        image_urls: input.image_urls ?? [],
      })
      .select('*, departments(name), locations(label)')
      .single();

    if (error || !issue) {
      throw HTTP.serverError(`Failed to create issue: ${error?.message}`);
    }

    // Insert initial status update log
    await db.from('issue_updates').insert({
      issue_id: issue.id,
      actor_id: userId,
      new_status: 'reported',
      comment: 'Issue reported by user',
    });

    return issue;
  }

  /**
   * List issues based on user role and filters
   */
  static async listIssues(
    userId: string,
    userRole: UserRole,
    filters?: { status?: string; category?: string; priority?: string }
  ) {
    let query = db
      .from('issues')
      .select('*, departments(name), locations(label), creator:users!created_by(id, name, email)')
      .order('created_at', { ascending: false });

    // Role-based visibility
    if (userRole === 'student' || userRole === 'faculty') {
      // Students and faculty only see their own issues
      query = query.eq('created_by', userId);
    } else if (userRole === 'staff') {
      // Find staff record to get department and staff ID
      const { data: staffRecord } = await db
        .from('staff')
        .select('id, department_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (staffRecord) {
        // Staff see issues assigned directly to them OR to their department
        query = query.or(
          `assigned_staff.eq.${staffRecord.id},assigned_department.eq.${staffRecord.department_id}`
        );
      }
    }
    // admin and grievance_authority see all

    // Apply optional filters
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }
    if (filters?.priority && filters.priority !== 'all') {
      query = query.eq('priority', filters.priority);
    }

    const { data, error } = await query;
    if (error) {
      throw HTTP.serverError(`Failed to list issues: ${error.message}`);
    }

    return data ?? [];
  }

  /**
   * Get single issue with full timeline history
   */
  static async getIssueById(issueId: string, userId: string, userRole: UserRole) {
    const { data: issue, error } = await db
      .from('issues')
      .select(`
        *,
        departments(id, name, contact),
        locations(id, label, building, floor, room),
        creator:users!created_by(id, name, email, role),
        staff:assigned_staff(id, user:users(name, phone))
      `)
      .eq('id', issueId)
      .single();

    if (error || !issue) {
      throw HTTP.notFound('Issue not found');
    }

    // Role access check: student/faculty can only view their own issues
    if (
      (userRole === 'student' || userRole === 'faculty') &&
      issue.created_by !== userId
    ) {
      throw HTTP.forbidden('You do not have permission to view this issue');
    }

    // Fetch timeline updates
    const { data: updates } = await db
      .from('issue_updates')
      .select(`
        id,
        issue_id,
        actor_id,
        old_status,
        new_status,
        comment,
        attachment_url,
        created_at,
        actor:users!actor_id(id, name, role)
      `)
      .eq('issue_id', issueId)
      .order('created_at', { ascending: true });

    return {
      ...issue,
      updates: updates ?? [],
    };
  }

  /**
   * Update status of an issue (Staff / Admin / User verification)
   */
  static async updateStatus(
    issueId: string,
    userId: string,
    userRole: UserRole,
    newStatus: IssueStatus,
    comment?: string,
    attachmentUrl?: string
  ) {
    // Check if issue exists
    const { data: currentIssue, error: fetchErr } = await db
      .from('issues')
      .select('id, status, created_by, assigned_staff, assigned_department')
      .eq('id', issueId)
      .single();

    if (fetchErr || !currentIssue) {
      throw HTTP.notFound('Issue not found');
    }

    const oldStatus = currentIssue.status as IssueStatus;

    // Permissions check
    if (userRole === 'student' || userRole === 'faculty') {
      // Students can only verify or reopen their own resolved issues
      if (currentIssue.created_by !== userId) {
        throw HTTP.forbidden('Access denied');
      }
      if (!['user_verified', 'user_rejected', 'reopened'].includes(newStatus)) {
        throw HTTP.forbidden('Students can only verify or reopen resolved issues');
      }
    }

    const updates: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === 'resolved') {
      updates.resolved_at = new Date().toISOString();
    } else if (newStatus === 'reopened') {
      updates.resolved_at = null;
    }

    // If staff accepts the issue, assign to them if unassigned
    if (userRole === 'staff') {
      const { data: staffMember } = await db
        .from('staff')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (staffMember && !currentIssue.assigned_staff) {
        updates.assigned_staff = staffMember.id;
      }
    }

    const { data: updatedIssue, error: updateErr } = await db
      .from('issues')
      .update(updates)
      .eq('id', issueId)
      .select('*, departments(name), locations(label)')
      .single();

    if (updateErr || !updatedIssue) {
      throw HTTP.serverError(`Failed to update issue: ${updateErr?.message}`);
    }

    // Record audit log entry in issue_updates
    await db.from('issue_updates').insert({
      issue_id: issueId,
      actor_id: userId,
      old_status: oldStatus,
      new_status: newStatus,
      comment: comment?.trim() ?? `Status changed to ${newStatus}`,
      attachment_url: attachmentUrl ?? null,
    });

    return updatedIssue;
  }
}
