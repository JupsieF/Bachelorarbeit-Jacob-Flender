import supabase from "./backendConnection";
import { supabaseAdmin } from "./supabaseAdminConnection";
import { WateringTask } from "../../shared/types/task";
import { UserDetails } from "../../shared/types/user";
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
 * Holt die Benutzerdetails für eine gegebene Employee-ID aus der Supabase-Datenbank.
 *
 * Fragt die "employee"-Tabelle im "bachelor_baseplant_jacob_flender"-Schema ab
 * und selektiert die Felder: id, mail, slack_id und real_name. Falls ein passender
 * Mitarbeiter gefunden wird, wird ein `UserDetails`-Objekt mit den relevanten Informationen zurückgegeben.
 * Gibt `null` zurück, wenn kein Mitarbeiter gefunden wird oder ein Fehler bei der Abfrage auftritt.
 *
 * @param employeeId - Die eindeutige ID des Mitarbeiters, dessen Details abgerufen werden sollen.
 * @returns Ein Promise, das entweder ein `UserDetails`-Objekt oder `null` zurückgibt.
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

/**
 * Ruft die Employee-Daten aus Supabase ab.
 *
 * Verwendet das Schema "bachelor_baseplant_jacob_flender" und die Tabelle "employee",
 * um die Felder "id", "mail" und "slack_id" auszulesen.
 *
 * Gibt die abgerufenen Employee-Daten zurück.
 * Im Fehlerfall wird eine Fehlermeldung in der Konsole ausgegeben und die Daten zurückgegeben.
 *
 * @returns Promise mit den Employee-Daten oder undefined bei Fehler.
 */
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

/**
 * Erstellt eine schnelle Lookup-View in der Supabase-Datenbank durch Aufruf der gespeicherten Prozedur `createfastlookupview`.
 * 
 * @returns {Promise<void>} Ein Promise, das abgeschlossen wird, wenn die View erfolgreich erstellt wurde.
 * @throws Gibt einen Fehler in der Konsole aus, falls die Erstellung der View fehlschlägt.
 */
export async function createFastLookUpView(): Promise<void> {
    try {
        const { error } = await supabaseAdmin
            .schema("bachelor_baseplant_jacob_flender")
            .rpc("createfastlookupview");
        if (error) throw error;
    } catch (error) {
        console.error("Fehler beim Erstellen der View:", error);
    }
}

/**
 * Verarbeitet alle Pflanzengießpläne, deren nächstes Gießdatum überschritten ist.
 *
 * Ablauf:
 * 1. Holt alle Pflanzengießpläne aus der Datenbank, deren `next_watering` vor dem aktuellen Zeitpunkt liegt.
 * 2. Prüft, für welche dieser Pflanzen bereits offene Gießaufgaben existieren.
 * 3. Erstellt neue Gießaufgaben für Pflanzen, die noch keine offene Aufgabe haben.
 * 4. Fügt die neuen Aufgaben in die Datenbank ein.
 *
 * Fehlerbehandlung:
 * - Gibt Fehlermeldungen aus, falls beim Abrufen oder Einfügen der Datenbankeinträge Fehler auftreten.
 *
 * Gibt eine Konsolenausgabe aus, wenn keine Pflanzen zum Gießen fällig sind.
 */
export async function processDuePlantSchedules() {
    const now = new Date().toISOString();

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

    const plantIDs = duePlants.map((plant) => plant.plant_id);
    const { data: existingTasks, error: taskError } = await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("watering_task")
        .select("plant_id")
        .in("plant_id", plantIDs)
        .neq("status", "completed");

    if (taskError) {
        console.error("Error fetching existing watering tasks:", taskError);
        return;
    }

    const existingPlantIDs = new Set(
        (existingTasks ?? []).map((task) => task.plant_id)
    );

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
        return;
    }

    const { error: insertError } = await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("watering_task")
        .insert(newTasks);

    if (insertError) {
        console.error("Error inserting new watering tasks:", insertError);
    } else {
    }
}

