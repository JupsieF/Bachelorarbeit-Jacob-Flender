import bolt from "@slack/bolt";
import {
    getWateringTaskStatus,
    getWateringTaskDetails,
    getWateringTaskViewData,
    updateTaskForNextCandidate,
    markTaskAsExpired,
    markTaskAsDone,
    getPlantCareInterval,
    updatePlantSchedule,
    getEmployeeDetails,
} from "@/backend/api/supabaseService";

const { App } = bolt;

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_SOCKET_TOKEN,
    port: process.env.PORT ? Number(process.env.PORT) : 3000,
});

/**
 * Sendet eine Bewässerungsaufgabe an einen Nutzer.
 */
export async function sendWateringTaskToUser({
    slackId,
    taskDescription,
}: {
    slackId: string;
    taskDescription: {
        task_id: number;
        plant_name: string | null;
        location_name: string;
        volume: number | null;
        method: string | null;
        image_url?: string | null;
    };
}) {
    const blocks: any[] = [
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text:
                    `*Bewässerungsaufgabe*\n` +
                    `*Pflanze:* ${taskDescription.plant_name ?? "Unbekannt"}\n` +
                    `*Standort:* ${taskDescription.location_name}\n` +
                    (taskDescription.volume ? `*Wassermenge:* ${taskDescription.volume} ml\n` : "") +
                    (taskDescription.method ? `*Methode:* ${taskDescription.method}\n` : ""),
            },
        },
    ];

    if (taskDescription.image_url) {
        blocks.push({
            type: "image",
            image_url: taskDescription.image_url,
            alt_text: "Bild der Pflanze",
        });
    }

    blocks.push({
        type: "actions",
        elements: [
            {
                type: "button",
                text: {
                    type: "plain_text",
                    text: "Bewässerung erledigt",
                },
                style: "primary",
                action_id: "taken_care",
                value: String(taskDescription.task_id),
            },
        ],
    });

    const result = await app.client.chat.postMessage({
        channel: slackId,
        text: "Bitte gieße die Pflanze!",
        blocks,
    });

    const channelId = result.channel as string;
    const ts = result.ts as string;

    setTimeout(async () => {
        try {
            if (!ts) {
                console.error("No timestamp returned from chat.postMessage, cannot update message.");
                return;
            }

            console.log("Updating message in channel", channelId, "ts", ts);

            // Prüfe Status
            const { data, error: fetchError } = await getWateringTaskStatus(taskDescription.task_id);
            if (fetchError) {
                console.error("Error fetching watering_task status:", fetchError);
                return;
            }

            // Hole Task-Details
            const { data: taskRow, error: taskRowError } = await getWateringTaskDetails(taskDescription.task_id);
            if (
                taskRowError ||
                !taskRow ||
                typeof taskRow !== "object" ||
                !("candidate_user_ids" in taskRow) ||
                !("assigned_user_id" in taskRow) ||
                !("status" in taskRow)
            ) {
                console.error("Error fetching watering_task details or missing properties:", taskRowError, taskRow);
                return;
            }

            if (taskRow.status === "done" || taskRow.status === "completed") {
                await app.client.chat.update({
                    channel: channelId,
                    ts,
                    text: "Die Bewässerung wurde bereits erledigt.",
                    blocks: [
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: "Die Bewässerung wurde bereits erledigt.",
                            },
                        },
                    ],
                });
                return;
            }

            let candidates: number[] = (taskRow.candidate_user_ids as number[]) ?? [];
            candidates = candidates.filter((id) => id !== taskRow.assigned_user_id);

            // Hole View-Daten
            const { data: taskView, error: taskViewError } = await getWateringTaskViewData(taskDescription.task_id);
            if (taskViewError || !taskView) {
                console.error("Error fetching watering_task_view details:", taskViewError);
                return;
            }

            if (candidates.length > 0) {
                await updateTaskForNextCandidate(taskDescription.task_id, candidates[0], candidates);

                // Hole Mitarbeiter-Details
                const { data: employee } = await getEmployeeDetails(candidates[0]);

                if (employee && employee.slack_id) {
                    const nextTaskDescription = {
                        task_id: taskRow.id,
                        plant_name: taskView.plant_name,
                        location_name: taskView.location_name ?? "Unbekannt",
                        volume: taskView.volume,
                        method: taskView.method,
                        image_url: taskView.image_url ?? null,
                    };
                    await sendWateringTaskToUser({
                        slackId: employee.slack_id,
                        taskDescription: nextTaskDescription,
                    });
                } else {
                    console.warn("Kein SlackID für nächsten Kandidaten gefunden.");
                }
            } else {
                await markTaskAsExpired(taskDescription.task_id);
            }

            await app.client.chat.update({
                channel: channelId,
                ts,
                text: "*Die Zeit zur Bestätigung ist abgelaufen.* Bewässerung nicht wahrgenommen.",
                blocks: [
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: "*Die Zeit zur Bestätigung ist abgelaufen.*\n",
                        },
                    },
                ],
            });
        } catch (err) {
            console.error("Error disabling button after timeout:", err);
        }
    }, 60 * 1000); // 60 Sekunden für Debugging; sonst 30 * 60 * 1000
}

