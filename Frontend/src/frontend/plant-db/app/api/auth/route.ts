import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const { password } = await request.json();

    if (password === process.env.AUTH_PASSWORD) {
        const res = NextResponse.json({
            message: "Erfolgreich authentifiziert",
        });
        // HTTP-only Cookie setzen
        res.cookies.set("auth", "true", {
            httpOnly: true,
            path: "/",
            maxAge: 60 * 30, // 30 min
        });
        return res;
    }

    return NextResponse.json(
        { message: "Ungültiges Passwort" },
        { status: 401 }
    );
}
