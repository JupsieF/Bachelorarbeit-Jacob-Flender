import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const id = body.id;
        if (typeof id !== "number" && typeof id !== "string") {
            return NextResponse.json(
                { error: "Ungültige ID" },
                { status: 400 }
            );
        }
        const plantId = Number(id);
        if (isNaN(plantId)) {
            return NextResponse.json(
                { error: "Ungültige ID" },
                { status: 400 }
            );
        }
        if (!body.image_url) {
            return NextResponse.json(
                { error: "Keine Bild-URL übermittelt" },
                { status: 400 }
            );
        }

        const { error } = await supabaseAdmin
            .schema("bachelor_baseplant_jacob_flender")
            .from("plant")
            .update({ image_url: body.image_url })
            .eq("id", plantId);

        if (error) {
            return NextResponse.json(
                { error: "Datenbankfehler: " + error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json(
            { error: "Server-Fehler: " + (error.message || String(error)) },
            { status: 500 }
        );
    }
}
