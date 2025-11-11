# Apply Templates Table Migration

## Quick Method: Via Supabase Dashboard

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/aozsuqxcpbotbxmwstin
   - Navigate to: **SQL Editor** (left sidebar)

2. **Run the Migration**
   - Click **"New Query"**
   - Copy the entire contents of `CREATE_TEMPLATES_TABLE.sql` or `supabase/migrations/001_create_templates_table.sql`
   - Paste into the SQL Editor
   - Click **"Run"** (or press Ctrl+Enter)

3. **Verify the Table**
   - Go to **Table Editor** (left sidebar)
   - You should see the `templates` table
   - Check that it has the following columns:
     - `id` (text, primary key)
     - `name` (text)
     - `columns` (jsonb)
     - `ai_instruction` (text)
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)
     - `user_id` (text)

## Alternative: Using Supabase CLI

If you have Supabase CLI installed:

```bash
cd "C:\Users\hpaug\OneDrive\Documents\aitextextractor"
supabase db push
```

## What This Migration Creates

- ✅ `templates` table with all required columns
- ✅ Indexes for fast queries (user_id, created_at, name)
- ✅ Row Level Security (RLS) enabled
- ✅ Policy to allow all operations
- ✅ Auto-update trigger for `updated_at` timestamp
- ✅ Table and column comments for documentation

## Next Steps

After the table is created, you can:
1. Update your application code to use Supabase instead of localStorage
2. Create API routes to save/load templates from the database
3. Test the migration by inserting a sample template

