import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { AUTH_TOKEN_COOKIE, resolvePostLoginRedirect } from "@/lib/auth-redirect";

const PUBLIC_PATHS = new Set(["/login", "/register"]);

export function middleware(request: NextRequest) {
    const { pathname, search } = request.nextUrl;
    const isPublicPath = PUBLIC_PATHS.has(pathname);
    const hasToken = Boolean(request.cookies.get(AUTH_TOKEN_COOKIE)?.value);

    if (!hasToken && !isPublicPath) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/login";
        loginUrl.search = `?next=${encodeURIComponent(
            resolvePostLoginRedirect(`${pathname}${search}`),
        )}`;
        return NextResponse.redirect(loginUrl);
    }

    if (hasToken && isPublicPath) {
        const nextTarget = resolvePostLoginRedirect(request.nextUrl.searchParams.get("next"));
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = nextTarget;
        redirectUrl.search = "";
        return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
