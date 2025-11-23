import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  
  // Use relative path to avoid hardcoded absolute paths
  outputFileTracingRoot: path.join(__dirname, '..'),
  
  // Disable Turbopack to use webpack (which handles native modules better)
  experimental: {
    turbo: false,
  },
  
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self' https://aozsuqxcpbotbxmwstin.supabase.co; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https://aozsuqxcpbotbxmwstin.supabase.co wss://aozsuqxcpbotbxmwstin.supabase.co http://localhost:* https: wss:; object-src 'self' data: blob: https: http:; frame-src 'self' data: blob: https: http:; worker-src 'self' blob:; frame-ancestors 'self';",
          },
        ],
      },
    ]
  },
  async rewrites() {
    // By default, do NOT rewrite /api/extract so our API route runs.
    // Enable direct rewrite only if NEXT_PUBLIC_DIRECT_WEBHOOK=1 is set.
    if (process.env.NEXT_PUBLIC_DIRECT_WEBHOOK === "1") {
      return [
        {
          source: "/api/extract",
          destination:
            process.env.WEBHOOK_URL ||
            "http://n8n-j400gwgokog0scs00o8w40gs.72.60.97.246.sslip.io/webhook/099bae8d-7d7d-49d7-8dbb-63d882e44153",
        },
      ]
    }
    return []
  },
}

export default nextConfig
