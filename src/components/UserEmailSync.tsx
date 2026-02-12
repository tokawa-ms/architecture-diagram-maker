"use client";

import { useEffect, type ReactNode } from "react";
import { useMsalAuth } from "@/components/useMsalAuth";
import {
  setCurrentUserEmail,
  setCurrentMsalIdToken,
  resolveVirtualEmail,
} from "@/lib/storage";

/**
 * Synchronises the module-level `currentUserEmail` in storage.ts with the
 * correct value every time auth state changes.
 *
 * Note: the MSAL ID token is now acquired on-demand inside `fetchApi`
 * (storage.ts) via `acquireTokenSilent`, so this component no longer
 * needs to pre-fetch or gate on the token.  The `currentMsalIdToken`
 * module variable is kept as a fallback but is NOT the primary source.
 */
export default function UserEmailSync({ children }: Readonly<{ children: ReactNode }>) {
  const { email: msalEmail, idToken: cachedIdToken } = useMsalAuth();

  useEffect(() => {
    setCurrentUserEmail(resolveVirtualEmail(msalEmail));
    // Store cached token as a fallback; fetchApi will prefer on-demand
    // acquisition from the MSAL instance directly.
    setCurrentMsalIdToken(cachedIdToken);
  }, [msalEmail, cachedIdToken]);

  return <>{children}</>;
}
