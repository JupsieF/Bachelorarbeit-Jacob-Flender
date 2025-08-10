export type WateringTask = {
    // Aus watering_task
    id: number;
    plant_id: number;
    assigned_user_id: number | null;
    status: string;
    notified_at: string | null;
    reminder_at: string | null;
    created_at: string | null;

    // aus Plant_Schedule
    last_watered: string | null;
    next_watering: string | null;

    // aus Plant -> Plant_Care
    interval: number | null;
    volume: number | null;
    method: string | null;

    // aus Location
    location_id: string;
    location_name: string;
    deskly_id: string;
    floor: number | null;

    // aus Plant
    plant_name: string | null;
    image_url: string | null;
};

export type TaskDescription = {
    task_id: number;
    plant_name: string | null;
    location_name: string;
    volume: number | null;
    method: string | null;
    image_url?: string | null;
};
