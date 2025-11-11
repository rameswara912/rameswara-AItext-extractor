# Supabase MCP Setup - Access Token Permissions Issue

## Current Status

The Supabase MCP server is connected, but the access token doesn't have the necessary permissions to execute SQL or create tables. This is a common limitation with Supabase access tokens.

## Solution: Apply Migration via Dashboard

Since the MCP access token has limited permissions, the best approach is to apply the migration directly in the Supabase Dashboard:

### Steps:

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/aozsuqxcpbotbxmwstin/sql

2. **Open SQL Editor**
   - Click on **"SQL Editor"** in the left sidebar
   - Click **"New Query"**

3. **Run the Migration**
   - Open the file: `RUN_IN_SUPABASE_DASHBOARD.sql`
   - Copy the entire contents (starting from the CREATE TABLE statement)
   - Paste into the SQL Editor
   - Click **"Run"** (or press Ctrl+Enter)

4. **Verify the Table**
   - Go to **Table Editor** (left sidebar)
   - You should see the `templates` table with all columns
   - Check the structure matches:
     - `id` (text, primary key)
     - `name` (text, not null)
     - `columns` (jsonb)
     - `ai_instruction` (text)
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)
     - `user_id` (text, nullable)

## Why MCP Can't Execute SQL

The official Supabase MCP server (`@supabase/mcp-server-supabase`) uses the Management API, which requires:
- An access token with **database write permissions**
- The access token must have the `database` scope
- Some operations may require the service role key instead

## Alternative: Use Service Role Key

If you need to use MCP for database operations, you might need to:
1. Generate a new access token with database permissions
2. Or use the service role key (but this should be kept secure and not exposed in client-side code)

## After Migration

Once the table is created, you can:
1. Update your application to use Supabase client
2. Create API routes to save/load templates
3. Test the integration

The table structure is ready and matches your TypeScript interface in `components/selection-panel.tsx`.

