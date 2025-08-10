import { useState, useEffect } from "react";
import { PlantCareEntry } from "@/types/plantCareEntry";
import {
    ensureFloorsAndProfiles,
    getFloors,
    getProfiles,
} from "@/utils/localDataCache";

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
                
                // 1. Versuche zuerst lokale Daten zu laden
                await ensureFloorsAndProfiles();
                const localFloors = getFloors();
                const localProfiles = getProfiles();

                // 2. Wenn lokale Daten vorhanden, verwende diese
                if (localFloors.length > 0) {
                    setFloors(localFloors);
                    setCareProfiles(localProfiles);
                    return;
                }

                // 3. Ansonsten: Lade von der API
                const res = await fetch('/api/location');
                const json = await res.json();
                
                if (!res.ok) {
                    throw new Error(json.error || 'Fehler beim Laden der Standorte');
                }

                // Extrahiere unique Floors
                const uniqueFloors = Array.from(
                    new Set(json.map((loc: any) => loc.floor))
                ).filter((f): f is number => typeof f === "number")
                .sort((a, b) => a - b);

                setFloors(uniqueFloors);

            } catch (err: any) {
                setError(err.message);
                console.error('Fehler beim Laden:', err);
                // Fallback: Versuche nochmal lokale Daten
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

// Dieser Hook für API-Zugriffe
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
