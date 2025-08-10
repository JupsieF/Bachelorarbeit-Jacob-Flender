import { useEffect } from "react";

/**
 * React-Hook zum Zurücksetzen des Pflanzenformulars.
 *
 * Setzt die Vorschläge, die ausgewählte Pflanzen-ID, den Fehlerstatus,
 * das Intervall und das Volumen auf ihre Anfangswerte zurück, sobald sich der Pflanzenname ändert.
 *
 * @param newName Der neue Name der Pflanze.
 * @param setSuggestions Funktion zum Setzen der Vorschlagsliste.
 * @param setChosenId Funktion zum Setzen der ausgewählten Pflanzen-ID.
 * @param setFetchError Funktion zum Setzen des Fehlerstatus beim Abrufen.
 * @param setNewInterval Funktion zum Setzen des neuen Intervalls.
 * @param setNewVolume Funktion zum Setzen des neuen Volumens.
 */
export function useResetPlantForm({
    newName,    setSuggestions,
    setChosenId,
    setFetchError,
    setNewInterval,
    setNewVolume,
}: {
    newName: string;
    setSuggestions: (s: any[]) => void;
    setChosenId: (id: number | null) => void;
    setFetchError: (e: string | null) => void;
    setNewInterval: (v: number | undefined) => void;
    setNewVolume: (v: number | undefined) => void;
}) {
    useEffect(() => {
        setSuggestions([]);
        setChosenId(null);
        setFetchError(null);
        setNewInterval(undefined);
        setNewVolume(undefined);
    }, [
        newName,
        setSuggestions,
        setChosenId,
        setFetchError,
        setNewInterval,
        setNewVolume,
    ]);
}
