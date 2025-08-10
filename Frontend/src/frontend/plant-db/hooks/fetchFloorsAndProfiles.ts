import { useState, useEffect } from "react";
import { PlantCareEntry } from "@/types/plantCareEntry";
import {
    ensureFloorsAndProfiles,
    getFloors,
    getProfiles,
} from "@/utils/localDataCache";

/**
 * React-Hook zum Laden von Stockwerken und Pflegeprofilen.
 *
 * Dieser Hook versucht zunächst, lokale Daten für Stockwerke und Pflegeprofile zu laden.
 * Falls keine lokalen Daten vorhanden sind, werden die Informationen von der API `/api/location` abgerufen.
 * Die geladenen Stockwerke und Pflegeprofile werden als State-Variablen bereitgestellt.
 * Zusätzlich werden Lade- und Fehlerzustände verwaltet.
 *
 * @returns Ein Objekt mit folgenden Eigenschaften:
 * - `floors`: Array der verfügbaren Stockwerke (als Zahlen).
 * - `careProfiles`: Array der verfügbaren Pflegeprofile.
 * - `loadingProfiles`: Boolean, der angibt, ob die Profile gerade geladen werden.
 * - `error`: Fehlernachricht, falls beim Laden ein Fehler aufgetreten ist.
 */
export function useFloorsAndProfiles() {
    const [floors, setFloors] = useState<number[]>([]);
    const [loadingProfiles, setLoadingProfiles] = useState(false);
    const [careProfiles, setCareProfiles] = useState<PlantCareEntry[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            try {
                setLoadingProfiles(true);
                setError(null);

                await ensureFloorsAndProfiles();
                const localFloors = getFloors();
                const localProfiles = getProfiles();

                if (localFloors.length > 0) {
                    setFloors(localFloors);
                    setCareProfiles(localProfiles);
                    return;
                }

                const res = await fetch("/api/location");
                const json = await res.json();

                if (!res.ok) {
                    throw new Error(
                        json.error || "Fehler beim Laden der Standorte"
                    );
                }

                const uniqueFloors = Array.from(
                    new Set(json.map((loc: any) => loc.floor))
                )
                    .filter((f): f is number => typeof f === "number")
                    .sort((a, b) => a - b);

                setFloors(uniqueFloors);
            } catch (err: any) {
                setError(err.message);
                console.error("Fehler beim Laden:", err);

                const localFloors = getFloors();
                const localProfiles = getProfiles();
                if (localFloors.length > 0) {
                    setFloors(localFloors);
                    setCareProfiles(localProfiles);
                }
            } finally {
                setLoadingProfiles(false);
            }
        };
        init();
    }, []);

    return { floors, careProfiles, loadingProfiles, error };
}

/**
 * React-Hook zum Abrufen und Verwalten von Detaildaten einer ausgewählten Pflanze.
 *
 * Dieser Hook lädt die Bewässerungsdetails (Intervall in Tagen und Volumen in Milliliter)
 * für eine Pflanze anhand der übergebenen ID. Die Daten werden von einer API abgerufen.
 * Zusätzlich werden Lade- und Fehlerzustände verwaltet.
 *
 * @param chosenId Die ID der ausgewählten Pflanze oder `null`, falls keine Pflanze ausgewählt ist.
 * @returns Ein Objekt mit folgenden Eigenschaften:
 * - `loading`: Gibt an, ob die Daten gerade geladen werden.
 * - `error`: Enthält eine Fehlermeldung, falls ein Fehler aufgetreten ist, sonst `null`.
 * - `interval`: Das Bewässerungsintervall in Tagen.
 * - `volume`: Das Bewässerungsvolumen in Milliliter.
 * - `setInterval`: Setter-Funktion für das Intervall.
 * - `setVolume`: Setter-Funktion für das Volumen.
 * - `setError`: Setter-Funktion für den Fehlerzustand.
 */
export function usePlantDetails(chosenId: number | null) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [interval, setInterval] = useState<number>();
    const [volume, setVolume] = useState<number>();

    useEffect(() => {
        async function fetchDetails() {
            if (!chosenId) return;
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(
                    `/api/watering?name=${encodeURIComponent(
                        chosenId.toString()
                    )}&type=chosen`
                );
                const json = await res.json();
                if (
                    res.ok &&
                    typeof json.amount_ml === "number" &&
                    typeof json.interval_days === "number"
                ) {
                    setInterval(json.interval_days);
                    setVolume(json.amount_ml);
                } else {
                    setError("Fehler beim Laden der Detaildaten.");
                }
            } catch {
                setError("Netzwerkfehler beim Laden der Detaildaten.");
            } finally {
                setLoading(false);
            }
        }

        fetchDetails();
    }, [chosenId]);

    return {
        loading,
        error,
        interval,
        volume,
        setInterval,
        setVolume,
        setError,
    };
}
