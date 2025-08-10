/**
 * Lädt ein Pflanzenbild zum Server hoch und verknüpft es mit einer angegebenen Pflanzen-ID.
 *
 * @param file - Die Bilddatei, die hochgeladen werden soll.
 * @param plantId - Die ID der Pflanze, der das Bild zugeordnet werden soll.
 * @returns Ein Promise, das die URL des hochgeladenen Bildes als string zurückgibt.
 * @throws Fehler, wenn der Upload fehlschlägt oder die Server-Antwort nicht verarbeitet werden kann.
 */
export async function uploadPlantImage(
    file: File,
    plantId: number
): Promise<string> {
    const body = new FormData();
    body.append("plantId", plantId.toString());
    body.append("image", file);

    console.log("[uploadPlantImage] Starting upload for plantId:", plantId);

    const res = await fetch("/api/plant-image", {
        method: "POST",
        body,
    });

    let payload: any;
    try {
        payload = await res.json();
    } catch (err) {
        console.error("[uploadPlantImage] Failed to parse response:", err);
        throw new Error(
            `Upload-Fehler: Server-Antwort konnte nicht verarbeitet werden (Status ${res.status})`
        );
    }

    if (!res.ok || !payload.success) {
        console.error("[uploadPlantImage] Upload failed:", payload);
        throw new Error(
            payload.error ||
                "Upload fehlgeschlagen ohne spezifische Fehlermeldung"
        );
    }

    if (!payload.imageUrl) {
        console.error("[uploadPlantImage] No imageUrl in response:", payload);
        throw new Error("Keine Bild-URL vom Server erhalten");
    }

    return payload.imageUrl;
}
