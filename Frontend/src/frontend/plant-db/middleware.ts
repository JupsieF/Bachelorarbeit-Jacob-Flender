import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const isAuthRoute =
        pathname.startsWith("/login") || pathname.startsWith("/api/auth");
    const hasAuth = req.cookies.get("auth")?.value === "true";

    if (!hasAuth && !isAuthRoute) {
        const loginUrl = req.nextUrl.clone();
        loginUrl.pathname = "/login";
        return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
