import path from "path";
import fs from "fs";
import { WateringTask, TaskDescription } from "../shared/types/task";
import { UserDetails } from "../shared/types/user";
import { Booking } from "../shared/types/booking";
import { DistancePair } from "../shared/types/locationData";
import {
    createFastLookUpView,
    fetchWateringTasksFromDB,
    updateCandidateUserIdsForTask,
    processDuePlantSchedules,
    addSlackIdsToUsers,
} from "../backend/api/supabaseService";
import { loadDistancePairs } from "@/Setup/locationDistances";
import { fetchBookingsForFloor } from "../backend/api/desklyService";
import { notifyUserForTask } from "@/backend/api/slackService";
import { seedEmployeesFromBookings } from "@/TestStuff/seedEmployees";

// Logging-Hilfsfunktion
function logDebug(message: string, data?: any) {
    const logPath = path.join(process.cwd(), "mainWorkflow-debug.log");
    const timestamp = new Date().toISOString();
    let output = `[${timestamp}] ${message}`;
    if (data !== undefined) {
        output += " " + JSON.stringify(data, null, 2);
    }
    fs.appendFileSync(logPath, output + "\n");
    console.log(output);
}

/**
 * Ruft alle Buchungen und zugehörigen Benutzerdetails für die angegebenen Stockwerks-IDs ab.
 *
 * Für jede übergebene Stockwerks-ID werden die Buchungen und Benutzerinformationen gesammelt.
 * Die Benutzerliste wird so aggregiert, dass keine Duplikate (basierend auf der Benutzer-ID) enthalten sind.
 *
 * @param floorIDs - Ein Array von Stockwerks-IDs, für die die Buchungen und Benutzer abgerufen werden sollen.
 * @returns Ein Promise, das ein Objekt mit zwei Eigenschaften enthält:
 *   - bookings: Ein Array von Objekten, die jeweils die Buchungen für ein Stockwerk enthalten.
 *   - users: Ein Array von Benutzerdetails, wobei jeder Benutzer nur einmal enthalten ist.
 */
async function getAllBookingsAndUsers(floorIDs: string[]): Promise<{
    bookings: { data?: Booking[] }[];
    users: UserDetails[];
}> {
    const aggregatedBookings: { data?: Booking[] }[] = [];
    let aggregatedUsers: UserDetails[] = [];
    for (const floorID of floorIDs) {
        logDebug(`Fetching bookings for floor ${floorID}`);
        const result = await fetchBookingsForFloor(floorID);
        logDebug(`Bookings for floor ${floorID}:`, result.bookings);
        aggregatedBookings.push({ data: result.bookings });
        result.users.forEach((user: UserDetails) => {
            if (!aggregatedUsers.some((u) => u.id === user.id)) {
                aggregatedUsers.push(user);
            }
        });
    }
    logDebug("Aggregated users before enrichment:", aggregatedUsers);
    return { bookings: aggregatedBookings, users: aggregatedUsers };
}

/**
 * Filtert und verarbeitet Distanzpaare basierend auf Bewässerungsaufgaben, Buchungen, Benutzerdetails und vorhandenen Distanzpaaren.
 *
 * Diese Funktion erstellt eine Zuordnung von Bewässerungsaufgaben zu relevanten Distanzpaaren, indem sie:
 * - Buchungen nach Stockwerk gruppiert,
 * - Distanzpaare pro Stockwerk nach bestimmten Kriterien filtert (z.B. ob ein Standort eine Pflanze ist und ob er gebucht wurde),
 * - Benutzerdetails zu den jeweiligen Distanzpaaren hinzufügt,
 * - und die gefilterten Distanzpaare nach Entfernung sortiert.
 *
 * @param wateringTasks Eine Liste von Bewässerungsaufgaben, die jeweils eine deskly_id enthalten.
 * @param bookings Eine Liste von Buchungsantworten, gruppiert nach Stockwerk.
 * @param users Eine Liste von Benutzerdetails, die zur Zuordnung von Buchungen verwendet werden.
 * @param distancePairs Ein Objekt, das für jedes Stockwerk eine Liste von Distanzpaaren enthält.
 * @returns Ein Objekt, das für jede Bewässerungsaufgabe (task.id) die relevanten, gefilterten und angereicherten Distanzpaare zurückgibt.
 */
