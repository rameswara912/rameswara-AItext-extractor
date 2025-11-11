# Direct Supabase Access Requirements

## Overview

The MCP (Model Context Protocol) server requires **direct database access** to Supabase for operations that cannot be performed through the REST API alone.

## Required Access Types

### 1. Direct PostgreSQL Database Connection ✅

**Purpose**: Direct SQL access to the database for:
- Running custom SQL queries
- Inspecting database schema and metadata
- Performing administrative operations
- Accessing database functions and triggers
- Managing tables, indexes, and constraints
- Querying system catalogs

**Configuration** (in `mcp.json`):
```json
"--db-url",
"postgresql://postgres:Rameswara%401234@db.aozsuqxcpbotbxmwstin.supabase.co:5432/postgres"
```

**Why Direct Access is Required**:
- The Supabase REST API has limitations and doesn't expose all database features
- Direct SQL access allows for complex queries, joins, and database operations
- Schema inspection and management require direct database connection
- Performance: Direct queries can be faster than REST API calls for complex operations

### 2. Supabase REST API Access

**Purpose**: Standard API operations through Supabase client

**Configuration** (in `mcp.json`):
- `--url`: Supabase project URL
- `--anon-key`: Public anonymous key (for client-side operations)
- `--service-key`: Service role key (bypasses Row Level Security, for admin operations)

### 3. MCP Tools Configuration

**Current Status**: Empty tools array in `mcp-tools.json`
```json
{
    "enabledTools": []
}
```

**Note**: You may need to enable specific tools in this configuration file depending on what operations you want the MCP server to perform.

## Security Considerations

⚠️ **Important Security Notes**:

1. **Database Password**: The database password is stored in plain text in `mcp.json`. Ensure this file is:
   - Not committed to version control
   - Protected with proper file permissions
   - Stored securely

2. **Service Role Key**: The service role key bypasses Row Level Security (RLS). Use with caution as it provides full database access.

3. **Network Access**: Ensure your IP address is whitelisted in Supabase Dashboard → Settings → Database → Network Restrictions if you have restrictions enabled.

## Current Configuration Status

✅ **Configured**:
- Database URL with password: `postgresql://postgres:Rameswara%401234@db.aozsuqxcpbotbxmwstin.supabase.co:5432/postgres`
- Supabase URL: `https://aozsuqxcpbotbxmwstin.supabase.co`
- Anon Key: Configured
- Service Role Key: Configured
- Tools Config Path: `C:/Users/hpaug/OneDrive/Desktop/mcp/selfhosted-supabase-mcp/mcp-tools.json`

⚠️ **Needs Attention**:
- `mcp-tools.json` has empty `enabledTools` array - you may need to configure which tools to enable

## Why Direct Database Access Was Required

The MCP server needs direct database access because:

1. **Schema Operations**: Creating, modifying, and inspecting database schema requires direct SQL access
2. **Complex Queries**: Advanced SQL queries with joins, CTEs, and window functions
3. **Performance**: Direct queries are faster than REST API calls for large datasets
4. **Database Functions**: Accessing PostgreSQL functions, triggers, and stored procedures
5. **Metadata Queries**: Querying system catalogs for table structures, indexes, constraints
6. **Administrative Tasks**: Managing users, roles, permissions, and other database administration

## Alternative: Using Only REST API

If you want to avoid direct database access, you would need to:
- Use only Supabase REST API endpoints
- Accept limitations on complex queries and schema operations
- Rely on Supabase client libraries instead of direct SQL
- Use Supabase Dashboard for schema management

However, this would significantly limit the capabilities of the MCP server.



