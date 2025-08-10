import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/utils/supabase";

// GET: prüft, ob eine Pflanzenart mit dem Namen existiert
export async function GET(req: NextRequest) {
    const name = req.nextUrl.searchParams.get("name");
    if (!name) {
        return NextResponse.json({ error: "Name fehlt" }, { status: 400 });
    }
    const { count, error } = await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("plant_care")
        .select("id", { count: "exact", head: true })
        .eq("name", name);
    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ count });
}
