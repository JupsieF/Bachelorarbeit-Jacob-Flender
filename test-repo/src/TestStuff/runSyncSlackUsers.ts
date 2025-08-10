
/**
 * Hole alle watering_tasks aus der DB.
 */
export async function fetchWateringTasksFromDB(): Promise<WateringTask[]> {
    const { data, error } = await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("watering_task_view")
        .select("*");

    if (error) {
        console.error("Error fetching watering tasks from view:", error);
        return [];
    }
    return data ?? [];
}

/**
 * Hole Slack-IDs für eine Liste von E-Mails aus der Supabase-Datenbank.
 * Gibt eine Map zurück, in der der Schlüssel die E-Mail und der Wert die Slack-ID ist.
 */
export async function fetchSlackIDsByEmails(
    emails: string[]
): Promise<Map<string, string>> {
    const { data, error } = await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("employee")
        .select("mail, slack_id")
        .in("mail", emails);
    if (error || !data) {
        console.error("Error fetching Slack IDs:", error);
        return new Map();
    }
    const slackIDMap = new Map<string, string>();
    data.forEach((record: { mail: string; slack_id: string }) => {
        if (record.slack_id) {
            slackIDMap.set(record.mail.trim(), record.slack_id);
        }
    });
    return slackIDMap;
}



/**
 * Holes alle watering tasks aus der DB.
 * Gibt ein Array von WateringTask zurück.
 */
async function fetchWateringTasks(): Promise<WateringTask[]> {
    try {
        const { data, error } = await supabase
            .schema("bachelor_baseplant_jacob_flender")
            .from("plant_watering")
            .select(
                "id, plant_id, location_id, location_name, floor, interval, volume, method, plant_name"
            );

        if (error) {
            console.error("Error fetching watering tasks from DB:", error);
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
        }));

        return wateringTasks;
    } catch (error) {
        console.log("Unexpected error", error);
        return [];
    }
}

/**
 * Für eine gegebene Bewässerungsaufgabe und die zugehörigen Distanzpaare
 * wähle den nächstgelegenen validen Nutzer aus und benachrichtige ihn.
 */
export async function selectAndNotifyUserForWateringTask(
    wateringTask: WateringTask,
    pairs: DistancePair[]
): Promise<void> {
    // Finde den besten Kandidaten (z.B. ersten passenden User)
    let candidate: UserDetails | undefined;
    for (const pair of pairs) {
        if (pair.from.desklyID === wateringTask.location_id && pair.toUser) {
            candidate = pair.toUser;
        } else if (
            pair.to.desklyID === wateringTask.location_id &&
            pair.fromUser
        ) {
            candidate = pair.fromUser;
        }
        if (candidate) break;
    }

    if (!candidate) {
        console.log(
            `No suitable candidate found for watering task ${wateringTask.id}.`
        );
        return;
    }

    // Task in der DB zuweisen
    const { error } = await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("watering_task")
        .update({ assigned_user_id: candidate.id, status: "assigned" })
        .eq("id", wateringTask.id);

    if (error) {
        console.error("Error assigning user to watering task:", error);
        return;
    }

    // MOCK-IMPLEMENTATION: Hier wird angenommen, dass notifyUserInTestChannel die richtige Funktion ist,
    // um den Nutzer zu benachrichtigen. In der echten Implementierung muss hier der Nutzer aus der DB geholt werden,
    // indem die Email mit der Mail in der DB verglichen wird. Dann wird die Slack-ID verwendet, um den Nutzer zu benachrichtigen.
    // Slack-Benachrichtigung

    console.log(
        `User ${candidate.id} assigned to task ${wateringTask.id} at location ${wateringTask.location_name}.`
    );
    console.log("Ende der Mock-Implementierung.");
    // Hier könnte eine echte Benachrichtigung an den Nutzer erfolgen, z.B. via Slack

    /*
    await notifyUserInTestChannel(
        candidate.slackID || candidate.id,
        `Pflanze: ${wateringTask.plant_name}, Ort: ${wateringTask.location_name}`
    );
    console.log(
        `User ${candidate.id} assigned and notified for task ${wateringTask.id}`
    );
    */
}

/**
 * Behandelt Fälle, in denen einigen Nutzern eine Slack-ID fehlt.
 * Diese Funktion fragt die Datenbank nach Nutzern mit fehlender Slack-ID ab,
 * verwendet eine Hilfsfunktion (getSlackIdsFromSlack), um Slack anhand der E-Mail zu durchsuchen,
 * und aktualisiert die Datenbank über die Supabase-API.
 */
async function updateMissingSlackIDs(): Promise<void> {
    // Query the DB for users with emails and missing slack_id
    const { data: employees, error } = await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("employee")
        .select("mail, slack_id, first_name, last_name");
    if (error) {
        console.error("Error fetching employees for Slack ID update:", error);
        return;
    }
    if (!employees || employees.length === 0) {
        console.log("No employees found in DB to update.");
        return;
    }

    // Filtere nach Emails, bei denen slack_id fehlt
    const usersMissingSlack = employees.filter((emp: any) => !emp.slack_id);
    if (usersMissingSlack.length === 0) {
        console.log("All users have Slack IDs.");
        return;
    }

    const emailsToUpdate = usersMissingSlack.map((emp: any) => emp.mail);

    // Rufe die Hilfsfunktion auf, um Slack-IDs anhand der E-Mails zu erhalten.
    const slackUpdates = await getSlackIdsFromSlack(emailsToUpdate);

    // Bereite die Daten für das Upsert vor, nur für Nutzer, bei denen eine Slack-ID gefunden wurde.
    const updates = slackUpdates
        .filter((update) => update.slackId !== null)
        .map((update) => {
            // Finde den entsprechenden Nutzer
            const emp = usersMissingSlack.find(
                (u: any) => u.mail === update.email
            );
            return emp
                ? {
                      mail: emp.mail,
                      first_name: emp.first_name,
                      last_name: emp.last_name,
                      slack_id: update.slackId,
                  }
                : null;
        })
        .filter(Boolean);

    if (updates.length === 0) {
        console.log("No missing Slack IDs were retrieved from Slack.");
        return;
    }

    // Update die Tabelle Employee mit den neuen Slack-IDs
    const { error: updateError } = await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("employee")
        .upsert(updates, { onConflict: "mail" });

    if (updateError) {
        console.error("Error upserting missing Slack IDs:", updateError);
    } else {
        console.log("Successfully updated missing Slack IDs.");
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
