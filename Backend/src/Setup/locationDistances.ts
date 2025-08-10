import { 
    fetchLocations, 
    deleteDistancePairsForFloor, 
    insertDistancePairs,
    getDistancePairsCount,
    fetchDistancePairsBatch
} from "../backend/api/supabaseService";
import { DistancePair, LocationProperties } from "../shared/types/locationData";

/**
 * Berechnet die Distanzen zwischen allen Standorten auf jedem Stockwerk und speichert diese in der Datenbank.
 * 
 * Die Funktion führt folgende Schritte aus:
 * 1. Holt Standortdaten aus der Datenquelle.
 * 2. Filtert und gruppiert die Standorte nach Stockwerk.
 * 3. Löscht bestehende Distanzpaare für jedes Stockwerk.
 * 4. Berechnet die Distanzen zwischen allen möglichen Standortpaaren auf demselben Stockwerk (inklusive Distanz zu sich selbst).
 * 5. Speichert die berechneten Distanzpaare in der Datenbank.
 * 
 * Fehler werden im Fehlerfall in der Konsole ausgegeben.
 * 
 * @returns {Promise<void>} Ein Promise, das abgeschlossen wird, sobald alle Distanzen berechnet und gespeichert wurden.
 */
export async function calculateAndStoreDistances(): Promise<void> {
    try {
        const { data: locationData, error } = await fetchLocations();

        if (error) throw error;
        if (!locationData || locationData.length === 0) {
            console.log("No location data found.");
            return;
        }

        const locations: LocationProperties[] = locationData.map(
            (loc: {
                name: string;
                deskly_id: string;
                id: number;
                x_value: number | null;
                y_value: number | null;
                floor: number | null;
            }) => ({
                name: loc.name,
                desklyID: loc.deskly_id ?? String(loc.id),
                x: loc.x_value ?? 0,
                y: loc.y_value ?? 0,
                floor: loc.floor ?? 0,
            })
        );

        const validLocations = locations.filter(
            (loc) => loc.desklyID.trim() !== ""
        );

        const grouped: Record<number, LocationProperties[]> = {};
        validLocations.forEach((loc) => {
            if (!grouped[loc.floor]) grouped[loc.floor] = [];
            grouped[loc.floor].push(loc);
        });

        for (const floorKey in grouped) {
            const floor = Number(floorKey);
            const floorLocations = grouped[floor];

            await deleteDistancePairsForFloor(floor);

            const toInsert: Array<{
                from_id: string;
                to_id: string;
                from_label: string;
                to_label: string;
                distance: number;
                floor: number;
            }> = [];

            for (let i = 0; i < floorLocations.length; i++) {
                for (let j = i + 1; j < floorLocations.length; j++) {
                    const a = floorLocations[i];
                    const b = floorLocations[j];
                    const d = Math.hypot(b.x - a.x, b.y - a.y);

                    toInsert.push({
                        from_id: a.desklyID,
                        to_id: b.desklyID,
                        from_label: a.name,
                        to_label: b.name,
                        distance: d,
                        floor,
                    });
                }
            }

            floorLocations.forEach((a) => {
                toInsert.push({
                    from_id: a.desklyID,
                    to_id: a.desklyID,
                    from_label: a.name,
                    to_label: a.name,
                    distance: 0,
                    floor,
                });
            });

            const { error: insertError } = await insertDistancePairs(toInsert);

            if (insertError)
                console.error("Error inserting distance pairs:", insertError);
        }

        console.log("Distance pairs calculated and stored.");
    } catch (err) {
        console.error("Error in calculateAndStoreDistances:", err);
    }
}

/**
 * Lädt alle Distanzpaare zwischen Standorten aus der Datenbank und gruppiert sie nach Stockwerk.
 * Die Daten werden in Batches abgefragt, um große Datenmengen effizient zu verarbeiten.
 * 
 * @returns Ein Promise, das ein Objekt mit Stockwerksnummern als Schlüssel und Arrays von `DistancePair` als Wert zurückgibt.
 * 
 * @throws Gibt im Fehlerfall ein leeres Objekt zurück und loggt den Fehler in der Konsole.
 */
