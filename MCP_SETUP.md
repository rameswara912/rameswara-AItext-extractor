# MCP Configuration Setup

## Update mcp.json File

Update your `C:\Users\hpaug\.cursor\mcp.json` file with the following configuration:

```json
{
  "mcpServers": {
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
        "postgresql://postgres:[YOUR-DB-PASSWORD]@db.aozsuqxcpbotbxmwstin.supabase.co:5432/postgres",
        "--tools-config",
        "C:/Users/hpaug/OneDrive/Desktop/mcp/selfhosted-supabase-mcp/mcp-tools.json"
      ]
    }
  }
}
```

**Important Notes:**
1. Replace `[YOUR-DB-PASSWORD]` with your actual Supabase database password
   - You can find/reset it in: Supabase Dashboard → Settings → Database → Database Password
2. Update the `--tools-config` path if your mcp-tools.json is in a different location
3. Restart Cursor after updating mcp.json for changes to take effect

## Environment Variables Setup

1. Create a `.env.local` file in your project root (`aitextextractor` folder)
2. Copy the contents from `.env.example` file
3. Replace `[YOUR-PASSWORD]` in DATABASE_URL with your actual database password

## Credentials Summary

### Supabase
- **Project URL**: https://aozsuqxcpbotbxmwstin.supabase.co
- **Anon Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvenN1cXhjcGJvdGJ4bXdzdGluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjcyNDEsImV4cCI6MjA3ODI0MzI0MX0.82Sw1UjAYLTHcPcFAgiIECf8R4EO_NPORZe1V-2O_jY
- **Service Role Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvenN1cXhjcGJvdGJ4bXdzdGluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjY2NzI0MSwiZXhwIjoyMDc4MjQzMjQxfQ.xw7P9fkhwaf3LAocKifMxXM3cl1xEeNvprylkNhSj34

### Stripe
- **Publishable Key**: sb_publishable_WDeiyls9KlukPdfiQt7ntQ_lhOHApn8
- **Secret Key**: sb_secret_PTKdBKYBUQicaMMvY3deRg_2A1xvKnD
- **Access Token**: sbp_8760bfb115b3fc140e7027ee39a7bcd189dace59

## Next Steps

1. Update `mcp.json` with the configuration above
2. Create `.env.local` file with your credentials
3. Get your database password from Supabase Dashboard
4. Restart Cursor to apply MCP changes
5. Test the connection using MCP tools