/**
 * Ruft alle Bewässerungsaufgaben aus der Datenbank-View `watering_task_view` ab.
 * 
 * Verwendet das Supabase-SDK, um die Aufgaben aus dem Schema `bachelor_baseplant_jacob_flender` zu laden.
 * Gibt ein Array von `WateringTask`-Objekten zurück. 
 * Im Fehlerfall wird ein leeres Array zurückgegeben und der Fehler wird in der Konsole protokolliert.
 * 
 * @returns Ein Promise, das ein Array von Bewässerungsaufgaben (`WateringTask[]`) enthält.
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
 * Weist mehreren Benutzern Aufgaben in einem Schritt zu.
 *
 * Diese Funktion nimmt eine Liste von Zuweisungen entgegen, wobei jede Zuweisung eine Aufgabe und einen Benutzer (identifiziert durch E-Mail) enthält.
 * Sie sucht die entsprechenden Mitarbeiter-IDs anhand der E-Mail-Adressen und aktualisiert die Aufgaben in der Datenbank,
 * sodass der jeweilige Benutzer als zuständiger Mitarbeiter eingetragen wird.
 *
 * @param assignments Array von Objekten, die jeweils eine Aufgabe (`task`) und einen Benutzer mit E-Mail (`user.email`) enthalten.
 * 
 * @throws Fehler beim Abrufen der Mitarbeiterdaten oder beim Aktualisieren der Aufgaben in der Datenbank.
 */
export async function bulkAssignUsersToTasks(
    assignments: Array<{ task: WateringTask; user: { email: string } }>
) {
    if (!assignments.length) return;

    const emails = Array.from(
        new Set(
            assignments
                .filter((a) => a.user && a.user.email)
                .map((a) => a.user.email)
        )
    );

    if (!emails.length) return;

    const { data: employees, error } = await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("employee")
        .select("id, mail")
        .in("mail", emails);

    if (error) {
        console.error("Fehler beim Abrufen der Employee-Daten:", error);
        throw error;
    }

    const emailToId = new Map<string, number>();
    (employees ?? []).forEach((emp) => {
        if (emp.mail && emp.id) {
            emailToId.set(emp.mail, emp.id);
        }
    });

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
 * Synchronisiert Slack-Nutzer mit der Datenbank.
 *
 * Diese Funktion führt folgende Schritte aus:
 * 1. Holt alle Nutzer aus Slack.
 * 2. Filtert echte Nutzer (keine Bots, keine gelöschten Accounts).
 * 3. Holt alle bereits gespeicherten Slack-IDs und Namen aus der Datenbank.
 * 4. Findet neue Nutzer, die noch nicht in der Datenbank sind.
 * 5. Fügt neue Nutzer in die Datenbank ein.
 *
 * Fehler werden in der Konsole ausgegeben.
 *
 * @returns {Promise<void>} Ein Promise, das abgeschlossen wird, wenn die Synchronisation beendet ist.
 */
export async function syncSlackUsersToDB(): Promise<void> {
    try {
    
        const result = await app.client.users.list({});
        const members = result.members ?? [];

    
        const validUsers = members.filter(
            (user: any) =>
                !user.deleted &&
                !user.is_bot &&
                user.id &&
                user.real_name &&
                typeof user.real_name === "string"
        );

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

        const newUsers = validUsers
            .filter((user: any) => {
                const key = `${user.id}|${user.real_name}`;
                return !existingSet.has(key);
            })
            .map((user: any) => {
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

/**
 * Ergänzt eine Liste von UserDetails um Slack-ID und Employee-ID anhand der E-Mail-Adresse.
 *
 * Holt alle Employees mit E-Mail, Slack-ID und Employee-ID aus der "employee"-Tabelle.
 * Für jeden Nutzer im Eingabe-Array werden die passende Slack-ID und Employee-ID hinzugefügt,
 * sofern eine Übereinstimmung der E-Mail gefunden wird.
 *
 * @param users - Array von UserDetails, die um Slack-ID und Employee-ID ergänzt werden sollen.
 * @returns Ein Promise, das ein Array von UserDetails mit ergänzter Slack-ID und Employee-ID zurückgibt.
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