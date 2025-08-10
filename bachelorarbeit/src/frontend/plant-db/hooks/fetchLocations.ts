// src/hooks/fetchLocations.ts
import { useState, useEffect } from "react";
import { ensureLocations, getLocations } from "@/utils/localDataCache";
import { Location } from "@/types/location";

export function useLocations(selectedFloor: number | undefined) {
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    const init = async () => {
      if (selectedFloor == null) {
        setLocations([]);
        return;
      }

      // Stelle sicher, dass wir für dieses Stockwerk Locations im Cache haben
      await ensureLocations(selectedFloor);
      // Lese die gecachten Locations aus
      setLocations(getLocations(selectedFloor));
    };

    init();
  }, [selectedFloor]);

  return locations;
}
