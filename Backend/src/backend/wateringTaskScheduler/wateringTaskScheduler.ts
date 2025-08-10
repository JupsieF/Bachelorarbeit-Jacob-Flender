import { createClient } from "@supabase/supabase-js";
import { Database } from "../../../supabase/database.types";

const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
);

/**
 * Prüft alle Pflanzen in Plant_Schedule, ob sie bewässerungsfällig sind,
 * und legt ggf. einen neuen watering_task an.
 */
export async function scheduleDueWateringTasks() {
    const now = new Date().toISOString();

    // 1. Fällige Pflanzen abfragen
    const { data: duePlants, error } = await supabase
    .schema("bachelor_baseplant_jacob_flender")
        .from("plant_schedule")
        .select("id, plant_id, next_watering")
        .lt("next_watering", now);

    if (error) {
        console.error("Error fetching due plants:", error);
        return;
    }
    if (!duePlants || duePlants.length === 0) {
        console.log("Keine fälligen Pflanzen gefunden.");
        return;
    }

    // 2. Bereits existierende Tasks abfragen (nur offene)
    const plantIDs = duePlants.map((p) => p.plant_id);
    const { data: existingTasks, error: taskError } = await supabase
    .schema("bachelor_baseplant_jacob_flender")
        .from("watering_task")
        .select("plant_id, status")
        .in("plant_id", plantIDs)
        .in("status", ["pending", "assigned"]);

    if (taskError) {
        console.error("Error fetching existing watering tasks:", taskError);
        return;
    }
    const existingPlantIDs = new Set((existingTasks ?? []).map((t) => t.plant_id));

    // 3. Neue Tasks für Pflanzen anlegen, die noch keinen offenen Task haben
    const newTasks = duePlants
        .filter((p) => !existingPlantIDs.has(p.plant_id))
        .map((p) => ({
            plant_id: p.plant_id,
            created_at: now,
            status: "pending",
        }));

    if (newTasks.length === 0) {
        console.log("Keine neuen watering_tasks anzulegen.");
        return;
    }

    const { error: insertError } = await supabase
    .schema("bachelor_baseplant_jacob_flender")
        .from("watering_task")
        .insert(newTasks);

    if (insertError) {
        console.error("Fehler beim Anlegen neuer watering_tasks:", insertError);
    } else {
        console.log(`Neue watering_tasks angelegt: ${newTasks.length}`);
    }
}