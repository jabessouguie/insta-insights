import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.cdninstagram.com",
      },
      {
        protocol: "https",
        hostname: "*.instagram.com",
      },
      {
        protocol: "https",
        hostname: "ui-avatars.com",
      },
    ],
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "img-src 'self' data: blob: https://*.cdninstagram.com https://ui-avatars.com",
            "font-src 'self' https://fonts.gstatic.com",
            "connect-src 'self' https://generativelanguage.googleapis.com https://ui-avatars.com https://fonts.googleapis.com https://fonts.gstatic.com https://*.sentry.io https://unpkg.com",
            "worker-src 'self' blob:",
            "media-src 'self' data: blob:",
          ].join("; "),
        },
      ],
    },
  ],
};

export default withSentryConfig(nextConfig, {
  silent: !process.env.SENTRY_AUTH_TOKEN,
  hideSourceMaps: true,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  webpack: {
    autoInstrumentServerFunctions: !!process.env.SENTRY_DSN,
    treeshake: { removeDebugLogging: true },
  },
});
