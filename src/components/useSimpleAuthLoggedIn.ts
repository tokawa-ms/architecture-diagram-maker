"use client";

import { useEffect, useState } from "react";
import { isSimpleAuthLoggedIn } from "@/lib/storage";

/**
 * Whether SimpleAuth is enabled in the current build.
 * Derived from server-only USER_NAME / USER_PASS at build time via
 * next.config.ts `env` setting.
 */
const isSimpleAuthEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_SIMPLE_AUTH_ENABLED === "true";

/**
 * SSR-safe hook that returns `true` when the user is logged in via SimpleAuth.
 *
 * - If SimpleAuth is not enabled in the build, always returns `false`.
 * - During SSR / initial hydration it returns `false` to avoid hydration
 *   mismatches (the server has no access to `document.cookie`).
 * - After mount it checks the `simple_auth_email` cookie and updates.
 */
export const useSimpleAuthLoggedIn = (): boolean => {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    if (isSimpleAuthEnabled()) {
      setLoggedIn(isSimpleAuthLoggedIn());
    }
  }, []);

  return loggedIn;
};
