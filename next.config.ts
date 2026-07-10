import type { NextConfig } from "next";

const securityHeaders = [
  // HSTS — force HTTPS for 2 years, include subdomains, ready for preload
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Prevent clickjacking
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Referrer policy — only send origin to cross-origin, full to same-origin
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Lock down powerful APIs
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=(), interest-cohort=()",
  },
  // Cross-origin isolation headers for advanced Web Audio / SharedArrayBuffer
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
  // Content-Security-Policy — strict but permissive enough for dev + preview
  // - 'self' for scripts/styles/img/font/connect
  // - ws://localhost:3003 + wss for WebSocket feed
  // - data: for inline images (album art fallback)
  // - 'unsafe-inline' for styles (Tailwind + shadcn require it)
  // - report-uri to capture violations in our audit trail
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' ws://localhost:3003 wss://localhost:3003 ws: wss: https:",
      "media-src 'self' blob: https:",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "report-uri /api/v1/csp-report",
      "report-to rock887-csp",
    ].join("; "),
  },
  // Reporting API endpoint group (modern CSP reporting)
  {
    key: "Reporting-Endpoints",
    value: 'rock887-csp="/api/v1/csp-report"',
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: ["*.space-z.ai", "*.chatglm.cn"],
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
