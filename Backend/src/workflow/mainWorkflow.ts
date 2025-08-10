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

// 1. Lade alle Bookings und UserDetails (noch nicht angereichert)
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

// 2. Filtere Distanzpaare und mappe UserDetails an die Paare
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

// 3. Kandidatenliste pro Task bauen und in DB speichern
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

// 4. Benachrichtigung an den ersten Kandidaten (falls vorhanden)
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

// Main Workflow
async function mainWorkflow() {
    try {
        logDebug("=== MAIN WORKFLOW START ===");

        // 1. Erzeuge den watering_task_view, falls er nicht existiert
        await createFastLookUpView();
        logDebug("watering_task_view created or already exists.");

        // 2. Prüfe die Timer in plant_schedule und erstelle ggf. neue Tasks
        await processDuePlantSchedules();
        logDebug(
            "Checked due plant schedules and created new tasks if needed."
        );

        // 3. Hole alle watering_tasks aus der DB
        const wateringTasks: WateringTask[] = await fetchWateringTasksFromDB();
        logDebug("Fetched watering tasks from DB:", wateringTasks);

        // 4. Hole alle Buchungen und UserDetails aus Deskly (noch nicht angereichert)
        const floorBookings = [
            process.env.FLOOR1_ID,
            process.env.FLOOR2_ID,
            process.env.FLOOR3_ID,
        ].filter(Boolean) as string[];
        logDebug("Floor IDs:", floorBookings);
        const { bookings: aggregatedBookings, users: aggregatedUsersRaw } =
            await getAllBookingsAndUsers(floorBookings);

        // 5. Füge alle User als Employees ein (Debug-SlackID)
        const mockSlackID = "U08FWDZF3PC"; // Meine SlackID für Debugging
        await seedEmployeesFromBookings(aggregatedBookings, mockSlackID);

        // 6. Jetzt UserDetails erneut anreichern (jetzt sind alle Employees in der DB)
        let aggregatedUsers = await addSlackIdsToUsers(aggregatedUsersRaw);
        logDebug("Aggregated users after enrichment:", aggregatedUsers);

        // 7. Hole die Distanzpaare für alle Stockwerke
        const distanceByFloor = await loadDistancePairs();
        logDebug("Loaded distance pairs by floor.", distanceByFloor);

        // 8. Filtere die Paare pro Stockwerk je Task und mappe UserDetails an die Paare
        const distancePairsByTask = await filterDistancePairs(
            wateringTasks,
            aggregatedBookings,
            aggregatedUsers,
            distanceByFloor
        );
        logDebug("Distance pairs by task:", distancePairsByTask);

        // 9. Baue und speichere die Kandidatenlisten pro Task
        await buildAndStoreCandidateLists(wateringTasks, distancePairsByTask);

        // 10. Hole die aktuellen Tasks nochmal (um assigned_user_id zu bekommen)
        const updatedTasks: WateringTask[] = await fetchWateringTasksFromDB();
        logDebug("Fetched updated watering tasks from DB:", updatedTasks);

        // 11. Benachrichtige die jeweils zugewiesenen Nutzer
        await notifyAssignedUsers(updatedTasks, aggregatedUsers);

        logDebug("=== MAIN WORKFLOW END ===");
    } catch (error) {
        logDebug("Error in mainWorkflow:", error);
        throw error;
    }
}

export default mainWorkflow;
