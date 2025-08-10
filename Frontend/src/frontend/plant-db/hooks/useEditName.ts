import { useState, useEffect } from "react";
import type { PlantCareEntry } from "@/types/plantCareEntry";

/**
 * Ein benutzerdefinierter Hook, der das Bearbeiten des Namens eines Pflanzeneintrags ermöglicht.
 *
 * @param editingId Die ID des aktuell zu bearbeitenden Eintrags oder `null`, falls kein Eintrag bearbeitet wird.
 * @param careEntries Ein Array von Pflanzeneinträgen, aus denen der zu bearbeitende Eintrag gesucht wird.
 * @returns Ein Objekt mit dem aktuellen neuen Namen (`newName`) und einer Funktion zum Setzen des Namens (`setNewName`).
 */
export function useEditName(
    editingId: number | null,
    careEntries: PlantCareEntry[]
) {
    const [newName, setNewName] = useState<string>("");

    useEffect(() => {
        if (editingId === null) {
            setNewName("");
            return;
        }

        const entry = careEntries.find((e) => e.id === editingId);
        if (!entry) {
            setNewName("");
            return;
        }

        setNewName(entry.name ?? "");
    }, [editingId, careEntries]);

    return { newName, setNewName };
}
