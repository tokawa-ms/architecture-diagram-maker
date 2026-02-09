import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getSimpleAuthToken,
  isSimpleAuthEnabled,
  SIMPLE_AUTH_COOKIE,
} from "@/lib/simple-auth";
import { isMsalConfigured } from "@/lib/msal-config";

/**
 * Server-side auth guard.
 *
 * - When MSAL (Entra ID) is configured this component is a no-op because
 *   authentication is enforced entirely on the client side by
 *   `MsalAuthGuard`.
 * - When simple auth is configured (USER_NAME / USER_PASS), it checks the
 *   auth cookie and redirects to /login if missing / invalid.
 * - When neither is configured, children are rendered directly.
 */
export default async function RequireAuth({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // MSAL auth is handled client-side — skip server check.
  if (isMsalConfigured()) {
    return children;
  }

  if (isSimpleAuthEnabled()) {
    const expected = getSimpleAuthToken();
    const store = await cookies();
    const token = store.get(SIMPLE_AUTH_COOKIE)?.value;
    if (!expected || token !== expected) {
      redirect("/login");
    }
  }

  return children;
}
