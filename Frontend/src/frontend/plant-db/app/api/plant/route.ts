import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/utils/supabase";
import {
    plantInstanceInsertSchema,
    plantUpdateSchema,
} from "@/utils/plantValidation";

export async function POST(req: NextRequest) {
    const body = await req.json();
    const parse = plantInstanceInsertSchema.safeParse(body);
    if (!parse.success) {
        return NextResponse.json(
            { error: "Ungültige Daten", details: parse.error },
            { status: 400 }
        );
    }

    
    const { name } = parse.data;
    const { data: existing, error: checkError } = await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("plant_care")
        .select("id")
        .ilike("name", name.trim()); 

    if (checkError) {
        return NextResponse.json(
            { error: checkError.message },
            { status: 500 }
        );
    }
    if (existing && existing.length > 0) {
        return NextResponse.json(
            { error: `Die Pflanzenart "${name}" existiert bereits.` },
            { status: 400 }
        );
    }

    
    const {
        method,
        interval,
        volume,
        name: artName,
        ...plantData
    } = parse.data;
    const { data: careData, error: careError } = await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("plant_care")
        .insert([{ name: artName, method, interval, volume }])
        .select();

    if (careError || !careData || !careData[0]) {
        return NextResponse.json(
            {
                error:
                    careError?.message ||
                    "Fehler beim Anlegen des Pflegeprofils",
            },
            { status: 500 }
        );
    }


    const care_id = careData[0].id;
    const { data: plant, error: plantError } = await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("plant")
        .insert([
            {
                name: artName,
                location_id: plantData.location_id,
                care_id,
                size: plantData.size,
                image_url: plantData.image_url ?? null,
            },
        ])
        .select();

    if (plantError || !plant || !plant[0]) {
        return NextResponse.json(
            { error: plantError?.message || "Fehler beim Anlegen der Pflanze" },
            { status: 500 }
        );
    }

    
    const plantId = plant[0].id;
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

    return NextResponse.json({ data: plant });
}

export async function GET(req: NextRequest) {
  const { data, error } = await supabase
    .schema("bachelor_baseplant_jacob_flender")
    .from("plant")
    .select("id, name, image_url, size, location_id, care_id, location(id, name, floor)");

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
