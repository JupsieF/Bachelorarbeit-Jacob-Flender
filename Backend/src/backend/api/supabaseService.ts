/* 
Diese Datei enthält Funktionen, die mit der Supabase-Datenbank interagieren.
Sie ist für alle API-Endpunkte zuständig, die Daten aus der Supabase-Datenbank abrufen oder aktualisieren.
*/

import supabase from "./backendConnection";
import { supabaseAdmin } from "./supabaseAdminConnection";
import { WateringTask } from "../../shared/types/task";
import { UserDetails } from "../../shared/types/user";
import { DistancePair } from "../../shared/types/locationData";
import { app } from "./slackConnection";

async function cli() {
    const args = process.argv.slice(2);
    if (args.includes("--view")) {
        await createFastLookUpView();
        process.exit(0);
    }
}

// CLI-Dispatcher für den Aufruf per tsx
if (
    import.meta.url ===
    `file://${process.cwd()}/src/backend/api/supabaseService.ts`
) {
    cli();
}

/**
 * Hole UserDetails aus der DB anhand der Employee-ID.
 */
export async function getUserDetailsByEmployeeId(
    employeeId: number
): Promise<UserDetails | null> {
    const { data, error } = await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("employee")
        .select("id, mail, slack_id, real_name")
        .eq("id", employeeId)
        .maybeSingle();

    if (error || !data) return null;

    return {
        id: String(data.id),
        email: data.mail ?? "",
        slackID: data.slack_id ?? "",
        firstName: data.real_name ?? "",
        lastName: "",
        employeeId: data.id,
    };
}

export async function fetchEmployeesFromSupabase() {
    const { data: employees, error } = await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("employee")
        .select("id, mail, slack_id");

    if (error) {
        console.error("Fehler beim Abrufen der Employee-Daten:", error);
        return employees;
    }
}
// 1.
/**
 * Erstellt den watering_task_view, falls er noch nicht existiert.
 */
export async function createFastLookUpView(): Promise<void> {
    try {
        const { error } = await supabaseAdmin
            .schema("bachelor_baseplant_jacob_flender")
            .rpc("createfastlookupview");
        if (error) throw error;
        // Debugging: console.log("watering_task_view wurde angelegt.");
    } catch (error) {
        console.error("Fehler beim Erstellen der View:", error);
    }
}

// 2.
/**
 * Prüft, welche Pflanzen bewässerungsfällig sind, und fügt sie in die watering_task-Tabelle ein.
 */
export async function processDuePlantSchedules() {
    const now = new Date().toISOString();

    // Schritt 1: Hole nur die relevanten Felder aus plant_schedule
    const { data: duePlants, error } = await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("plant_schedule")
        .select(
            `
            id,
            plant_id,
            next_watering
        `
        )
        .lt("next_watering", now);

    if (error) {
        console.error("Error fetching due plant schedules:", error);
        return;
    }

    if (!duePlants || duePlants.length === 0) {
        console.log("No plants are due for watering.");
        return;
    }

    // Debugging: console.log("Due plants:", duePlants);

    // Schritt 2: Prüfe, welche Pflanzen bereits Tasks haben
    const plantIDs = duePlants.map((plant) => plant.plant_id);
    const { data: existingTasks, error: taskError } = await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("watering_task")
        .select("plant_id")
        .in("plant_id", plantIDs)
        .neq("status", "completed"); // Ignoriere abgeschlossene Tasks

    if (taskError) {
        console.error("Error fetching existing watering tasks:", taskError);
        return;
    }

    const existingPlantIDs = new Set(
        (existingTasks ?? []).map((task) => task.plant_id)
    );

    // Schritt 3: Erstelle neue Tasks nur mit den erforderlichen Feldern
    const newTasks = duePlants
        .filter((plant) => !existingPlantIDs.has(plant.plant_id))
        .map((plant) => ({
            plant_id: plant.plant_id,
            created_at: now,
            status: "pending",
            assigned_user_id: null,
            notified_at: null,
            reminder_at: null,
            image_url: null,
        }));

    if (newTasks.length === 0) {
        // Debugging console.log("No new watering tasks to insert.");
        return;
    }

    // Schritt 4: Füge neue Tasks ein
    const { error: insertError } = await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("watering_task")
        .insert(newTasks);

    if (insertError) {
        console.error("Error inserting new watering tasks:", insertError);
    } else {
        // Debugging:
        /* console.log(
            `Successfully inserted ${newTasks.length} new watering tasks.`
        ); */
    }
}

