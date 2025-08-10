import { mockTimeoutTask } from "./mockTimeoutPlant";
import { mockTimeoutBookings, userA, userB, userC } from "./mockTimeoutBookings";
import { loadDistancePairs } from "@/Setup/locationDistances";
import { UserDetails } from "@/shared/types/user";

interface EnrichedPair {
    distance: number;
    fromUser?: UserDetails;
    toUser?: UserDetails;
    from: any;
    to: any;
}

// Simuliert die Filterlogik aus dem MainWorkflow
async function getCandidatesForTimeoutTest() {
    const plantTask = mockTimeoutTask;
    const distanceByFloor = await loadDistancePairs();
    const pairs = distanceByFloor[plantTask.floor ?? 1];

    if (!pairs || pairs.length === 0) {
        console.log("Keine Distanzpaare für Stockwerk", plantTask.floor);
        return [];
    }

    const floorBookings = mockTimeoutBookings[0].data;
    const plantLocationIDs = [plantTask.deskly_id];

    console.log("Pflanze:", plantTask.plant_name, "am Standort:", plantTask.location_name);
    console.log("Verfügbare Nutzer:", floorBookings.map(b => 
        `${b.user?.firstName} ${b.user?.lastName} (${b.resource?.name})`
    ).join(", "));

    // Filter-Logik dem mainWorkflow nachempfunden
    const validPairs = pairs.filter((pair) => {
        const fromBooked = floorBookings.some(
            (booking) => booking.resource && booking.resource.id === pair.from.desklyID
        );
        const toBooked = floorBookings.some(
            (booking) => booking.resource && booking.resource.id === pair.to.desklyID
        );
        const fromIsPlant = plantLocationIDs.includes(pair.from.desklyID);
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
    });

    console.log("Gefilterte Paare:", validPairs.length);

    if (validPairs.length === 0) {
        console.log("Keine gültigen Paare gefunden");
        return [];
    }

    validPairs.sort((a, b) => a.distance - b.distance);

    const userMap = new Map();
    floorBookings.forEach(booking => {
        if (booking.user?.id) {
            userMap.set(booking.user.id, booking.user);
        }
    });

    const enrichedPairs: EnrichedPair[] = validPairs.map(pair => {
        const newPair = { ...pair };

        const bookingForFrom = floorBookings.find(
            (booking) => booking.resource && 
                        booking.resource.id === pair.from.desklyID && 
                        booking.user?.id
        );
        if (bookingForFrom && bookingForFrom.user) {
            newPair.fromUser = bookingForFrom.user;
        }

        const bookingForTo = floorBookings.find(
            (booking) => booking.resource && 
                        booking.resource.id === pair.to.desklyID && 
                        booking.user?.id
        );
        if (bookingForTo && bookingForTo.user) {
            newPair.toUser = bookingForTo.user;
        }

        return newPair;
    });

    console.log("\n Nutzer-Distanzen zur Pflanze (sortiert):");
    console.log("==========================================");
    enrichedPairs.forEach((pair, index) => {
        const user = pair.fromUser || pair.toUser;
        if (user) {
            console.log(`${index + 1}. ${user.firstName} ${user.lastName}: ${pair.distance.toFixed(2)} Einheiten`);
        }
    });

    const candidates: UserDetails[] = [];
    enrichedPairs.forEach(pair => {
        const user = pair.fromUser || pair.toUser;
        if (user && !candidates.some(c => c.id === user.id)) {
            candidates.push(user);
        }
    });

    return candidates;
}

// Simuliert die Benachrichtigung ohne echten Slack-Call
function simulateNotification(user: UserDetails, taskDescription: any, isTimeout: boolean = false) {
    const prefix = isTimeout ? "TIMEOUT - Weiterleitung an" : "Benachrichtigung an";
    console.log(`\n${prefix} ${user.firstName} ${user.lastName}`);
    console.log(`Aufgabe: ${taskDescription.plant_name} bewässern (${taskDescription.volume} ml, ${taskDescription.method})`);
}

// Simuliert den kompletten Timeout-Prozess
async function simulateTimeoutScenario() {

    const candidates = await getCandidatesForTimeoutTest();
    
    if (candidates.length === 0) {
        console.log("Keine Kandidaten gefunden - Test beendet");
        return;
    }

    const taskDescription = {
        task_id: mockTimeoutTask.id,
        plant_name: mockTimeoutTask.plant_name,
        location_name: mockTimeoutTask.location_name,
        volume: mockTimeoutTask.volume,
        method: mockTimeoutTask.method,
        image_url: mockTimeoutTask.image_url,
    };

    console.log(`\nKandidatenliste (${candidates.length} Nutzer):`);
    candidates.forEach((candidate, index) => {
        console.log(`   ${index + 1}. ${candidate.firstName} ${candidate.lastName}`);
    });

    // Erste Benachrichtigung
    console.log("\n" + "=".repeat(50));
    simulateNotification(candidates[0], taskDescription);

    // Simuliere Timeout nach 60 Minuten
    console.log("\n" + "".repeat(20));
    console.log("60 Minuten vergangen - Keine Bestätigung erhalten!");
    console.log("Aufgabe wird an nächsten Kandidaten weitergeleitet...");
    console.log("".repeat(20));

    if (candidates.length > 1) {
        simulateNotification(candidates[1], taskDescription, true);
        
        // Weiteres Timeout simulieren
        console.log("\n" + "".repeat(20));
        console.log("Erneut 60 Minuten vergangen - Keine Bestätigung!");
        console.log("Aufgabe wird an nächsten Kandidaten weitergeleitet...");
        console.log("".repeat(20));

        if (candidates.length > 2) {
            simulateNotification(candidates[2], taskDescription, true);
        } else {
            console.log("\nKeine weiteren Kandidaten verfügbar!");
            console.log("Aufgabe wird als 'expired' markiert und beim nächsten Durchlauf neu verteilt.");
        }
    } else {
        console.log("\nKeine weiteren Kandidaten verfügbar!");
        console.log("Aufgabe wird als 'expired' markiert und beim nächsten Durchlauf neu verteilt.");
    }

    console.log("\n=== TIMEOUT-SZENARIO TEST ENDE ===");
}

// Test ausführen
simulateTimeoutScenario().then(() => {
    console.log("\n Test abgeschlossen");
}).catch(error => {
    console.error("Fehler im Test:", error);
});