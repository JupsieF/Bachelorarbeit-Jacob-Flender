import cron from "node-cron";
import { scheduleDueWateringTasks } from "./wateringTaskScheduler";

// Starte alle 5 Minuten (*/5 * * * *)
cron.schedule("*/5 * * * *", async () => {
    console.log(`[${new Date().toISOString()}] Starte lokalen Test-Cron-Job...`);
    await scheduleDueWateringTasks();
    console.log(`[${new Date().toISOString()}] Fertig.`);
});

(async () => {
    await scheduleDueWateringTasks();
})();