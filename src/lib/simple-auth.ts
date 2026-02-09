import crypto from "node:crypto";

export const SIMPLE_AUTH_COOKIE = "simple_auth";
export const SIMPLE_AUTH_EMAIL_COOKIE = "simple_auth_email";
const SIMPLE_AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

/** Domain suffix for SimpleAuth virtual emails (RFC 2606 reserved). */
const SIMPLE_AUTH_DOMAIN = "simple-auth.local";
/** Fixed virtual email for completely unauthenticated (no-auth) users. */
export const ANONYMOUS_VIRTUAL_EMAIL = "anonymous@anonymous.local";

export const isSimpleAuthEnabled = () => {
  return Boolean(process.env.USER_NAME && process.env.USER_PASS);
};

/**
 * Build a virtual email address for a SimpleAuth user.
 * Uses an RFC 2606 reserved domain so it can never collide with real emails.
 */
export const buildSimpleAuthVirtualEmail = (username: string): string =>
  `${username.toLowerCase()}@${SIMPLE_AUTH_DOMAIN}`;

/**
 * Return the virtual email for the current SimpleAuth user
 * (derived from the USER_NAME env var), or null if SimpleAuth is not enabled.
 */
export const getSimpleAuthVirtualEmail = (): string | null => {
  if (!isSimpleAuthEnabled()) return null;
  const username = process.env.USER_NAME ?? "user";
  return buildSimpleAuthVirtualEmail(username);
};

export const getSimpleAuthToken = () => {
  if (!isSimpleAuthEnabled()) return null;
  const username = process.env.USER_NAME ?? "";
  const password = process.env.USER_PASS ?? "";
  const payload = `${username}:${password}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
};

const parseCookieHeader = (value: string) => {
  const entries = value
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const index = part.indexOf("=");
      if (index === -1) return [part, ""] as const;
      return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))] as const;
    });
  return new Map(entries);
};

export const isRequestAuthenticated = (request: Request) => {
  const expected = getSimpleAuthToken();
  if (!expected) return true;
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = parseCookieHeader(cookieHeader);
  return cookies.get(SIMPLE_AUTH_COOKIE) === expected;
};

export const getAuthCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: SIMPLE_AUTH_COOKIE_MAX_AGE,
  path: "/",
});
