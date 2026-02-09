import { NextResponse } from "next/server";
import {
  buildSimpleAuthVirtualEmail,
  getAuthCookieOptions,
  getSimpleAuthToken,
  isSimpleAuthEnabled,
  SIMPLE_AUTH_COOKIE,
  SIMPLE_AUTH_EMAIL_COOKIE,
} from "@/lib/simple-auth";

export const runtime = "nodejs";

const getLoginRedirect = (request: Request, options?: { error?: boolean; lang?: string }) => {
  const url = new URL("/login", request.url);
  if (options?.lang) {
    url.searchParams.set("lang", options.lang);
  }
  if (options?.error) {
    url.searchParams.set("error", "1");
  }
  return url;
};

export async function POST(request: Request) {
  if (!isSimpleAuthEnabled()) {
    return NextResponse.redirect(new URL("/", request.url), { status: 303 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch (error) {
    console.error("Failed to parse login payload", error);
    return NextResponse.redirect(getLoginRedirect(request, { error: true }), {
      status: 303,
    });
  }

  const username = String(form.get("username") ?? "");
  const password = String(form.get("password") ?? "");
  const lang = form.get("lang");
  const langValue = typeof lang === "string" ? lang : undefined;

  if (username !== process.env.USER_NAME || password !== process.env.USER_PASS) {
    return NextResponse.redirect(
      getLoginRedirect(request, { error: true, lang: langValue }),
      { status: 303 },
    );
  }

  const token = getSimpleAuthToken();
  if (!token) {
    return NextResponse.redirect(new URL("/", request.url), { status: 303 });
  }

  const response = NextResponse.redirect(new URL("/", request.url), {
    status: 303,
  });
  response.cookies.set(SIMPLE_AUTH_COOKIE, token, getAuthCookieOptions());
  // Set the virtual email cookie (readable by client JS for localStorage scoping).
  response.cookies.set(SIMPLE_AUTH_EMAIL_COOKIE, buildSimpleAuthVirtualEmail(username), {
    ...getAuthCookieOptions(),
    httpOnly: false, // client needs to read this
  });
  return response;
}
