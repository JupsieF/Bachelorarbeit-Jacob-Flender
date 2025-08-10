import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import { Entry } from "@/types/entry";

/**
 * Ein benutzerdefinierter React-Hook zum Abrufen von Pflanzeneinträgen aus der Supabase-Datenbank.
 *
 * @param enabled Gibt an, ob die Daten abgerufen werden sollen. Standardmäßig `true`.
 * @returns Ein Objekt mit den geladenen Einträgen (`entries`), einem Ladezustand (`loading`) und einem Fehlerobjekt (`error`).
 *
 * - `entries`: Ein Array von Einträgen, das die abgerufenen Pflanzen enthält.
 * - `loading`: Ein boolescher Wert, der angibt, ob die Daten gerade geladen werden.
 * - `error`: Ein Fehlerobjekt, falls beim Abrufen der Daten ein Fehler auftritt, sonst `null`.
 *
 * Die Funktion verwendet Supabase, um die Daten aus der Tabelle `plant` zu laden und die zugehörigen Standortnamen (`location.name`) einzubinden.
 */
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
                const { data, error: supaError } = await supabase.from("plant")
                    .select(`
              id,
              name,
              image_url,
              location!inner(name)
            `);

                if (supaError) {
                    throw supaError;
                }

                const mapped: Entry[] = (data ?? []).map((row) => ({
                    id: row.id,
                    name: row.name ?? "",
                    imageUrl: row.image_url ?? undefined,
                    locationName: row.location?.name ?? "",
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
