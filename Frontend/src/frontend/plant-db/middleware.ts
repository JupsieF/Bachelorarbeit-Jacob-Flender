import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware-Funktion für die Authentifizierung von Anfragen.
 *
 * Überprüft, ob der Benutzer authentifiziert ist, indem das "auth"-Cookie ausgewertet wird.
 * Falls der Benutzer nicht authentifiziert ist und die angeforderte Route keine Authentifizierungsroute ist,
 * wird der Benutzer zur Login-Seite weitergeleitet.
 *
 * @param req - Die eingehende Next.js-Anfrage.
 * @returns Eine Weiterleitung zur Login-Seite, falls nicht authentifiziert, ansonsten die nächste Middleware/Route.
 */
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
