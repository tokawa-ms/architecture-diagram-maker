"use client";

import { useCallback, useMemo } from "react";
import {
  useIsAuthenticated,
  useMsal,
} from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import { isMsalConfigured, loginRequest } from "@/lib/msal-config";

export interface MsalAuthState {
  /** Whether MSAL-based auth is enabled in the environment. */
  msalEnabled: boolean;
  /** Whether the user is currently authenticated via MSAL. */
  isAuthenticated: boolean;
  /** Whether MSAL is still processing (redirect / ssoSilent). */
  inProgress: boolean;
  /** Display name of the logged-in user (if any). */
  displayName: string | null;
  /** Email / UPN of the logged-in user (if any). */
  email: string | null;
  /** Tenant ID of the logged-in user (if any). */
  tenantId: string | null;
  /** The raw MSAL ID token for server-side validation. */
  idToken: string | null;
  /** Trigger an interactive MSAL login (redirect). */
  login: () => Promise<void>;
  /** Trigger MSAL logout (redirect). */
  logout: () => Promise<void>;
}

/**
 * Hook that provides MSAL authentication state and actions.
 *
 * When MSAL is not configured this hook still returns a valid (no-op) object
 * so consuming components do not need to check for the provider.
 */
export const useMsalAuth = (): MsalAuthState => {
  const msalEnabled = isMsalConfigured();

  // `useMsal` and `useIsAuthenticated` are safe to call unconditionally
  // because the component tree is always wrapped by `MsalAuthProvider`,
  // which either provides a real MsalProvider or renders children directly.
  // When no provider is present the hooks return default (unauthenticated)
  // values.  We guard actual usage with the `msalEnabled` flag.
  let isAuthenticated = false;
  let inProgress = false;
  let accounts: Array<{ name?: string; username?: string; tenantId?: string; idToken?: string }> = [];

  // We need to try/catch because if MsalProvider is not in the tree, the
  // hooks will throw.
  let msalInstance: ReturnType<typeof useMsal> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    msalInstance = useMsal();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    isAuthenticated = useIsAuthenticated();
    inProgress = msalInstance.inProgress !== InteractionStatus.None;
    accounts = msalInstance.accounts;
  } catch {
    // MsalProvider not available — MSAL not configured.
  }

  const account = accounts.length > 0 ? accounts[0] : null;

  const displayName = useMemo(
    () => (msalEnabled && account?.name ? account.name : null),
    [msalEnabled, account],
  );

  const email = useMemo(
    () => (msalEnabled && account?.username ? account.username : null),
    [msalEnabled, account],
  );

  const tenantId = useMemo(
    () => (msalEnabled && account?.tenantId ? account.tenantId : null),
    [msalEnabled, account],
  );

  const idToken = useMemo(
    () => (msalEnabled && account?.idToken ? account.idToken : null),
    [msalEnabled, account],
  );

  const login = useCallback(async () => {
    if (!msalEnabled || !msalInstance) return;
    try {
      await msalInstance.instance.loginRedirect(loginRequest);
    } catch (error) {
      console.error("[MSAL] Login failed", error);
    }
  }, [msalEnabled, msalInstance]);

  const logout = useCallback(async () => {
    if (!msalEnabled || !msalInstance) return;
    try {
      await msalInstance.instance.logoutRedirect();
    } catch (error) {
      console.error("[MSAL] Logout failed", error);
    }
  }, [msalEnabled, msalInstance]);

  return {
    msalEnabled,
    isAuthenticated: msalEnabled ? isAuthenticated : false,
    inProgress: msalEnabled ? inProgress : false,
    displayName,
    email,
    tenantId,
    idToken,
    login,
    logout,
  };
};
