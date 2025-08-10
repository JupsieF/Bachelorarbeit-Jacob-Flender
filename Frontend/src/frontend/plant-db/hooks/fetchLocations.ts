import { useState, useEffect } from "react";
import { ensureLocations, getLocations } from "@/utils/localDataCache";
import { Location } from "@/types/location";

/**
 * React-Hook zum Abrufen der Standorte für ein ausgewähltes Stockwerk.
 *
 * Dieser Hook verwaltet den Zustand der Standorte (`locations`) basierend auf dem aktuell ausgewählten Stockwerk (`selectedFloor`).
 * Wenn kein Stockwerk ausgewählt ist, wird die Standortliste geleert.
 * Andernfalls werden die Standorte für das angegebene Stockwerk asynchron geladen und gesetzt.
 *
 * @param selectedFloor Die Nummer des ausgewählten Stockwerks oder `undefined`, falls kein Stockwerk ausgewählt ist.
 * @returns Ein Array von Standorten (`Location[]`) für das ausgewählte Stockwerk.
 */
export function useLocations(selectedFloor: number | undefined) {
    const [locations, setLocations] = useState<Location[]>([]);

    useEffect(() => {
        const init = async () => {
            if (selectedFloor == null) {
                setLocations([]);
                return;
            }

            await ensureLocations(selectedFloor);

            setLocations(getLocations(selectedFloor));
        };

        init();
    }, [selectedFloor]);

    return locations;
}
