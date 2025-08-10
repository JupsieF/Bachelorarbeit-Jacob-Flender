import { Booking } from "@/shared/types/booking";
import {UserDetails } from "@/shared/types/user";

/**
 * Erzeugt Mock-Bookings, bei denen alle Nutzer durch "Jacob Flender" ersetzt werden.
 * @param realBookings Die echten Bookings pro Stockwerk
 * @returns Mock-Bookings mit Jacob Flender als User
 */
export function createMockBookings(realBookings: { data?: Booking[] }[]): { data?: Booking[] }[] {
    // Beispiel-User Jacob Flender
    const jacobUser: UserDetails = {
        id: "jacob deskly id",
        firstName: "Jacob",
        lastName: "Flender",
        email: "jacob mail",
        slackID: "jacob slack id",
        employeeId: 3,
    };


    // Ersetze in allen Bookings den User durch Jacob Flender
    return realBookings.map(floorBookings => ({
        data: (floorBookings.data ?? []).map(booking => ({
            ...booking,
            user: jacobUser
        }))
    }));
}