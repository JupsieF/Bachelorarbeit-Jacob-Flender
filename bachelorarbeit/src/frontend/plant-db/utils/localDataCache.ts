import { supabase } from "./supabase";
import type { PlantCareEntry } from "@/types/plantCareEntry";
import type { Location } from "@/types/location";

// Cache mit Zeitstempel
let floorsCache: number[] = [];
let profilesCache: PlantCareEntry[] = [];
let locationsCache: Map<number, Location[]> = new Map();
let lastCacheUpdate: number = 0;

// Cache-Lebensdauer (1 Stunde)
const CACHE_TTL = 1000 * 60 * 60;

// Prüft ob Cache noch gültig ist
function isCacheValid(): boolean {
    const now = Date.now();
    return lastCacheUpdate > 0 && (now - lastCacheUpdate) < CACHE_TTL;
}

export async function ensureFloorsAndProfiles() {
    try {
        // Cache nur nutzen wenn er gültig ist
        if (floorsCache.length && profilesCache.length && isCacheValid()) {
            return;
        }

        // Cache ist abgelaufen oder leer -> neu laden
        const { data: floorData, error: floorError } = await supabase
            .schema("bachelor_baseplant_jacob_flender")
            .from("location")
            .select("floor");

        if (floorError) throw floorError;

        const uniqueFloors = Array.from(
            new Set(floorData?.map((d) => d.floor).filter((f): f is number => f != null))
        ).sort((a, b) => a - b);

        floorsCache = uniqueFloors;

        const { data: profiles, error: profileError } = await supabase
            .schema("bachelor_baseplant_jacob_flender")
            .from("plant_care")
            .select("id, name, method, interval, volume");

        if (profileError) throw profileError;

        profilesCache = (profiles || [])
            .filter((r): r is PlantCareEntry & { name: string } => !!r.name)
            .map((r) => ({ ...r, name: r.name! }));

        // Cache-Zeitstempel aktualisieren
        lastCacheUpdate = Date.now();

    } catch (err) {
        console.error("Cache-Fehler:", err);
        clearCache();
    }
}

export async function ensureLocations(floor: number) {
    // Cache für dieses Stockwerk nur nutzen wenn gültig
    if (locationsCache.has(floor) && isCacheValid()) return;

    try {
        const { data, error } = await supabase
            .schema("bachelor_baseplant_jacob_flender")
            .from("location")
            .select("id, name, floor")
            .eq("floor", floor)
            .order("name");

        if (error) throw error;

        locationsCache.set(floor, data || []);
        // Cache-Zeitstempel aktualisieren
        lastCacheUpdate = Date.now();

    } catch (err) {
        console.error(`Fehler beim Laden der Locations für Stock ${floor}:`, err);
        locationsCache.delete(floor); // Ungültigen Cache entfernen
    }
}

// Bestehende Getter bleiben unverändert
export function getFloors(): number[] {
    return [...floorsCache];
}

export function getProfiles(): PlantCareEntry[] {
    return [...profilesCache];
}

export function getLocations(floor: number): Location[] {
    return [...(locationsCache.get(floor) || [])];
}

// Cache manuell leeren
export function clearCache() {
    floorsCache = [];
    profilesCache = [];
    locationsCache.clear();
    lastCacheUpdate = 0;
}

// Optional: Prüft ob Cache erneuert werden muss
export function shouldRefreshCache(): boolean {
    return !isCacheValid();
}