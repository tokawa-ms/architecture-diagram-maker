import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

/**
 * Server-side MSAL (Entra ID) token validation.
 *
 * Validates an ID token issued by Azure AD / Entra ID and extracts the
 * user email from the token claims.  This prevents the X-User-Email
 * header spoofing vulnerability by ensuring the claimed identity is
 * backed by a cryptographically verified token.
 */

/**
 * Cache the JWKS function per tenant so we don't re-fetch on every request.
 */
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

const getJwks = (tenantId: string) => {
  const cached = jwksCache.get(tenantId);
  if (cached) return cached;
  const jwksUri = `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`;
  const jwks = createRemoteJWKSet(new URL(jwksUri));
  jwksCache.set(tenantId, jwks);
  return jwks;
};

export interface ValidatedMsalClaims {
  email: string;
  name?: string;
  tenantId?: string;
}

/**
 * Validate a MSAL ID token and extract user claims.
 *
 * @param token  The raw JWT (ID token) from the Authorization header.
 * @returns  Validated claims if the token is valid, or null.
 */
export const validateMsalToken = async (
  token: string,
): Promise<ValidatedMsalClaims | null> => {
  const clientId = process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID;
  const tenantId = process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID;

  if (!clientId || !tenantId) {
    console.error("[MSAL Validate] MSAL env vars not configured");
    return null;
  }

  try {
    const jwks = getJwks(tenantId);
    const issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`;

    const { payload } = await jwtVerify(token, jwks, {
      issuer,
      audience: clientId,
    });

    const email = extractEmail(payload);
    if (!email) {
      console.warn("[MSAL Validate] Token has no email / preferred_username / upn claim");
      return null;
    }

    return {
      email: email.toLowerCase(),
      name: typeof payload.name === "string" ? payload.name : undefined,
      tenantId: typeof payload.tid === "string" ? payload.tid : undefined,
    };
  } catch (error) {
    console.warn("[MSAL Validate] Token validation failed", error);
    return null;
  }
};

/**
 * Extract an email-like identifier from the token claims.
 * Azure AD tokens may include the email in several different claims.
 */
const extractEmail = (payload: JWTPayload): string | null => {
  // "email" claim (most common for personal & work accounts)
  if (typeof payload.email === "string" && payload.email.trim()) {
    return payload.email.trim();
  }
  // "preferred_username" claim (fallback)
  if (
    typeof payload.preferred_username === "string" &&
    payload.preferred_username.trim()
  ) {
    return payload.preferred_username.trim();
  }
  // "upn" (User Principal Name) claim
  if (typeof payload.upn === "string" && payload.upn.trim()) {
    return payload.upn.trim();
  }
  return null;
};
