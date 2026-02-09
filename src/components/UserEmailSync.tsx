"use client";

import { useEffect, type ReactNode } from "react";
import { useMsalAuth } from "@/components/useMsalAuth";
import { setCurrentUserEmail, resolveVirtualEmail } from "@/lib/storage";

/**
 * Synchronises the module-level `currentUserEmail` in storage.ts
 * with the correct virtual email every time auth state changes.
 *
 * Placed once in the protected layout so that ALL protected pages
 * automatically have the user email set before they render.
 */
export default function UserEmailSync({ children }: Readonly<{ children: ReactNode }>) {
  const { email: msalEmail } = useMsalAuth();

  useEffect(() => {
    setCurrentUserEmail(resolveVirtualEmail(msalEmail));
  }, [msalEmail]);

  return <>{children}</>;
}
