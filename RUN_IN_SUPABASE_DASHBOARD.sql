-- ============================================
-- COPY AND PASTE THIS ENTIRE SCRIPT INTO
-- SUPABASE DASHBOARD SQL EDITOR
-- ============================================
-- URL: https://supabase.com/dashboard/project/aozsuqxcpbotbxmwstin/sql
-- ============================================

-- Create templates table for storing extraction templates
CREATE TABLE IF NOT EXISTS public.templates (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    columns JSONB NOT NULL DEFAULT '[]'::jsonb,
    ai_instruction TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id TEXT,
    CONSTRAINT templates_name_not_empty CHECK (char_length(trim(name)) > 0)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON public.templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON public.templates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_templates_name ON public.templates(name);

-- Enable Row Level Security
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.templates;

-- Create policy to allow all operations
CREATE POLICY "Allow all operations for authenticated users" ON public.templates
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_templates_updated_at ON public.templates;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.templates IS 'Stores AI extraction templates with column configurations and instructions';
COMMENT ON COLUMN public.templates.columns IS 'JSONB array of column definitions with id, name, and instruction fields';
COMMENT ON COLUMN public.templates.ai_instruction IS 'AI instruction text for data extraction';

-- Verify table was created
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'templates'
ORDER BY ordinal_position;

