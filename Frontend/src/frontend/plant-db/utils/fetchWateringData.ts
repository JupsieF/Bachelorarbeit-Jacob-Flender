import { WateringData } from "@/types/wateringData";

/**
 * Ruft die Bewässerungsdaten für eine Pflanze anhand ihres wissenschaftlichen Namens ab.
 *
 * Sendet eine Anfrage an die interne Bewässerungs-API und gibt die Menge (in ml) sowie das Intervall (in Tagen) zurück,
 * falls die Daten vorhanden und gültig sind. Im Fehlerfall oder bei ungültigen Daten wird `null` zurückgegeben.
 *
 * @param scientificName Der wissenschaftliche Name der Pflanze.
 * @returns Ein Promise, das entweder die Bewässerungsdaten (`WateringData`) oder `null` zurückgibt.
 */
export async function fetchWateringData(
    scientificName: string
): Promise<WateringData | null> {
    try {
        const res = await fetch(
            `/api/watering?name=${encodeURIComponent(scientificName)}`
        );
        if (!res.ok) throw new Error("Watering API error");
        const data = (await res.json()) as Partial<WateringData>;
        if (
            typeof data.amount_ml !== "number" ||
            typeof data.interval_days !== "number"
        ) {
            return null;
        }
        return { amount_ml: data.amount_ml, interval_days: data.interval_days };
    } catch (err) {
        console.warn("fetchWateringData:", err);
        return null;
    }
}
