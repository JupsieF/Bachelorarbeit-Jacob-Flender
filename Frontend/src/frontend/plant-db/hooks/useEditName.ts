import { useState, useEffect } from "react";
import type { PlantCareEntry } from "@/types/plantCareEntry";

/**
 * Hook to manage the "name" field state when editing a PlantCareEntry.
 * Initializes the value when editingId or entries change.
 */
export function useEditName(
    editingId: number | null,
    careEntries: PlantCareEntry[]
  ) {
    const [newName, setNewName] = useState<string>('');
  
    useEffect(() => {
      if (editingId === null) {
        setNewName('');
        return;
      }
  
      const entry = careEntries.find((e) => e.id === editingId);
      if (!entry) {
        setNewName('');
        return;
      }
  
      setNewName(entry.name ?? '');
    }, [editingId, careEntries]);
  
    return { newName, setNewName };
  }
  