import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/utils/supabase";

export async function GET(req: NextRequest) {
    try {
        const { data, error } = await supabase
            .schema("bachelor_baseplant_jacob_flender")
            .from("location")
            .select("id, name, floor")
            .order("floor", { ascending: true });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json(
            { error: "Serverfehler beim Laden der Standorte" },
            { status: 500 }
        );
    }
}
