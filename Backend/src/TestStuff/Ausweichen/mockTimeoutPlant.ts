import { WateringTask } from "@/shared/types/task";

export const mockTimeoutTask: WateringTask = {
    id: 999,
    plant_id: 999,
    assigned_user_id: null,
    status: "pending",
    notified_at: null,
    reminder_at: null,
    created_at: null,
    last_watered: null,
    next_watering: null,
    interval: 7,
    volume: 300,
    method: "nur die Erde giessen",
    location_id: "33",
    location_name: "Norwegen",
    deskly_id: "25e675ba-11d8-4860-baba-ee8eb82cfcc8", 
    floor: 1,
    plant_name: "Timeout-Test-Pflanze",
    image_url: null,
};