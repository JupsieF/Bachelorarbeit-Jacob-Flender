import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/utils/supabase";
import {
    plantInsertSchema,
    plantUpdateSchema,
    plantDeleteSchema,
} from "@/utils/plantValidation";

export async function POST(req: NextRequest) {
    const body = await req.json();
    const parse = plantInsertSchema.safeParse(body);
    if (!parse.success) {
        return NextResponse.json(
            { error: "Ungültige Daten", details: parse.error },
            { status: 400 }
        );
    }
    const { data, error } = await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("plant")
        .insert([parse.data])
        .select();
    if (error || !data || !data[0]) {
        return NextResponse.json(
            { error: error?.message || "Fehler beim Anlegen der Pflanze" },
            { status: 500 }
        );
    }

    const plantId = data[0].id;
    const now = new Date().toISOString();
    const { error: scheduleError } = await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("plant_schedule")
        .insert([
            { plant_id: plantId, last_watered: null, next_watering: now },
        ]);
    if (scheduleError) {
        return NextResponse.json(
            { error: scheduleError.message },
            { status: 500 }
        );
    }

    return NextResponse.json({ data });
}

export async function GET(req: NextRequest) {
    const { data, error } = await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("plant")
        .select("id, name, image_url, size, location_id, location(name)");
    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const parse = plantUpdateSchema.safeParse(body);
        if (!parse.success) {
            return NextResponse.json(
                { error: "Ungültige Daten", details: parse.error },
                { status: 400 }
            );
        }
        const { id, ...update } = parse.data;
        const { error } = await supabase
            .schema("bachelor_baseplant_jacob_flender")
            .from("plant")
            .update(update)
            .eq("id", id);
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const body = await req.json();
    const parse = plantDeleteSchema.safeParse(body);
    if (!parse.success) {
        return NextResponse.json(
            { error: "Ungültige Daten", details: parse.error },
            { status: 400 }
        );
    }
    const { id } = parse.data;

    const { error: scheduleError } = await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("plant_schedule")
        .delete()
        .eq("plant_id", id);
    if (scheduleError) {
        return NextResponse.json(
            { error: scheduleError.message },
            { status: 500 }
        );
    }

    const { error } = await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("plant")
        .delete()
        .eq("id", id);
    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
