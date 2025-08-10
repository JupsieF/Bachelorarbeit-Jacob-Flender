import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/utils/supabase";
import { plantCareUpdateSchema } from "@/utils/plantValidation";

// GET: Alle Pflegeprofile abrufen
export async function GET(req: NextRequest) {
    const { data, error } = await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("plant_care")
        .select("id, name, interval, method, volume");
    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data });
}

// PATCH: Pflegeprofil aktualisieren
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, ...updates } = body;
        const parse = plantCareUpdateSchema.safeParse({ id, ...updates });
        if (!parse.success) {
            return NextResponse.json(
                { error: "Ungültige Daten", details: parse.error },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .schema("bachelor_baseplant_jacob_flender")
            .from("plant_care")
            .update(updates)
            .eq("id", id);
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (updates.name) {
            const { error: plantError } = await supabase
                .schema("bachelor_baseplant_jacob_flender")
                .from("plant")
                .update({ name: updates.name })
                .eq("care_id", id);
            if (plantError) {
                return NextResponse.json(
                    { error: plantError.message },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
    }
}

// DELETE: Pflegeprofil löschen
export async function DELETE(req: NextRequest) {
    try {
        const body = await req.json();
        const { id } = body;
        if (typeof id !== "number") {
            return NextResponse.json(
                { error: "Ungültige ID" },
                { status: 400 }
            );
        }
        const { error } = await supabase
            .schema("bachelor_baseplant_jacob_flender")
            .from("plant_care")
            .delete()
            .eq("id", id);
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
    }
}
