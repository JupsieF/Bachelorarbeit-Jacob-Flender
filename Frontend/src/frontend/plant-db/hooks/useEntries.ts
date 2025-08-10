import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import { Entry } from "@/types/entry";

export function useEntries(enabled: boolean = true) {
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!enabled) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data, error: supaError } = await supabase
                    .from('plant')
                    .select(`
              id,
              name,
              image_url,
              location!inner(name)
            `);

                if (supaError) {
                    throw supaError;
                }

                const mapped: Entry[] = (data ?? []).map(row => ({
                    id: row.id,
                    name: row.name ?? '',
                    imageUrl: row.image_url ?? undefined,
                    locationName: row.location?.name ?? ''
                }));

                setEntries(mapped);
            } catch (err: any) {
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [enabled]);

    return { entries, loading, error };
}