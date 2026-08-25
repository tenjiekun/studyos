import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better development practices
  reactStrictMode: true,

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "**.supabase.in",
      },
    ],
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://checkout.razorpay.com https://*.razorpay.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' blob: data: https://*.supabase.co https://*.supabase.in",
              "media-src 'self' blob: data: https://*.supabase.co https://*.supabase.in",
              "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://*.vercel.app https://*.vercel.com https://vercel.com https://api.razorpay.com https://*.razorpay.com https://lumberjack.razorpay.com",
              "font-src 'self'",
              "frame-src 'self' https://api.razorpay.com https://*.razorpay.com",
            ].join("; "),
          },
        ],
      },
    ];
  },

  // PWA service worker - allow sw.js at root
  async rewrites() {
    return [];
  },
};

export default nextConfig;
