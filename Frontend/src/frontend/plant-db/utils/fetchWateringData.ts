import { WateringData } from "@/types/wateringData";

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
