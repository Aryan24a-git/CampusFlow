-- ============================================================
-- CampusFlow — Migration 002: Row Level Security Policies
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- Allows the frontend anon key and authenticated users to read profiles, issues, departments, locations
-- ============================================================

-- 1. Users table policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read users" ON users;
CREATE POLICY "Allow authenticated read users" ON users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated update own user" ON users;
CREATE POLICY "Allow authenticated update own user" ON users FOR UPDATE USING (auth.uid() = id);

-- 2. Departments
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read departments" ON departments;
CREATE POLICY "Allow authenticated read departments" ON departments FOR SELECT USING (true);

-- 3. Locations
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read locations" ON locations;
CREATE POLICY "Allow authenticated read locations" ON locations FOR SELECT USING (true);

-- 4. Issues
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read issues" ON issues;
CREATE POLICY "Allow authenticated read issues" ON issues FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert issues" ON issues;
CREATE POLICY "Allow authenticated insert issues" ON issues FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update issues" ON issues;
CREATE POLICY "Allow authenticated update issues" ON issues FOR UPDATE USING (true);

-- 5. Issue Updates
ALTER TABLE issue_updates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read issue_updates" ON issue_updates;
CREATE POLICY "Allow authenticated read issue_updates" ON issue_updates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert issue_updates" ON issue_updates;
CREATE POLICY "Allow authenticated insert issue_updates" ON issue_updates FOR INSERT WITH CHECK (true);

-- 6. Staff
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read staff" ON staff;
CREATE POLICY "Allow authenticated read staff" ON staff FOR SELECT USING (true);

-- 7. Lost & Found
ALTER TABLE lost_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read lost_items" ON lost_items;
CREATE POLICY "Allow authenticated read lost_items" ON lost_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert lost_items" ON lost_items;
CREATE POLICY "Allow authenticated insert lost_items" ON lost_items FOR INSERT WITH CHECK (true);

ALTER TABLE found_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read found_items" ON found_items;
CREATE POLICY "Allow authenticated read found_items" ON found_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert found_items" ON found_items;
CREATE POLICY "Allow authenticated insert found_items" ON found_items FOR INSERT WITH CHECK (true);

-- 8. Storage Attachments Bucket Policies
DROP POLICY IF EXISTS "Public and authenticated can upload attachments" ON storage.objects;
CREATE POLICY "Public and authenticated can upload attachments" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'attachments');

DROP POLICY IF EXISTS "Public and authenticated can view attachments" ON storage.objects;
CREATE POLICY "Public and authenticated can view attachments" ON storage.objects
FOR SELECT USING (bucket_id = 'attachments');

DROP POLICY IF EXISTS "Public and authenticated can update attachments" ON storage.objects;
CREATE POLICY "Public and authenticated can update attachments" ON storage.objects
FOR UPDATE USING (bucket_id = 'attachments');
