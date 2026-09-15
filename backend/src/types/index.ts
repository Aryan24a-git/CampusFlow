// CampusFlow — Shared TypeScript Types for Backend

export type UserRole = 'student' | 'faculty' | 'staff' | 'admin' | 'grievance_authority';

export type IssueStatus =
  | 'reported'
  | 'verified'
  | 'assigned'
  | 'in_progress'
  | 'resolved'
  | 'user_verified'
  | 'user_rejected'
  | 'reopened'
  | 'closed';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export type IntentType =
  | 'MAINTENANCE_REPORT'
  | 'COMPLAINT_STATUS'
  | 'CAMPUS_INFORMATION'
  | 'ADMINISTRATIVE_REQUEST'
  | 'GRIEVANCE'
  | 'LOST_ITEM'
  | 'FOUND_ITEM'
  | 'EMERGENCY_INFORMATION'
  | 'GENERAL_CONVERSATION';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  department_id?: string;
  student_id?: string;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  contact?: string;
  head_id?: string;
}

export interface Location {
  id: string;
  building: string;
  floor?: string;
  room?: string;
  label: string;
}

export interface Issue {
  id: string;
  created_by: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  location_id?: string;
  location_label?: string;
  severity: Priority;
  priority: Priority;
  status: IssueStatus;
  incident_id?: string;
  assigned_department?: string;
  assigned_staff?: string;
  sla_deadline?: string;
  sla_breached: boolean;
  image_urls?: string[];
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface IssueUpdate {
  id: string;
  issue_id: string;
  actor_id?: string;
  old_status?: string;
  new_status?: string;
  comment?: string;
  attachment_url?: string;
  created_at: string;
}

export interface Incident {
  id: string;
  primary_issue_id?: string;
  category: string;
  location_id?: string;
  priority: Priority;
  affected_users: number;
  status: string;
  created_at: string;
  resolved_at?: string;
}

export interface LostItem {
  id: string;
  user_id: string;
  object_type: string;
  description: string;
  color?: string;
  location?: string;
  lost_at?: string;
  image_url?: string;
  status: 'searching' | 'matched' | 'returned' | 'closed';
  created_at: string;
}

export interface FoundItem {
  id: string;
  user_id: string;
  object_type: string;
  description: string;
  color?: string;
  location?: string;
  found_at?: string;
  image_url?: string;
  status: 'available' | 'claimed' | 'returned';
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  reference_id?: string;
  read: boolean;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  intent?: IntentType;
  actionCard?: ActionCard;
  timestamp: string;
}

export interface ActionCard {
  type: 'issue_confirmation' | 'duplicate_found' | 'lost_found_match' | 'issue_status';
  data: Record<string, unknown>;
}

export interface ExtractedIssue {
  title: string;
  category: string;
  subcategory?: string;
  location_label: string;
  severity: Priority;
  description: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}