// 3.
/**
 * Holt alle watering_tasks aus der DB.
 */
export async function fetchWateringTasksFromDB(): Promise<WateringTask[]> {
    try {
        const { data, error } = await supabase
            .schema("bachelor_baseplant_jacob_flender")
            .from("watering_task_view")
            .select("*");

        if (error) {
            console.error("Error fetching watering tasks from view:", error);
            return [];
        }
        const wateringTasks: WateringTask[] = (data ?? []).map((task: any) => ({
            id: task.id,
            plant_id: task.plant_id,
            assigned_user_id: task.assigned_user_id ?? null,
            status: task.status ?? null,
            last_watered: task.last_watered ?? null,
            next_watering: task.next_watering ?? null,
            location_id: task.location_id,
            location_name: task.location_name,
            floor: task.floor,
            interval: task.interval,
            volume: task.volume,
            method: task.method,
            plant_name: task.plant_name,
            notified_at: task.notified_at ?? null,
            reminder_at: task.reminder_at ?? null,
            created_at: task.created_at ?? null,
            deskly_id: task.deskly_id ?? null,
            image_url: task.image_url ?? null,
        }));

        return wateringTasks;
    } catch (error) {
        console.log("Unexpected error", error);
        return [];
    }
}

/**
 * Schreibt Nutzerzuweisungen für mehrere Tasks im Bulk in die Datenbank.
 * @param assignments Array mit { task, user }
 *
 * Hinweis: Das Matching erfolgt ausschließlich über die E-Mail-Adresse.
 */
export async function bulkAssignUsersToTasks(
    assignments: Array<{ task: WateringTask; user: { email: string } }>
) {
    if (!assignments.length) return;

    // 1. Sammle alle E-Mails
    const emails = Array.from(
        new Set(
            assignments
                .filter((a) => a.user && a.user.email)
                .map((a) => a.user.email)
        )
    );

    if (!emails.length) return;

    // 2. Hole alle relevanten Employees mit id anhand der E-Mail
    const { data: employees, error } = await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("employee")
        .select("id, mail")
        .in("mail", emails);

    if (error) {
        console.error("Fehler beim Abrufen der Employee-Daten:", error);
        throw error;
    }

    // Mappe E-Mail auf employee.id
    const emailToId = new Map<string, number>();
    (employees ?? []).forEach((emp) => {
        if (emp.mail && emp.id) {
            emailToId.set(emp.mail, emp.id);
        }
    });

    // 3. Erzeuge Update-Objekte für die DB
    const updates = assignments
        .filter((a) => a.user && a.user.email && emailToId.has(a.user.email))
        .map((a) => ({
            id: a.task.id,
            status: "assigned",
            assigned_user_id: emailToId.get(a.user.email)!,
            created_at: a.task.created_at ?? new Date().toISOString(),
            plant_id: a.task.plant_id,
            notified_at: a.task.notified_at ?? null,
            reminder_at: a.task.reminder_at ?? null,
        }));

    if (!updates.length) return;

    const { error: upsertError } = await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("watering_task")
        .upsert(updates, { onConflict: "id" });

    if (upsertError) {
        console.error(
            "Fehler beim Bulk-Update der Nutzerzuweisungen:",
            upsertError
        );
        throw upsertError;
    }
}

/**
 * Synchronisiert alle Slack-User mit der Employee-Tabelle in der Datenbank.
 * Speichert real_name und Slack-ID. Fügt nur neue Nutzer hinzu, die noch nicht existieren.
 */
