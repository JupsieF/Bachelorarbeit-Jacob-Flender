import supabase from "@/backend/api/backendConnection";
import { Booking } from "@/shared/types/booking";
import { UserDetails } from "@/shared/types/user";


/**
 * Fügt alle User aus den Bookings als Employees in die DB ein (falls noch nicht vorhanden).
 * Die SlackID wird immer auf die aus den MockBookings gesetzt (Debug-Modus).
 */
export async function seedEmployeesFromBookings(
    bookings: { data?: Booking[] }[],
    mockSlackID: string
) {
    // Sammle alle User aus den Bookings
    const users: UserDetails[] = [];
    bookings.forEach(floorBookings => {
        (floorBookings.data ?? []).forEach(booking => {
            if (
                booking.user &&
                booking.user.email &&
                !users.some(u => u.email === booking.user!.email)
            ) {
                users.push(booking.user);
            }
        });
    });

    if (users.length === 0) {
        console.log("Keine User in den Bookings gefunden.");
        return;
    }

    // Hole bereits existierende Employees (nach E-Mail)
    const emails = users.map(u => u.email.toLowerCase());
    const { data: existing, error } = await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("employee")
        .select("mail");

    const existingEmails = new Set(
        (existing ?? []).map(e => (e.mail ?? "").toLowerCase())
    );

    // Filtere neue User heraus
    const newUsers = users.filter(
        u => !existingEmails.has(u.email.toLowerCase())
    );

    if (newUsers.length === 0) {
        console.log("Alle User aus den Bookings sind bereits in der Employee-Tabelle.");
        return;
    }

    // Baue Insert-Objekte mit deiner SlackID
    const toInsert = newUsers.map(u => ({
        mail: u.email,
        real_name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
        slack_id: mockSlackID,
    }));

    const { error: insertError } = await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("employee")
        .insert(toInsert);

    if (insertError) {
        console.error("Fehler beim Einfügen der Employees aus Bookings:", insertError);
    } else {
        console.log(`Es wurden ${toInsert.length} neue Employees aus Bookings eingefügt (alle mit SlackID ${mockSlackID}).`);
    }
}