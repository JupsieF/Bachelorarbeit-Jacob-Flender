import { Booking } from "@/shared/types/booking";
import { UserDetails } from "@/shared/types/user";

const userA: UserDetails = {
    id: "user-a-id",
    firstName: "Anna",
    lastName: "Moldawien",
    email: "anna.moldawien@basecom.de",
    slackID: "SLACKID_A",
    employeeId: 1,
};

const userB: UserDetails = {
    id: "user-b-id",
    firstName: "Ben",
    lastName: "Luxemburg",
    email: "ben.luxemburg@basecom.de",
    slackID: "SLACKID_B",
    employeeId: 2,
};

export const mockBookings: { data: Booking[] }[] = [
    {
        data: [
            {
                user: userA,
                resource: { 
                    id: "0305574a-6218-4994-82b3-c5a0a109dc0e",
                    name: "Moldawien" 
                },
                bookingStartDateTime: "2025-08-01T08:00:00Z",
                floor: { id: "1337", name: "1" },
            },
            {
                user: userB,
                resource: { 
                    id: "0da0bc8d-9bef-4b85-84da-8763fd8f0b10",
                    name: "Luxemburg" 
                },
                bookingStartDateTime: "2025-08-01T08:00:00Z",
                floor: { id: "1337", name: "1" },
            },
        ],
    },
];