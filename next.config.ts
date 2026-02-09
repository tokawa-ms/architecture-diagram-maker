import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Expose a derived flag so client code can know whether SimpleAuth is
  // configured, without leaking the actual credentials.  The values of
  // USER_NAME / USER_PASS are server-only env vars; this just publishes
  // a boolean "true"/"false" string at build time.
  env: {
    NEXT_PUBLIC_SIMPLE_AUTH_ENABLED:
      process.env.USER_NAME && process.env.USER_PASS ? "true" : "false",
  },
  async redirects() {
    return [
      {
        source: "/protected/:path*",
        destination: "/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
