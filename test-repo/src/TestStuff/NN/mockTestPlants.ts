import { WateringTask } from "@/shared/types/task";

export const mockWateringTasks: WateringTask[] = [
    {
        id: 1,
        plant_id: 1,
        assigned_user_id: null,
        status: "pending",
        notified_at: null,
        reminder_at: null,
        created_at: null,
        last_watered: null,
        next_watering: null,
        interval: 7,
        volume: 200,
        method: "nur die Erde gießen",
        location_id: "33", // Norwegen ID aus der Datenbank: location-Relation
        location_name: "Norwegen 🇳🇴",
        deskly_id: "25e675ba-11d8-4860-baba-ee8eb82cfcc8",   // Norwegen ID aus der Datenbank: location-Relation
        floor: 1,
        plant_name: "Norwegen-Pflanze",
        image_url: null,
    },
];