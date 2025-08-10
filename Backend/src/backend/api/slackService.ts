import { UserDetails } from "@/shared/types/user";
import { app } from "./slackConnection";
import { TaskDescription } from "@/shared/types/task";
import { sendWateringTaskToUser } from "@/slack/slackBot";

/**
 * Ruft alle Slack-Benutzer ab und gibt eine Liste mit ausgewählten Benutzerinformationen zurück.
 *
 * @returns {Promise<any[]>} Eine Promise, die ein Array von Objekten mit den Feldern `id`, `name`, `real_name` und `email` enthält.
 * @throws Gibt im Fehlerfall eine leere Liste zurück und protokolliert den Fehler in der Konsole.
 */
export async function listAllSlackUsers(): Promise<any[]> {
    try {
        const result = await app.client.users.list({});
        const members = result.members ?? [];

        return members.map((user: any) => ({
            id: user.id,
            name: user.name,
            real_name: user.real_name,
            email: user.profile?.email,
        }));
    } catch (error) {
        console.error("Error fetching Slack users:", error);
        return [];
    }
}

/**
 * Benachrichtigt einen Benutzer über eine Bewässerungsaufgabe per Slack.
 *
 * Diese Funktion erstellt eine Nachricht mit den relevanten Informationen zur Bewässerungsaufgabe
 * und sendet diese an den Benutzer, sofern eine Slack-ID vorhanden ist. Falls keine Slack-ID
 * hinterlegt ist, wird eine Warnung im Log ausgegeben.
 *
 * @param user Die Benutzerdetails, einschließlich Slack-ID und Name.
 * @param description Die Beschreibung der Bewässerungsaufgabe, inklusive Pflanze, Standort, Wassermenge, Methode, Bild und Aufgaben-ID.
 */
export async function notifyUserForTask(
    user: UserDetails,
    description: TaskDescription
) {
    console.log("SlackID:", user.slackID);
    let message = `Hallo ${user.firstName},\n\nBitte kümmere dich um folgende Bewässerungsaufgabe:\n`;
    message += `• Pflanze: ${description.plant_name ?? "Unbekannt"}\n`;
    message += `• Standort: ${description.location_name}\n`;
    if (description.volume)
        message += `• Wassermenge: ${description.volume} ml\n`;
    if (description.method) message += `• Methode: ${description.method}\n`;
    if (description.image_url) message += `• Bild: ${description.image_url}\n`;

    if (user.slackID) {
        await sendWateringTaskToUser({
            slackId: user.slackID,
            taskDescription: {
                plant_name: description.plant_name ?? "Unbekannt",
                location_name: description.location_name,
                volume: description.volume ?? null,
                method: description.method ?? null,
                image_url: description.image_url ?? null,
                task_id: description.task_id,
            },
        });
    } else {
        console.warn(
            `No Slack ID found for user ${user.id}. Cannot send notification.`
        );
    }
}

/**
 * Sendet eine Benachrichtigung an einen Slack-Nutzer.
 *
 * @param slackID Die Slack-ID des Empfängers.
 * @param message Die Nachricht, die gesendet werden soll.
 * @param blocks Optional. Zusätzliche Slack-Blocks für die Nachricht.
 * @returns Promise, das abgeschlossen wird, wenn die Nachricht gesendet wurde.
 */
export async function notifyUserBySlack(
    slackID: string,
    message: string,
    blocks?: any[]
): Promise<void> {
    try {
        await app.client.chat.postMessage({
            channel: slackID,
            text: message,
            blocks: blocks,
        });
    } catch (error) {
        console.error(`Error sending notification to ${slackID}:`, error);
    }
}

export default app;