async function filterDistancePairs(
    wateringTasks: WateringTask[],
    bookings: { data?: Booking[] }[],
    users: UserDetails[],
    distancePairs: Record<number, DistancePair[]>
): Promise<Record<number, DistancePair[]>> {
    const userMap = new Map<string, UserDetails>();
    users.forEach((u) => userMap.set(u.id, u));

    const bookingsByFloor: Record<number, Booking[]> = {};
    bookings.forEach((response) => {
        response.data?.forEach((booking) => {
            let floorNumber: number | undefined;
            if (
                booking.floor &&
                typeof booking.floor === "object" &&
                booking.floor.name
            ) {
                floorNumber = parseInt(booking.floor.name, 10);
            } else if (
                typeof booking.floor === "number" ||
                typeof booking.floor === "string"
            ) {
                floorNumber = parseInt(booking.floor as string, 10);
            }
            if (floorNumber !== undefined && !isNaN(floorNumber)) {
                if (!bookingsByFloor[floorNumber]) {
                    bookingsByFloor[floorNumber] = [];
                }
                bookingsByFloor[floorNumber].push(booking);
            }
        });
    });

    const plantLocationIDs = wateringTasks.map((task) => task.deskly_id);
    const filteredDistancePairsByFloor: Record<number, DistancePair[]> = {};

    for (const floorKey in distancePairs) {
        const floor = parseInt(floorKey);
        const pairs = distancePairs[floor];
        const floorBookings = bookingsByFloor[floor] || [];

        logDebug(
            `Floor ${floor}: ${pairs.length} distance pairs, ${floorBookings.length} bookings`
        );

        const validPairs = pairs
            .filter((pair) => {
                const fromBooked = floorBookings.some(
                    (booking) =>
                        booking.resource &&
                        booking.resource.id === pair.from.desklyID
                );
                const toBooked = floorBookings.some(
                    (booking) =>
                        booking.resource &&
                        booking.resource.id === pair.to.desklyID
                );
                const fromIsPlant = plantLocationIDs.includes(
                    pair.from.desklyID
                );
                const toIsPlant = plantLocationIDs.includes(pair.to.desklyID);

                if (fromIsPlant && !toIsPlant) {
                    return toBooked;
                }
                if (toIsPlant && !fromIsPlant) {
                    return fromBooked;
                }
                if (fromIsPlant && toIsPlant) {
                    return fromBooked || toBooked;
                }
                return false;
            })
            .map((pair) => {
                const newPair: DistancePair = { ...pair };
                const bookingForFrom = floorBookings.find(
                    (booking) =>
                        booking.resource &&
                        booking.resource.id === pair.from.desklyID &&
                        booking.user?.id
                );
                if (bookingForFrom && bookingForFrom.user) {
                    newPair.fromUser = userMap.get(bookingForFrom.user.id);
                }
                const bookingForTo = floorBookings.find(
                    (booking) =>
                        booking.resource &&
                        booking.resource.id === pair.to.desklyID &&
                        booking.user?.id
                );
                if (bookingForTo && bookingForTo.user) {
                    newPair.toUser = userMap.get(bookingForTo.user.id);
                }
                return newPair;
            });

        logDebug(
            `Floor ${floor}: ${validPairs.length} valid pairs after filtering`
        );
        validPairs.forEach((pair, idx) => {
            logDebug(`ValidPair[${idx}]`, {
                from: pair.from.name,
                to: pair.to.name,
                distance: pair.distance,
                fromUser: pair.fromUser,
                toUser: pair.toUser,
            });
        });

        validPairs.sort((a, b) => a.distance - b.distance);
        filteredDistancePairsByFloor[floor] = validPairs;
    }

    const distancePairsByTask: Record<number, DistancePair[]> = {};
    wateringTasks.forEach((task) => {
        const relevantPairs: DistancePair[] = [];
        for (const floor in filteredDistancePairsByFloor) {
            const pairs = filteredDistancePairsByFloor[floor];
            const matchingPairs = pairs.filter(
                (pair) =>
                    pair.from.desklyID === task.deskly_id ||
                    pair.to.desklyID === task.deskly_id
            );
            relevantPairs.push(...matchingPairs);
        }
        logDebug(`Task ${task.id} relevantPairs:`, relevantPairs);
        distancePairsByTask[task.id] = relevantPairs;
    });

    return distancePairsByTask;
}

/**
 * Baut und speichert Kandidatenlisten für jede Bewässerungsaufgabe.
 *
 * Für jede Aufgabe werden die zugehörigen Distanzpaare durchsucht und die eindeutigen Mitarbeiter-IDs
 * der beteiligten Nutzer gesammelt. Anschließend wird die Liste der Kandidaten-IDs für die jeweilige Aufgabe
 * aktualisiert und gespeichert.
 *
 * @param wateringTasks - Array von Bewässerungsaufgaben, für die Kandidatenlisten erstellt werden sollen.
 * @param distancePairsByTask - Ein Record, der für jede Aufgaben-ID die zugehörigen Distanzpaare enthält.
 */
