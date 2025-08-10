import { listAllSlackUsers } from "@/backend/api/slackService";
import supabase from "@/backend/api/backendConnection";

async function seedEmployeeTable() {
    const users = await listAllSlackUsers();
    if (!users || users.length === 0) {
        console.warn("No Slack users found to seed the employee table.");
        return;
    }

    const mappedUsers = users.map((user) => ({
        real_name: user.name,
        slack_id: user.id,
        mail: user.email,
    }));

    const { data, error } = await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("employee")
        .insert(mappedUsers);

    if (error) {
        console.error("Error seeding employee table:", error);
    } else {
        console.log("Employee table seeded successfully:", data);
    }
}

(async () => {
    await seedEmployeeTable();
})();
