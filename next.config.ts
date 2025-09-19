import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
        port: "",
        pathname: "/**",
      },
    ],
    dangerouslyAllowSVG: true,
  },
  "crons": [
    {
      "path": "/cron/multilink",
      "schedule": "*/5 * * * *",
      "headers": {
        "Authorization": "Bearer ${CRON_SECRET}"
      }
    }
  ]
};

export default nextConfig;
