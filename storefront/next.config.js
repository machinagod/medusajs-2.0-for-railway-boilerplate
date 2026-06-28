const checkEnvVariables = require("./check-env-variables")

checkEnvVariables()

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  // Pin the file-tracing root to this app so Next doesn't warn about inferring
  // the workspace root from sibling lockfiles outside the repo.
  outputFileTracingRoot: __dirname,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Next/image optimization is ON: the runner (`next start`) resizes source
    // images and serves modern formats via /_next/image, backed by `sharp`
    // (pinned as a prod dependency so it survives `pnpm prune --prod`).
    // WebP only — AVIF's encode cost isn't worth it given Railway's image cache
    // is ephemeral (re-optimizes after each redeploy/restart).
    formats: ["image/webp"],
    // Allowed `quality` values (Next 15.5 gates these): 50 = product thumbnails,
    // 75 = the default used everywhere else (e.g. the PDP gallery).
    qualities: [50, 75],
    // Product imagery is stable and content-addressed in storage, so cache
    // optimized variants aggressively to maximize reuse within a container's life.
    minimumCacheTTL: 2678400, // 31 days
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      ...(process.env.NEXT_PUBLIC_BASE_URL
        ? [{ // Note: needed to serve images from /public folder
            protocol: process.env.NEXT_PUBLIC_BASE_URL.startsWith("https") ? "https" : "http",
            hostname: process.env.NEXT_PUBLIC_BASE_URL.replace(/^https?:\/\//, ""),
          }]
        : []),
      ...(process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
        ? [{ // Note: only needed when using local-file for product media
            protocol: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL.startsWith("https") ? "https" : "http",
            hostname: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL.replace(/^https?:\/\//, ""),
          }]
        : []),
      { // Note: can be removed after deleting demo products
        protocol: "https",
        hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com",
      },
      { // Note: can be removed after deleting demo products
        protocol: "https",
        hostname: "medusa-server-testing.s3.amazonaws.com",
      },
      { // Note: can be removed after deleting demo products
        protocol: "https",
        hostname: "medusa-server-testing.s3.us-east-1.amazonaws.com",
      },
      ...(process.env.NEXT_PUBLIC_MINIO_ENDPOINT ? [{ // Note: needed when using MinIO bucket storage for media
        protocol: "https",
        hostname: process.env.NEXT_PUBLIC_MINIO_ENDPOINT,
      }] : []),
    ],
  },
}

module.exports = nextConfig