app.action(
    { type: "block_actions", action_id: "taken_care" },
    async ({ ack, body, client, action }) => {
        await ack();
        const { message, channel } = body;
        const messageTs = message?.ts;
        const channelId = channel?.id;
        const taskId = (action as { value?: string }).value
            ? Number((action as { value?: string }).value)
            : undefined;

        if (!messageTs || !channelId || !taskId) {
            console.error("Missing message timestamp, channel ID, or task ID.");
            return;
        }

        // Prüfe Status
        const { data, error } = await getWateringTaskStatus(taskId);
        if (error) {
            console.error("Error fetching watering_task status:", error);
            return;
        }

        if (!data) {
            console.error("No watering_task found for id", taskId);
            await client.chat.update({
                channel: channelId,
                ts: messageTs,
                text: "Es gab ein Problem beim Bestätigen der Bewässerung (Task nicht gefunden).",
                blocks: [
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: ":warning: *Es gab ein Problem beim Bestätigen der Bewässerung.*",
                        },
                    },
                ],
            });
            return;
        }

        if (data.status !== "assigned") {
            await client.chat.update({
                channel: channelId,
                ts: messageTs,
                text: "Die Bewässerung wurde zu spät bestätigt.",
                blocks: [
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: ":warning: *Die Bewässerung wurde zu spät bestätigt.*\nBitte informiere dein Team, falls du trotzdem gegossen hast.",
                        },
                    },
                ],
            });
            return;
        }

        try {
            // Markiere Task als erledigt
            const { error: statusError } = await markTaskAsDone(taskId);
            if (statusError) {
                console.error("Fehler beim Setzen des Status auf done:", statusError);
            }

            // Hole Intervall-Daten
            const { data: info, error: infoError } = await getPlantCareInterval(taskId);
            if (infoError || !info?.plant?.plant_care?.interval) {
                console.error("Fehler beim Laden der Intervall‑Daten:", infoError);
                return;
            }

            // Berechne nächste Bewässerung
            const intervalDays = info.plant.plant_care.interval;
            const intervalMs = intervalDays * 24 * 60 * 60 * 1000;
            const now = new Date();
            const berlinNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

            const lastWateredISO = berlinNow.toISOString();
            const nextWateringISO = new Date(berlinNow.getTime() + intervalMs).toISOString();

            // Update Zeitplan
            const { error: scheduleError } = await updatePlantSchedule(
                info.plant_id,
                lastWateredISO,
                nextWateringISO
            );

            if (scheduleError) {
                console.error("Error updating plant_schedule:", scheduleError);
            }

            // Update Slack-Nachricht
            await client.chat.update({
                channel: channelId,
                ts: messageTs,
                text: "Die Pflanze wurde bewässert! Vielen Dank!",
                blocks: [
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: "Die Pflanze wurde bewässert! Vielen Dank!",
                        },
                    },
                ],
            });
        } catch (err) {
            console.error("Error in task completion handler:", err);
        }
    }
);

if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
    (async () => {
        await app.start();
        console.log("⚡️ Slack Bolt app is running!");
    })();
}