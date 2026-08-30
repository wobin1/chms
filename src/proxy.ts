import { NextRequest, NextResponse } from "next/server";
import {
  isApiPath,
  isPublicPath,
  resolveAuthRedirect,
} from "@/lib/auth-gate";
import { readSessionToken, SESSION_COOKIE } from "@/lib/session";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await readSessionToken(token) : null;

  if (isApiPath(pathname)) {
    if (isPublicPath(pathname) || session) {
      return NextResponse.next();
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const redirectTo = resolveAuthRedirect(pathname, session);
  if (redirectTo) {
    const url = req.nextUrl.clone();
    url.pathname = redirectTo;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
