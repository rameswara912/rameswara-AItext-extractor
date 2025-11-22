# MCP Configuration Update

To enable MCP Supabase tools, update your `mcp.json` file:

## Option 1: Using Supabase MCP Server (Recommended)

Update the "supabase" server configuration in `mcp.json`:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "cmd",
      "args": [
        "/c",
        "npx",
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--project-ref=aozsuqxcpbotbxmwstin"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "<YOUR_SUPABASE_ACCESS_TOKEN>"
      }
    },
    "selfhosted-supabase": {
      "command": "node",
      "args": [
        "C:/Users/hpaug/OneDrive/Desktop/mcp/selfhosted-supabase-mcp/dist/index.js",
        "--url",
        "https://aozsuqxcpbotbxmwstin.supabase.co",
        "--anon-key",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvenN1cXhjcGJvdGJ4bXdzdGluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjcyNDEsImV4cCI6MjA3ODI0MzI0MX0.82Sw1UjAYLTHcPcFAgiIECf8R4EO_NPORZe1V-2O_jY",
        "--service-key",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvenN1cXhjcGJvdGJ4bXdzdGluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjY2NzI0MSwiZXhwIjoyMDc4MjQzMjQxfQ.xw7P9fkhwaf3LAocKifMxXM3cl1xEeNvprylkNhSj34",
        "--db-url",
        "postgresql://postgres:Rameswara%401234@db.aozsuqxcpbotbxmwstin.supabase.co:5432/postgres",
        "--tools-config",
        "C:/Users/hpaug/OneDrive/Desktop/mcp/selfhosted-supabase-mcp/mcp-tools.json"
      ]
    }
  }
}
```

**Note**: Use a Supabase account access token from Dashboard → Account → Access Tokens. Do not use Stripe tokens or client publishable keys here.

## Project Reference
- **Project Ref**: `aozsuqxcpbotbxmwstin`
- **Project URL**: `https://aozsuqxcpbotbxmwstin.supabase.co`
- **Access Token**: `<YOUR_SUPABASE_ACCESS_TOKEN>`

After updating, restart Cursor for changes to take effect.


