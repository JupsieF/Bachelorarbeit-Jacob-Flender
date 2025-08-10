import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { plant_id, interval, method } = body;

        const now = new Date();
        const nextWateringDate = new Date();
        nextWateringDate.setDate(now.getDate());

        const { data, error } = await supabaseAdmin
            .schema("bachelor_baseplant_jacob_flender")
            .from("watering_task")
            .insert([
                {
                    plant_id,
                    created_at: now.toISOString(),
                    status: "pending",
                    assigned_user_id: null,
                    candidate_user_ids: null,
                    notified_at: null,
                    reminder_at: null
                }
            ])
            .select()
            .single();

        if (error) {
            console.error("[watering-task] Insert error:", error);
            return NextResponse.json(
                { error: "Fehler beim Anlegen der Gießaufgabe: " + error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error("[watering-task] Unexpected error:", error);
        return NextResponse.json(
            { error: "Server-Fehler: " + error.message },
            { status: 500 }
        );
    }
}