export async function loadDistancePairs(): Promise<Record<number, DistancePair[]>> {
    const pageSize = 1000;
    const rawData: Array<{
        from_label: string | null;
        from_id: string;
        floor: number;
        to_label: string | null;
        to_id: string;
        distance: number | null;
    }> = [];
    const distanceByFloor: Record<number, DistancePair[]> = {};

    try {
        const { count, error: countError } = await getDistancePairsCount();

        if (countError) throw countError;
        const totalRows = count ?? 0;

        for (let offset = 0; offset < totalRows; offset += pageSize) {
            const { data, error } = await fetchDistancePairsBatch(offset, pageSize);

            if (error) throw error;
            if (data && data.length > 0) {
                console.log(`📦 Batch ${offset / pageSize + 1}: fetched ${data.length} rows`);
                rawData.push(...data);
            }
        }

        rawData.forEach(row => {
            const pair: DistancePair = {
                from: {
                    name: row.from_label as string,
                    desklyID: row.from_id,
                    x: -1,
                    y: -1,
                    floor: row.floor as number,
                },
                to: {
                    name: row.to_label as string,
                    desklyID: row.to_id,
                    x: -1,
                    y: -1,
                    floor: row.floor as number,
                },
                distance: row.distance as number,
            };

            const f = row.floor as number;
            if (!distanceByFloor[f]) distanceByFloor[f] = [];
            distanceByFloor[f].push(pair);
        });

        return distanceByFloor;
    } catch (err) {
        console.error("Error loading distance pairs:", err);
        return distanceByFloor;
    }
}

/**
 * Analysiert die Distanzpaare zwischen Standorten pro Stockwerk.
 *
 * Diese Funktion lädt Standortdaten, gruppiert sie nach Stockwerk und berechnet für jedes Stockwerk:
 * - Die Anzahl der Plätze
 * - Die Anzahl ungerichteter Paare (ohne Selbst-Paare)
 * - Die Anzahl der Selbst-Paare (A→A)
 * - Die Gesamtanzahl der Paare (ungerichtet + Selbst-Paare)
 *
 * Die Ergebnisse werden für jedes Stockwerk sowie als Gesamtanalyse in der Konsole ausgegeben.
 *
 * Fehler beim Laden oder Verarbeiten der Daten werden ebenfalls in der Konsole ausgegeben.
 *
 * @returns {Promise<void>} Ein Promise, das abgeschlossen wird, wenn die Analyse beendet ist.
 */
export async function analyzeLocationDistances(): Promise<void> {
    try {
        const { data: locationData, error } = await fetchLocations();

        if (error) throw error;
        if (!locationData || locationData.length === 0) {
            console.log("No location data found.");
            return;
        }

        const locations = locationData
            .map(loc => ({
                name: loc.name,
                desklyID: loc.deskly_id ?? String(loc.id),
                floor: loc.floor ?? 0,
            }))
            .filter(loc => loc.desklyID.trim() !== "");

        const grouped: Record<number, typeof locations> = {};
        locations.forEach((loc) => {
            if (!grouped[loc.floor]) grouped[loc.floor] = [];
            grouped[loc.floor].push(loc);
        });

        console.log("\nAnalyse der Distanzpaare pro Stockwerk:");
        console.log("=====================================");
        
        let totalLocations = 0;
        let totalPairs = 0;

        for (const floor in grouped) {
            const n = grouped[floor].length;
            const undirected = (n * (n - 1)) / 2;
            const selfPairs = n;
            const totalFloor = undirected + selfPairs;

            console.log(`\nStockwerk ${floor}:`);
            console.log(`- Anzahl Plätze: ${n}`);
            console.log(`- Ungerichtete Paare (ohne Selbst-Paare): ${undirected} = n*(n-1)/2 = ${n}*(${n}-1)/2`);
            console.log(`- Selbst-Paare (A→A): ${selfPairs} = n = ${n}`);
            console.log(`- Gesamt Paare: ${totalFloor} = n*(n+1)/2 = ${n}*(${n}+1)/2`);

            totalLocations += n;
            totalPairs += totalFloor;
        }

        console.log("\nGesamtanalyse:");
        console.log("=============");
        console.log(`Gesamtzahl Plätze: ${totalLocations}`);
        console.log(`Gesamtzahl Paare (ungerichtet + Selbst-Paare): ${totalPairs} = Σ(n_i*(n_i+1)/2)`);

    } catch (err) {
        console.error("Error in analyzeLocationDistances:", err);
    }
}

// CLI-Handler
async function cli() {
    const args = process.argv.slice(2);
    if (args.includes("--calc")) {
        await calculateAndStoreDistances();
        process.exit(0);
    }
    if (args.includes("--load")) {
        await loadDistancePairs();
        process.exit(0);
    }
    if (args.includes("--analyze")) {
        await analyzeLocationDistances();
        process.exit(0);
    }
}

// CLI-Dispatcher
if (import.meta.url === `file://${process.cwd()}/src/Setup/locationDistances.ts`) {
    cli();
}