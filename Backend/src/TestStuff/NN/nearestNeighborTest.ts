import { mockWateringTasks } from "./mockTestPlants";
import { mockBookings } from "./mockTestBookings";
import { loadDistancePairs } from "@/Setup/locationDistances";
import { UserDetails } from "@/shared/types/user";

interface EnrichedPair {
    distance: number;
    fromUser?: UserDetails;
    toUser?: UserDetails;
    from: any;
    to: any;
}

async function getCandidateForPlant() {
    const plantTask = mockWateringTasks[0];
    const distanceByFloor = await loadDistancePairs();
    const pairs = distanceByFloor[plantTask.floor ?? 1];

    if (!pairs || pairs.length === 0) {
        console.log("Keine Distanzpaare fuerr Stockwerk", plantTask.floor);
        return null;
    }

    const floorBookings = mockBookings[0].data;
    const plantLocationIDs = [plantTask.deskly_id];

    console.log("Pflanze:", plantTask.plant_name, "am Standort:", plantTask.location_name);
    console.log("Verfuegbare Nutzer:", floorBookings.map(b => 
        `${b.user?.firstName} ${b.user?.lastName} (${b.resource?.name})`
    ).join(", "));

    // Filter-Logik wurde dem mainWorkflow.ts nachempfunden
    const validPairs = pairs.filter((pair) => {
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
        console.log("Keine gueltigen Paare gefunden");
        return null;
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
            (booking) =>
                booking.resource &&
                booking.resource.id === pair.from.desklyID &&
                booking.user?.id
        );
        if (bookingForFrom && bookingForFrom.user) {
            newPair.fromUser = bookingForFrom.user;
        }

        const bookingForTo = floorBookings.find(
            (booking) =>
                booking.resource &&
                booking.resource.id === pair.to.desklyID &&
                booking.user?.id
        );
        if (bookingForTo && bookingForTo.user) {
            newPair.toUser = bookingForTo.user;
        }

        return newPair;
    });

    console.log("\nNutzer-Distanzen zur Pflanze (sortiert):");
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

    console.log(`\nKandidatenliste (${candidates.length} Nutzer):`);
    candidates.forEach((candidate, index) => {
        console.log(`   ${index + 1}. ${candidate.firstName} ${candidate.lastName}`);
    });

    const firstCandidate = candidates[0];
    if (firstCandidate) {
        console.log("\n" + "=".repeat(50));
        console.log(`Benachrichtigung an ${firstCandidate.firstName} ${firstCandidate.lastName}`);
        console.log(`   Aufgabe: ${plantTask.plant_name} bewaessern (${plantTask.volume} ml, ${plantTask.method})`);
        console.log("=".repeat(50));
    }

    return firstCandidate;
}

async function runNearestNeighborTest() {
    
    const candidate = await getCandidateForPlant();
    
    if (candidate) {
        console.log(`\nNaechstgelegener Kandidat: ${candidate.firstName} ${candidate.lastName}`);
        console.log(`   Email: ${candidate.email}`);
        console.log(`   SlackID: ${candidate.slackID}`);
    } else {
        console.log("\nKein Kandidat gefunden");
    }

}

runNearestNeighborTest().then(() => {
    console.log("\nTest abgeschlossen");
}).catch(error => {
    console.error("Fehler im Test:", error);
});