import { NextResponse } from "next/server";
import {
  getAuthCookieOptions,
  isSimpleAuthEnabled,
  SIMPLE_AUTH_COOKIE,
} from "@/lib/simple-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const url = new URL("/login", request.url);
  if (!isSimpleAuthEnabled()) {
    return NextResponse.redirect(new URL("/", request.url), { status: 303 });
  }

  let lang: string | null = null;
  try {
    const form = await request.formData();
    const raw = form.get("lang");
    if (typeof raw === "string" && raw.length > 0) {
      lang = raw;
    }
  } catch (error) {
    console.error("Failed to parse logout payload", error);
  }

  if (lang) {
    url.searchParams.set("lang", lang);
  }

  const response = NextResponse.redirect(url, { status: 303 });
  response.cookies.set(SIMPLE_AUTH_COOKIE, "", {
    ...getAuthCookieOptions(),
    maxAge: 0,
  });
  return response;
}
