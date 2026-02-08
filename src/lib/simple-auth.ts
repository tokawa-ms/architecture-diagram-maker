import crypto from "node:crypto";

export const SIMPLE_AUTH_COOKIE = "simple_auth";
const SIMPLE_AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export const isSimpleAuthEnabled = () => {
  return Boolean(process.env.USER_NAME && process.env.USER_PASS);
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
