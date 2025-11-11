/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
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
            "http://localhost:5678/webhook/099bae8d-7d7d-49d7-8dbb-63d882e44153",
        },
      ]
    }
    return []
  },
}

export default nextConfig
