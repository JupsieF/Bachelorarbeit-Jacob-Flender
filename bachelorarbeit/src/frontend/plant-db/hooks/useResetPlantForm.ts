import { useEffect } from "react";

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