export async function syncSlackUsersToDB(): Promise<void> {
    try {
        // 1. Hole alle Slack-User
        const result = await app.client.users.list({});
        const members = result.members ?? [];

        // 2. Filtere echte Nutzer (keine Bots, keine gelöschten)
        const validUsers = members.filter(
            (user: any) =>
                !user.deleted &&
                !user.is_bot &&
                user.id &&
                user.real_name &&
                typeof user.real_name === "string"
        );

        // 3. Hole alle bereits gespeicherten Slack-IDs und real_names aus der DB
        const { data: existing, error } = await supabase
            .schema("bachelor_baseplant_jacob_flender")
            .from("employee")
            .select("slack_id, real_name");

        if (error) {
            console.error("Error fetching existing users from DB:", error);
            return;
        }

        const existingSet = new Set(
            (existing ?? []).map((u: any) => `${u.slack_id}|${u.real_name}`)
        );

        // 4. Finde neue Nutzer, die noch nicht in der DB sind
        const newUsers = validUsers
            .filter((user: any) => {
                const key = `${user.id}|${user.real_name}`;
                return !existingSet.has(key);
            })
            .map((user: any) => {
                // E-Mail bestimmen: zuerst echtes E-Mail-Feld, sonst aus name bauen
                let mail: string | null = null;
                if (user.profile?.email) {
                    mail = user.profile.email;
                } else if (user.name) {
                    mail = `${user.name}@basecom.de`;
                }
                return {
                    slack_id: user.id,
                    real_name: user.real_name,
                    mail,
                };
            });

        if (newUsers.length === 0) {
            console.log("No new Slack users to insert.");
            return;
        }

        // 5. Schreibe neue Nutzer in die DB
        const { error: insertError } = await supabase
            .schema("bachelor_baseplant_jacob_flender")
            .from("employee")
            .insert(newUsers);

        if (insertError) {
            console.error("Error inserting new Slack users:", insertError);
        } else {
            console.log(`Inserted ${newUsers.length} new Slack users into DB.`);
        }
    } catch (err) {
        console.error("Error syncing Slack users to DB:", err);
    }
}

// Mock function
function notifyUserInTestChannel(desklyUserId: string, arg1: string) {
    console.log(
        `Mock notification for user ${desklyUserId} in test channel: ${arg1}`
    );
    return Promise.resolve(); // Simulate successful notification
}

/**
 * Holt ein Mapping von E-Mail (lowercase) zu SlackID aus der employee-Tabelle.
 * Gibt eine Map zurück: email (lowercase) => slackID
 */
export async function getEmailToSlackIdMap(): Promise<Map<string, string>> {
    const { data: employees, error } = await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("employee")
        .select("mail, slack_id");

    if (error) {
        console.error("Fehler beim Abrufen der Employee-Daten:", error);
        return new Map();
    }

    const emailToSlackId = new Map<string, string>();
    (employees ?? []).forEach((emp) => {
        if (emp.mail && emp.slack_id) {
            emailToSlackId.set(emp.mail.toLowerCase(), emp.slack_id);
        }
    });
    return emailToSlackId;
}

/**
 * Ergänzt eine Liste von UserDetails um die SlackID anhand der E-Mail-Adresse.
 * Gibt ein neues Array mit vollständigen UserDetails zurück.
 */
export async function addSlackIdsToUsers(
    users: UserDetails[]
): Promise<UserDetails[]> {
    // Hole alle Employees mit E-Mail und Slack-ID und Employee-ID
    const { data: employees, error } = await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("employee")
        .select("mail, slack_id, id");

    if (error) {
        console.error("Fehler beim Abrufen der Employee-Daten:", error);
        return users;
    }

    // Mappe E-Mail auf SlackID und Employee-ID
    const emailToSlackId = new Map<string, string>();
    const emailToEmployeeId = new Map<string, number>();
    (employees ?? []).forEach((emp) => {
        if (emp.mail && emp.slack_id) {
            emailToSlackId.set(emp.mail.toLowerCase(), emp.slack_id);
        }
        if (emp.mail && emp.id) {
            emailToEmployeeId.set(emp.mail.toLowerCase(), emp.id);
        }
    });

    return users.map((user) => ({
        ...user,
        slackID: user.email
            ? emailToSlackId.get(user.email.toLowerCase()) ?? ""
            : "",
        employeeId: user.email
            ? emailToEmployeeId.get(user.email.toLowerCase())
            : undefined,
    }));
}

export async function updateCandidateUserIdsForTask(
    taskId: number,
    candidateUserIds: number[]
) {
    await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("watering_task")
        .update({
            candidate_user_ids: candidateUserIds,
            assigned_user_id: candidateUserIds[0] ?? null,
            status: candidateUserIds.length > 0 ? "assigned" : "expired",
        })
        .eq("id", taskId);
}

