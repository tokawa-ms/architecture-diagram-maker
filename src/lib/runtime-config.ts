/**
 * Runtime configuration bridge for NEXT_PUBLIC_* environment variables.
 *
 * Problem:
 *   Next.js inlines NEXT_PUBLIC_* values into the client bundle at BUILD time.
 *   When the Docker image is built without those values, the client-side
 *   code receives empty strings — even if the environment variables are
 *   correctly set at container runtime on Azure Container Apps.
 *
 * Solution:
 *   The root Server Component (layout.tsx) reads the env vars at request
 *   time and injects them into a <script> tag as `window.__RUNTIME_CONFIG__`.
 *   Client components read from that object instead of `process.env`.
 *
 * On the server side, `process.env` is always read directly (it reflects
 * actual runtime values).
 */

export interface RuntimeConfig {
  NEXT_PUBLIC_AZURE_AD_CLIENT_ID: string;
  NEXT_PUBLIC_AZURE_AD_TENANT_ID: string;
  NEXT_PUBLIC_AZURE_AD_REDIRECT_URI: string;
  NEXT_PUBLIC_SIMPLE_AUTH_ENABLED: string;
}

declare global {
  interface Window {
    __RUNTIME_CONFIG__?: RuntimeConfig;
  }
}

/**
 * Build the config object on the server side (for injection into HTML).
 * Call this ONLY from Server Components / Route Handlers.
 */
export const buildRuntimeConfig = (): RuntimeConfig => ({
  NEXT_PUBLIC_AZURE_AD_CLIENT_ID:
    process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID ?? "",
  NEXT_PUBLIC_AZURE_AD_TENANT_ID:
    process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID ?? "",
  NEXT_PUBLIC_AZURE_AD_REDIRECT_URI:
    process.env.NEXT_PUBLIC_AZURE_AD_REDIRECT_URI ?? "",
  NEXT_PUBLIC_SIMPLE_AUTH_ENABLED:
    process.env.NEXT_PUBLIC_SIMPLE_AUTH_ENABLED ?? "false",
});

/**
 * Read a runtime config value.
 *
 * - Server: reads `process.env` directly (always fresh).
 * - Client: reads `window.__RUNTIME_CONFIG__` first, falls back to
 *   `process.env` (which may be a build-time snapshot).
 */
export const getRuntimeConfigValue = (
  key: keyof RuntimeConfig,
): string => {
  // Server-side — use process.env directly
  if (typeof window === "undefined") {
    return (process.env[key] as string) ?? "";
  }

  // Client-side — prefer the injected runtime config
  if (window.__RUNTIME_CONFIG__ && key in window.__RUNTIME_CONFIG__) {
    return window.__RUNTIME_CONFIG__[key];
  }

  // Fallback to build-time value (works in local dev where env is set
  // at build time via `next dev`).
  return (process.env[key] as string) ?? "";
};
