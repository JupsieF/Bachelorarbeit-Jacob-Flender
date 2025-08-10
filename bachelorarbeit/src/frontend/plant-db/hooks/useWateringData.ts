import { useState, useEffect } from "react";
import { WateringData } from "@/types/wateringData";
import { fetchWateringData } from "@/utils/fetchWateringData";

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
