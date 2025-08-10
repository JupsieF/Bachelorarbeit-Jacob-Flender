import supabase from "../backend/api/backendConnection";
import fetch, { RequestInit } from "node-fetch";
import { PostgrestError } from "@supabase/supabase-js";

const desklyKey = process.env.DESKLY_KEY;

// FloorRoomIds werden benötigt, um die Ressourceninformationen für jeden Stock zuzugreifen
const floorRoomIds = [
    process.env.FLOOR1_ROOM_ID,
    process.env.FLOOR2_ROOM_ID,
    process.env.FLOOR3_ROOM_ID,
].filter(Boolean); // Entfernt leere Einträge, falls Umgebungsvariablen nicht gesetzt sind

// Type, welcher die Struktur der Antwort von deskly beschreibt
type LocationData = {
    status: string;
    data: {
        id: string;
        name: string;
        resources: Resource[];
    };
};
// Type, welcher die Struktur der Ressourcen beschreibt
type Resource = {
    id: string;
    name: string;
    vertices: [number, number][];
};

// Speichert fehlgeschlagene Abfragen für die Fehlersuche
let failedFloorRoomIds: string[] = [];

/**
 * Hole und verarbeite Ressourcen für eine gegebene floorRoomId.
 */
async function queryResources(floorRoomId: string) {
    const options: RequestInit = {
        method: "GET",
        headers: {
            accept: "application/json",
            "X-AUTH-MODE": "API-Key",
            Authorization: desklyKey ?? "",
        },
    };

    try {
        const response = await fetch(
            `https://app.desk.ly/en/api/v2/room/${floorRoomId}`,
            options
        );
        const res = (await response.json()) as LocationData;

        if (res.status.toLowerCase() !== "success") {
            console.log(
                `Unexpected API response for ${floorRoomId}:`,
                JSON.stringify(res)
            );
            failedFloorRoomIds.push(floorRoomId);
            return;
        }

        // Extrahiere die Ressourceninformationen aus der Antwort
        const resources = res.data.resources.map((resource) => ({
            id: resource.id,
            name: resource.name,
            vertices: resource.vertices || [],
        }));

        console.log(
            `Fetched ${resources.length} resources for floor ${floorRoomId}`
        );

        // Füge die Ressourcen in die Datenbank ein oder aktualisiere sie
        await checkAndInsertEntries(resources, floorRoomId);
    } catch (error) {
        console.error(`Error fetching data for ${floorRoomId}:`, error);
    }
}

/**
 * Schaue nach, ob die Ressourcen in der Datenbank existieren.
 * Füge sie ein, wenn sie fehlen, oder aktualisiere sie, wenn die ID oder Koordinaten abweichen.
 **/
async function checkAndInsertEntries(
    resources: Resource[],
    floorRoomId: string
) {
    let insertFloor = 0;
    if (floorRoomId === floorRoomIds[0]) {
        insertFloor = 1;
    } else if (floorRoomId === floorRoomIds[1]) {
        insertFloor = 2;
    } else {
        insertFloor = 3;
    }

    for (const resource of resources) {
        const { id, name, vertices } = resource;

        // Laufe durch die Vertices und teile sie in x_value und y_value auf
        for (const [x, y] of vertices) {
            try {
                const {
                    data,
                    error,
                }: { data: any; error: PostgrestError | null } = await supabase
                .schema("bachelor_baseplant_jacob_flender")
                    .from("location")
                    .select("name, deskly_id, x_value, y_value, floor")
                    .eq("name", name)
                    .maybeSingle();

                if (error) {
                    console.error(
                        `Error querying database for resource ${name}:`,
                        error
                    );
                    continue;
                }

                if (!data) {
                    const { error: insertError } = await supabase
                    .schema("bachelor_baseplant_jacob_flender")
                        .from("location")
                        .insert({
                            deskly_id: id,
                            name,
                            x_value: x,
                            y_value: y,
                            floor: insertFloor,
                        });

                    if (insertError) {
                        console.error(
                            `Error inserting resource ${name}:`,
                            insertError
                        );
                    }
                } else if (
                    data.deskly_id !== id ||
                    data.x_value !== x ||
                    data.y_value !== y
                ) {
                    // Update die Ressource, wenn die ID oder Koordinaten abweichen
                    const { error: updateError } = await supabase
                    .schema("bachelor_baseplant_jacob_flender")
                        .from("location")
                        .update({
                            deskly_id: id,
                            x_value: x,
                            y_value: y,
                            floor: insertFloor,
                        })
                        .eq("name", name);

                    if (updateError) {
                        console.error(
                            `Error updating resource ${name}`,
                            updateError
                        );
                    } else {
                        console.log(
                            `Resource with name ${name} updated to new id or coordinates.`
                        );
                    }
                } else {
                    console.log(
                        `Resource with name ${name} is already up to date.`
                    );
                }
            } catch (error) {
                console.error(`Unexpected error for ${name}:`, error);
            }
        }
    }
}

/**
 * Laufe durch alle floorRoomIds und rufe die Ressourcen ab.
 */
export async function queryAll() {
    for (const floorRoomId of floorRoomIds) {
        if (typeof floorRoomId === "string") {
            await queryResources(floorRoomId);
        }
    }
}

queryAll();
