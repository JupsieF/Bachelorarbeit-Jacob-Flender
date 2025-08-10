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
    return lastCacheUpdate > 0 && now - lastCacheUpdate < CACHE_TTL;
}

/**
 * Stellt sicher, dass die Listen der Stockwerke und Pflegeprofile im lokalen Cache aktuell sind.
 *
 * Lädt die Daten neu von der Datenbank, falls der Cache leer oder abgelaufen ist.
 * Aktualisiert die globalen Cache-Variablen `floorsCache` und `profilesCache` sowie den Zeitstempel `lastCacheUpdate`.
 * Bei Fehlern wird der Cache geleert und eine Fehlermeldung ausgegeben.
 *
 * @throws Gibt einen Fehler aus und leert den Cache, falls beim Laden der Daten ein Fehler auftritt.
 */
export async function ensureFloorsAndProfiles() {
    try {
        if (floorsCache.length && profilesCache.length && isCacheValid()) {
            return;
        }

        const { data: floorData, error: floorError } = await supabase
            .schema("bachelor_baseplant_jacob_flender")
            .from("location")
            .select("floor");

        if (floorError) throw floorError;

        const uniqueFloors = Array.from(
            new Set(
                floorData
                    ?.map((d) => d.floor)
                    .filter((f): f is number => f != null)
            )
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

        lastCacheUpdate = Date.now();
    } catch (err) {
        console.error("Cache-Fehler:", err);
        clearCache();
    }
}

/**
 * Stellt sicher, dass die Standorte für das angegebene Stockwerk im Cache vorhanden und gültig sind.
 * Lädt die Daten aus der Datenbank, falls der Cache ungültig ist oder keine Daten für das Stockwerk vorhanden sind.
 * Aktualisiert den Cache-Zeitstempel nach erfolgreichem Laden.
 * Entfernt ungültige Cache-Einträge bei Fehlern.
 *
 * @param floor - Die Nummer des Stockwerks, für das die Standorte geladen werden sollen.
 */
export async function ensureLocations(floor: number) {
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

        lastCacheUpdate = Date.now();
    } catch (err) {
        console.error(
            `Fehler beim Laden der Locations für Stock ${floor}:`,
            err
        );
        locationsCache.delete(floor);
    }
}

export function getFloors(): number[] {
    return [...floorsCache];
}

export function getProfiles(): PlantCareEntry[] {
    return [...profilesCache];
}

export function getLocations(floor: number): Location[] {
    return [...(locationsCache.get(floor) || [])];
}

export function clearCache() {
    floorsCache = [];
    profilesCache = [];
    locationsCache.clear();
    lastCacheUpdate = 0;
}

/**
 * Überprüft, ob der lokale Cache aktualisiert werden sollte.
 * Gibt `true` zurück, wenn der Cache ungültig ist und eine Aktualisierung erforderlich ist.
 *
 * @returns {boolean} `true`, wenn der Cache aktualisiert werden sollte, andernfalls `false`.
 */
export function shouldRefreshCache(): boolean {
    return !isCacheValid();
}
