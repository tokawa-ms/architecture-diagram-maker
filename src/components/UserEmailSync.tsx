"use client";

import { useEffect, type ReactNode } from "react";
import { useMsalAuth } from "@/components/useMsalAuth";
import { setCurrentUserEmail, setCurrentMsalIdToken, resolveVirtualEmail } from "@/lib/storage";

/**
 * Synchronises the module-level `currentUserEmail` and `currentMsalIdToken`
 * in storage.ts with the correct values every time auth state changes.
 *
 * Placed once in the protected layout so that ALL protected pages
 * automatically have the user email and token set before they render.
 */
export default function UserEmailSync({ children }: Readonly<{ children: ReactNode }>) {
  const { email: msalEmail, idToken } = useMsalAuth();

  useEffect(() => {
    setCurrentUserEmail(resolveVirtualEmail(msalEmail));
    setCurrentMsalIdToken(idToken);
  }, [msalEmail, idToken]);

  return <>{children}</>;
}
