"use client";

import { useEffect, useState, type ReactNode } from "react";
import { MsalProvider } from "@azure/msal-react";
import type { PublicClientApplication } from "@azure/msal-browser";
import { getMsalInstance, isMsalConfigured } from "@/lib/msal-config";

interface MsalAuthProviderProps {
  children: ReactNode;
}

/**
 * Wraps children with the MSAL `MsalProvider` when Entra ID settings are
 * configured.  When MSAL is not configured this is a transparent pass-through.
 *
 * MSAL initialisation (handleRedirectPromise) is performed lazily in an
 * effect so it never blocks SSR.
 */
export default function MsalAuthProvider({ children }: MsalAuthProviderProps) {
  const [instance, setInstance] = useState<PublicClientApplication | null>(null);
  const [ready, setReady] = useState(!isMsalConfigured());

  useEffect(() => {
    if (!isMsalConfigured()) {
      setReady(true);
      return;
    }

    const pca = getMsalInstance();
    if (!pca) {
      setReady(true);
      return;
    }

    pca
      .initialize()
      .then(() => {
        // handleRedirectPromise picks up the auth response after a
        // loginRedirect round-trip.  It resolves to null on normal
        // page loads (no redirect response in the URL hash).
        return pca.handleRedirectPromise();
      })
      .then((response) => {
        // If we got an auth response, set the active account so later
        // calls (e.g. acquireTokenSilent) know which account to use.
        if (response?.account) {
          pca.setActiveAccount(response.account);
        }
        setInstance(pca);
        setReady(true);
      })
      .catch((error) => {
        console.error("[MSAL] Initialization failed", error);
        // Still render children so the app is usable; MSAL guard will
        // show the sign-in prompt.
        setReady(true);
      });
  }, []);

  if (!ready) {
    // Show a minimal loading state while MSAL initialises.
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-400">Initializing…</p>
      </div>
    );
  }

  if (instance) {
    return <MsalProvider instance={instance}>{children}</MsalProvider>;
  }

  // MSAL not configured — just render children.
  return <>{children}</>;
}
