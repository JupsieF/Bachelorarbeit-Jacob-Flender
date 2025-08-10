import supabase from "@/backend/api/backendConnection";

async function setNextWateringToPast() {
    const now = new Date();
    const past = new Date(now.getTime() - 10 * 1000).toISOString();

    // Prüfe, ob Einträge existieren
    const { data: schedules, error: selectError } = await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("plant_schedule")
        .select("id");

    if (selectError) {
        console.error("Fehler beim Laden der plant_schedule:", selectError);
        return;
    }
    if (!schedules || schedules.length === 0) {
        console.log("Keine Einträge in plant_schedule gefunden.");
        return;
    }

    // Update für alle IDs
    const ids = schedules.map((row) => row.id);
    const { error, data } = await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("plant_schedule")
        .update({ next_watering: past })
        .in("id", ids);

    if (error) {
        console.error("Fehler beim Aktualisieren von next_watering:", error);
    } else {
        console.log(
            `next_watering für ${ids.length} Einträge auf die Vergangenheit gesetzt:`,
            past
        );
    }
}

setNextWateringToPast();
