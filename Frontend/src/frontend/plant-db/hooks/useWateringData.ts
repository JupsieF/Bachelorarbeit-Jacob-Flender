import { useState, useEffect } from "react";
import { WateringData } from "@/types/wateringData";
import { fetchWateringData } from "@/utils/fetchWateringData";

/**
 * React-Hook zum Abrufen von Bewässerungsdaten für eine Pflanze anhand ihres wissenschaftlichen Namens.
 *
 * @param scientificName Der wissenschaftliche Name der Pflanze, für die die Bewässerungsdaten abgerufen werden sollen.
 * @param enabled Gibt an, ob der Hook aktiviert ist und die Daten abgerufen werden sollen.
 * @returns Ein Objekt mit den Bewässerungsdaten (`data`), dem Ladezustand (`loading`) und einem möglichen Fehler (`error`).
 *
 * Der Hook startet den Datenabruf nur, wenn `enabled` auf `true` gesetzt ist und ein wissenschaftlicher Name angegeben wurde.
 * Während des Abrufs wird der Ladezustand aktualisiert und Fehler werden behandelt.
 */
export function useWateringData(scientificName: string, enabled: boolean) {
    const [data, setData] = useState<WateringData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!enabled || !scientificName.trim()) {
            setData(null);
            return;
        }

        let cancelled = false;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const result = await fetchWateringData(scientificName.trim());
                if (!cancelled) {
                    setData(result);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err as Error);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            cancelled = true;
        };
    }, [scientificName, enabled]);

    return { data, loading, error };
}
