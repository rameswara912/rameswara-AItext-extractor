-- Tighten RLS to per-user access and set default user_id

-- Ensure RLS is enabled (already enabled in initial migration)
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Set default user_id to the authenticated user's ID (cast to text)
ALTER TABLE public.templates
  ALTER COLUMN user_id SET DEFAULT (auth.uid())::text;

-- Drop any existing permissive or duplicate policies
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.templates;
DROP POLICY IF EXISTS "Allow read own templates" ON public.templates;
DROP POLICY IF EXISTS "Allow insert own templates" ON public.templates;
DROP POLICY IF EXISTS "Allow update own templates" ON public.templates;
DROP POLICY IF EXISTS "Allow delete own templates" ON public.templates;

-- Read: only rows where user_id matches current user
CREATE POLICY "Allow read own templates" ON public.templates
  FOR SELECT
  USING (user_id = auth.uid()::text);

-- Insert: enforce user_id = current user
CREATE POLICY "Allow insert own templates" ON public.templates
  FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

-- Update: only update own rows and enforce user_id stays current user
CREATE POLICY "Allow update own templates" ON public.templates
  FOR UPDATE
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- Delete: only delete own rows
CREATE POLICY "Allow delete own templates" ON public.templates
  FOR DELETE
  USING (user_id = auth.uid()::text);

