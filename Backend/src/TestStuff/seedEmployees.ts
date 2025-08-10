import supabase from "@/backend/api/backendConnection";
import { Booking } from "@/shared/types/booking";
import { UserDetails } from "@/shared/types/user";

/**
 * Fügt neue Mitarbeiter basierend auf den Buchungen in die Employee-Tabelle ein.
 * 
 * Diese Funktion extrahiert eindeutige Benutzer aus den übergebenen Buchungen und prüft,
 * ob deren E-Mail-Adressen bereits in der Employee-Tabelle vorhanden sind. Für alle neuen
 * Benutzer werden entsprechende Einträge mit einer angegebenen Slack-ID erstellt.
 * 
 * @param bookings - Array von Buchungsobjekten, die Benutzerdaten enthalten können.
 * @param mockSlackID - Die Slack-ID, die für alle neuen Mitarbeiter gesetzt wird.
 * 
 * @remarks
 * - Gibt eine Konsolenmeldung aus, wenn keine neuen Benutzer gefunden oder eingefügt werden.
 * - Gibt eine Fehlermeldung aus, falls das Einfügen fehlschlägt.
 */
export async function seedEmployeesFromBookings(
    bookings: { data?: Booking[] }[],
    mockSlackID: string
) {
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

    const emails = users.map(u => u.email.toLowerCase());
    const { data: existing, error } = await supabase
        .schema("bachelor_baseplant_jacob_flender")
        .from("employee")
        .select("mail");

    const existingEmails = new Set(
        (existing ?? []).map(e => (e.mail ?? "").toLowerCase())
    );

    const newUsers = users.filter(
        u => !existingEmails.has(u.email.toLowerCase())
    );

    if (newUsers.length === 0) {
        console.log("Alle User aus den Bookings sind bereits in der Employee-Tabelle.");
        return;
    }

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