// Für den Slack-Bot:

/**
 * Prüft den Status einer Bewässerungsaufgabe
 */
export async function getWateringTaskStatus(taskId: number) {
    return await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("watering_task")
        .select("status")
        .eq("id", taskId)
        .single();
}

/**
 * Holt Details einer Bewässerungsaufgabe (für Timeout-Handler)
 */
export async function getWateringTaskDetails(taskId: number) {
    return await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("watering_task")
        .select("id, assigned_user_id, candidate_user_ids, status")
        .eq("id", taskId)
        .single();
}

/**
 * Holt Anzeige-Daten einer Bewässerungsaufgabe aus der View
 */
export async function getWateringTaskViewData(taskId: number) {
    return await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("watering_task_view")
        .select("plant_name, location_name, volume, method, image_url")
        .eq("id", taskId)
        .single();
}

/**
 * Aktualisiert eine Bewässerungsaufgabe für den nächsten Kandidaten
 */
export async function updateTaskForNextCandidate(
    taskId: number,
    nextCandidateId: number,
    candidates: number[]
) {
    return await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("watering_task")
        .update({
            assigned_user_id: nextCandidateId,
            candidate_user_ids: candidates,
            status: "assigned",
            notified_at: new Date().toISOString(),
        })
        .eq("id", taskId);
}

/**
 * Markiert eine Bewässerungsaufgabe als abgelaufen
 */
export async function markTaskAsExpired(taskId: number) {
    return await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("watering_task")
        .update({
            assigned_user_id: null,
            candidate_user_ids: null,
            status: "expired",
        })
        .eq("id", taskId);
}

/**
 * Markiert eine Bewässerungsaufgabe als erledigt
 */
export async function markTaskAsDone(taskId: number) {
    return await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("watering_task")
        .update({
            status: "done",
            assigned_user_id: null,
            candidate_user_ids: null,
        })
        .eq("id", taskId);
}

/**
 * Holt die Pflegeintervall-Daten einer Pflanze
 */
export async function getPlantCareInterval(taskId: number) {
    return await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("watering_task")
        .select(
            `
            plant_id,
            plant (
                care_id,
                plant_care (
                    interval
                )
            )
        `
        )
        .eq("id", taskId)
        .single();
}

/**
 * Aktualisiert die Zeitplan-Daten einer Pflanze
 */
export async function updatePlantSchedule(
    plantId: number,
    lastWatered: string,
    nextWatering: string
) {
    return await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("plant_schedule")
        .update({
            last_watered: lastWatered,
            next_watering: nextWatering,
        })
        .eq("plant_id", plantId);
}

/**
 * Holt Details eines Mitarbeiters anhand seiner ID
 */
export async function getEmployeeDetails(employeeId: number) {
    return await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("employee")
        .select("id, mail, slack_id, real_name")
        .eq("id", employeeId)
        .single();
}

// Für das Ressourcen-Management

/**
 * Holt alle Locations aus der Datenbank
 */
export async function fetchLocations() {
    return await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("location")
        .select("id, name, deskly_id, x_value, y_value, floor");
}

/**
 * Löscht existierende Distanzpaare für einen Stock
 */
export async function deleteDistancePairsForFloor(floor: number) {
    return await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("distance_pairs")
        .delete()
        .eq("floor", floor);
}

/**
 * Speichert neue Distanzpaare in der Datenbank
 */
export async function insertDistancePairs(pairs: Array<{
    from_id: string;
    to_id: string;
    from_label: string;
    to_label: string;
    distance: number;
    floor: number;
}>) {
    return await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("distance_pairs")
        .insert(pairs);
}

/**
 * Lädt Distanzpaare aus der Datenbank mit Paginierung
 */
export async function getDistancePairsCount() {
    return await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("distance_pairs")
        .select("floor", { head: true, count: "exact" });
}

export async function fetchDistancePairsBatch(offset: number, pageSize: number) {
    return await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("distance_pairs")
        .select("from_id, to_id, from_label, to_label, distance, floor")
        .range(offset, offset + pageSize - 1);
}