async function buildAndStoreCandidateLists(
    wateringTasks: WateringTask[],
    distancePairsByTask: Record<number, DistancePair[]>
) {
    for (const task of wateringTasks) {
        const pairs = distancePairsByTask[task.id] || [];
        const candidateUserIds: number[] = [];
        for (const pair of pairs) {
            if (
                pair.fromUser &&
                pair.fromUser.employeeId &&
                !candidateUserIds.includes(pair.fromUser.employeeId)
            ) {
                candidateUserIds.push(pair.fromUser.employeeId);
            }
            if (
                pair.toUser &&
                pair.toUser.employeeId &&
                !candidateUserIds.includes(pair.toUser.employeeId)
            ) {
                candidateUserIds.push(pair.toUser.employeeId);
            }
        }
        logDebug(`Task ${task.id} candidateUserIds:`, candidateUserIds);
        await updateCandidateUserIdsForTask(task.id, candidateUserIds);
    }
}

/**
 * Benachrichtigt die zugewiesenen Benutzer über ihre jeweiligen Bewässerungsaufgaben.
 *
 * Für jede Aufgabe wird überprüft, ob ein Benutzer zugewiesen ist und ob dieser eine Slack-ID besitzt.
 * Falls ja, wird der Benutzer über die Aufgabe benachrichtigt. Andernfalls wird ein Debug-Log-Eintrag erstellt.
 *
 * @param wateringTasks - Eine Liste von Bewässerungsaufgaben, die Benutzern zugewiesen sein können.
 * @param users - Eine Liste von Benutzerdetails, die Informationen wie E-Mail, Mitarbeiter-ID und Slack-ID enthalten.
 */
async function notifyAssignedUsers(
    wateringTasks: WateringTask[],
    users: UserDetails[]
) {
    for (const task of wateringTasks) {
        if (task.assigned_user_id) {
            const user = users.find(
                (u) => u.employeeId === task.assigned_user_id
            );
            if (user && user.slackID) {
                const description: TaskDescription = {
                    task_id: task.id,
                    plant_name: task.plant_name,
                    location_name: task.location_name,
                    volume: task.volume,
                    method: task.method,
                    image_url: task.image_url ?? null,
                };
                logDebug(
                    `Notify user ${user.email} (slackID: ${user.slackID}) for task ${task.id}`,
                    description
                );
                await notifyUserForTask(user, description);
            } else {
                logDebug(
                    `No Slack ID for user with employeeId ${task.assigned_user_id}, skipping notification for task ${task.id}.`
                );
            }
        } else {
            logDebug(
                `No assigned_user_id for task ${task.id}, skipping notification.`
            );
        }
    }
}

/**
 * Führt den Haupt-Workflow zur Verwaltung und Zuweisung von Bewässerungsaufgaben aus.
 *
 * Der Workflow umfasst folgende Schritte:
 * 1. Erstellt eine schnelle Lookup-View für Pflanzen.
 * 2. Prüft fällige Timer in `plant_schedule` und erstellt ggf. neue Aufgaben.
 * 3. Holt alle Bewässerungsaufgaben aus der Datenbank.
 * 4. Holt alle Buchungen und UserDetails aus Deskly für die angegebenen Stockwerke.
 * 5. Fügt alle User als Employees ein (mit Debug-SlackID).
 * 6. Anreichert die UserDetails mit SlackIDs (nachdem alle Employees in der DB sind).
 * 7. Holt die Distanzpaare für alle Stockwerke.
 * 8. Filtert die Distanzpaare je Aufgabe und ordnet UserDetails zu.
 * 9. Erstellt und speichert Kandidatenlisten pro Aufgabe.
 * 10. Holt die aktuellen Aufgaben erneut (um die zugewiesenen Nutzer zu erhalten).
 * 11. Benachrichtigt die jeweils zugewiesenen Nutzer.
 *
 * Fehler werden an den Aufrufer weitergegeben.
 */
async function mainWorkflow() {
    try {
        await createFastLookUpView();

        await processDuePlantSchedules();

        const wateringTasks: WateringTask[] = await fetchWateringTasksFromDB();

        const floorBookings = [
            process.env.FLOOR1_ID,
            process.env.FLOOR2_ID,
            process.env.FLOOR3_ID,
        ].filter(Boolean) as string[];
        const { bookings: aggregatedBookings, users: aggregatedUsersRaw } =
            await getAllBookingsAndUsers(floorBookings);

        const mockSlackID = "U08FWDZF3PC";
        await seedEmployeesFromBookings(aggregatedBookings, mockSlackID);

        let aggregatedUsers = await addSlackIdsToUsers(aggregatedUsersRaw);

        const distanceByFloor = await loadDistancePairs();

        const distancePairsByTask = await filterDistancePairs(
            wateringTasks,
            aggregatedBookings,
            aggregatedUsers,
            distanceByFloor
        );

        await buildAndStoreCandidateLists(wateringTasks, distancePairsByTask);

        const updatedTasks: WateringTask[] = await fetchWateringTasksFromDB();

        await notifyAssignedUsers(updatedTasks, aggregatedUsers);
    } catch (error) {
        throw error;
    }
}

export default mainWorkflow;
