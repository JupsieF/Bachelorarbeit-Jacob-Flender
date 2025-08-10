import { UserDetails } from "@/shared/types/user";
import { app } from "./slackConnection";
import { TaskDescription } from "@/shared/types/task";
import { sendWateringTaskToUser } from "@/slack/slackBot";

/**
 * Liste aller Benutzer auf, welche derzeit im Arbeitsbereich vorhanden sind.
 */
export async function listAllSlackUsers(): Promise<any[]> {
    try {
        const result = await app.client.users.list({});
        const members = result.members ?? [];
        // Mappe jeden Slack-Benutzer auf ein vereinfachtes Objekt.
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

const users = listAllSlackUsers();
console.log(users);


/**
 * Benachrichtige einen Benutzer über eine zugewiesene Bewässerungsaufgabe.
 * @param user - Details des Benutzers, der benachrichtigt werden soll.
 * @param description - Beschreibung der Aufgabe, die dem Benutzer zugewiesen wurde.
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
 * Sende eine Benachrichtigung an einen Slack-Benutzer.
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

/**
 * Placeholder for a helper function that queries Slack for user IDs by email.
 * This should interact with Slack's API (e.g., using @slack/web-api or @slack/bolt)
 * and return an array of objects: [{ email: string, slackId: string | null }, ...].
 *
 * You will need to implement this based on your Slack integration.
 */
export async function getSlackIdsFromSlack(
    emails: string[]
): Promise<{ email: string; slackId: string | null }[]> {
    // TODO: Implement the actual Slack API call using your preferred library.
    // For now, we return an array with null slackId for each email (simulate no matches).
    return emails.map((email) => ({ email, slackId: null }));
}
export default app;
