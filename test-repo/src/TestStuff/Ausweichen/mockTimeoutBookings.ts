import { Booking } from "@/shared/types/booking";
import { UserDetails } from "@/shared/types/user";

// Drei Nutzer fuer das Timeout-Szenario
const userA: UserDetails = {
    id: "timeout-user-a",
    firstName: "Maria",
    lastName: "Schmidt",
    email: "maria.schmidt@basecom.de",
    slackID: "U_MARIA_TIMEOUT",
    employeeId: 10,
};

const userB: UserDetails = {
    id: "timeout-user-b",
    firstName: "Thomas",
    lastName: "Weber",
    email: "thomas.weber@basecom.de",
    slackID: "U_THOMAS_TIMEOUT",
    employeeId: 11,
};

const userC: UserDetails = {
    id: "timeout-user-c",
    firstName: "Sandra",
    lastName: "Miller",
    email: "sandra.miller@basecom.de",
    slackID: "U_SANDRA_TIMEOUT",
    employeeId: 12,
};

export const mockTimeoutBookings: { data: Booking[] }[] = [
    {
        data: [
            {
                user: userA,
                resource: {
                    id: "25e675ba-11d8-4860-baba-ee8eb82cfcc8",
                    name: "Norwegen", // Geringste Distanz (Platz der Pflanze)
                },
                bookingStartDateTime: "2025-08-01T08:00:00Z",
                floor: { id: "floor-1", name: "1" },
            },
            {
                user: userB,
                resource: {
                    id: "c9258d4e-8c2b-4da6-9d82-1c97c5f2d65e",
                    name: "Litauen", // Zweitnaechste Distanz
                },
                bookingStartDateTime: "2025-08-01T08:00:00Z",
                floor: { id: "floor-1", name: "1" },
            },
            {
                user: userC,
                resource: {
                    id: "0da0bc8d-9bef-4b85-84da-8763fd8f0b10",
                    name: "Luxemburg", // Drittgroesste Distanz
                },
                bookingStartDateTime: "2025-08-01T08:00:00Z",
                floor: { id: "floor-1", name: "1" },
            },
        ],
    },
];

export { userA, userB, userC };
