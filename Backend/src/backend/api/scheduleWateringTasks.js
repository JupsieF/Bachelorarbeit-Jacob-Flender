import { scheduleDueWateringTasks } from "../wateringTaskScheduler/wateringTaskScheduler";

export default async function handler(req, res) {
    await scheduleDueWateringTasks();
    res.status(200).json({ status: "ok" });
}