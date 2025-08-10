import supabase from "@/backend/api/backendConnection";
import { createFastLookUpView } from "@/backend/api/supabaseService";

async function resetAllAssignments() {
    const { error } = await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("watering_task")
        .update({ assigned_user_id: null, status: "pending", candidate_user_ids: null })
        .is("assigned_user_id", null);

    if (error) {
        console.error("Fehler beim Zurücksetzen der Assignments:", error);
        return;
    }
    console.log("Alle Assignments wurden zurückgesetzt.");

    await createFastLookUpView();
    console.log("watering_task_view wurde aktualisiert.");
}

async function resetAllAssignments1() {
    const { error } = await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("watering_task")
        .update({ assigned_user_id: null, status: "pending", candidate_user_ids: null })
        .gt("assigned_user_id", 0);

    if (error) {
        console.error("Fehler beim Zurücksetzen der Assignments:", error);
        return;
    }
    console.log("Alle Assignments wurden zurückgesetzt.");

    await createFastLookUpView();
    console.log("watering_task_view wurde aktualisiert.");
}

resetAllAssignments();
resetAllAssignments1();