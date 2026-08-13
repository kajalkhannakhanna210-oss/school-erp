const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: (() => {
      const scriptSrc = process.env.NODE_ENV !== 'production'
        ? "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com 'unsafe-eval'"
        : "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com";

      return [
        "default-src 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'self'",
        "object-src 'none'",
        scriptSrc,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https://*.supabase.co",
        "media-src 'self'",
        "font-src 'self' data:",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com",
        "frame-src 'self' https://www.google.com https://checkout.razorpay.com",
        "upgrade-insecure-requests",
      ].join("; ");
    })(),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
