-- ============================================================
-- CampusFlow — Migration 001: Initial Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================
 
-- Enable pgvector extension (required for AI features)
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── departments ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  contact TEXT,
  head_id UUID,  -- FK to users added after users table
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'faculty', 'staff', 'admin', 'grievance_authority')),
  department_id UUID REFERENCES departments(id),
  student_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add head_id FK now that users table exists
ALTER TABLE departments ADD CONSTRAINT departments_head_id_fkey 
  FOREIGN KEY (head_id) REFERENCES users(id);

-- ─── locations ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building TEXT NOT NULL,
  floor TEXT,
  room TEXT,
  label TEXT NOT NULL,
  latitude FLOAT,
  longitude FLOAT
);

-- ─── staff ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id),
  skills TEXT[],
  availability TEXT DEFAULT 'available',
  current_workload INT DEFAULT 0
);

-- ─── incidents ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_issue_id UUID,  -- FK set after issues table
  category TEXT NOT NULL,
  location_id UUID REFERENCES locations(id),
  priority TEXT NOT NULL DEFAULT 'medium',
  affected_users INT DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- ─── issues ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  location_id UUID REFERENCES locations(id),
  location_label TEXT,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status TEXT DEFAULT 'reported' CHECK (status IN (
    'reported','verified','assigned','in_progress',
    'resolved','user_verified','user_rejected','reopened','closed'
  )),
  incident_id UUID REFERENCES incidents(id),
  assigned_department UUID REFERENCES departments(id),
  assigned_staff UUID REFERENCES staff(id),
  sla_deadline TIMESTAMPTZ,
  sla_breached BOOLEAN DEFAULT false,
  image_urls TEXT[],
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Add primary_issue_id FK
ALTER TABLE incidents ADD CONSTRAINT incidents_primary_issue_fkey 
  FOREIGN KEY (primary_issue_id) REFERENCES issues(id);

-- ─── issue_updates ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS issue_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES issues(id) NOT NULL,
  actor_id UUID REFERENCES users(id),
  old_status TEXT,
  new_status TEXT,
  comment TEXT,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── lost_items ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lost_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  object_type TEXT NOT NULL,
  description TEXT NOT NULL,
  color TEXT,
  location TEXT,
  lost_at TIMESTAMPTZ,
  image_url TEXT,
  private_detail TEXT,
  status TEXT DEFAULT 'searching' CHECK (status IN ('searching','matched','returned','closed')),
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── found_items ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS found_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  object_type TEXT NOT NULL,
  description TEXT NOT NULL,
  color TEXT,
  location TEXT,
  found_at TIMESTAMPTZ,
  image_url TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available','claimed','returned')),
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── lost_found_matches ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lost_found_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lost_item_id UUID REFERENCES lost_items(id),
  found_item_id UUID REFERENCES found_items(id),
  similarity_score FLOAT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── grievances ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grievances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by UUID REFERENCES users(id) NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('anti_ragging','harassment','discrimination','safety','other')),
  description TEXT NOT NULL,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted','under_review','resolved','closed')),
  assigned_authority UUID REFERENCES users(id),
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── knowledge_documents ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT,
  content TEXT NOT NULL,
  content_embedding VECTOR(1536),
  source TEXT,
  version TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── notifications ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reference_id UUID,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── audit_logs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS issues_status_idx ON issues(status);
CREATE INDEX IF NOT EXISTS issues_priority_idx ON issues(priority);
CREATE INDEX IF NOT EXISTS issues_department_idx ON issues(assigned_department);
CREATE INDEX IF NOT EXISTS issues_created_by_idx ON issues(created_by);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id, read);

-- Vector indexes (create after data is loaded for performance)
-- CREATE INDEX issues_embedding_idx ON issues USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- CREATE INDEX knowledge_embedding_idx ON knowledge_documents USING ivfflat (content_embedding vector_cosine_ops) WITH (lists = 100);
-- CREATE INDEX lost_items_embedding_idx ON lost_items USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- CREATE INDEX found_items_embedding_idx ON found_items USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ─── Updated_at trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER issues_updated_at
  BEFORE UPDATE ON issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER grievances_updated_at
  BEFORE UPDATE ON grievances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
