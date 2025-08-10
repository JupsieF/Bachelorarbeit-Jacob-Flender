import { ApiResponse, UserApiResponse } from "../../shared/types/api";
import { Booking } from "../../shared/types/booking";
import { UserDetails } from "../../shared/types/user";
import { fetchEmployeesFromSupabase } from "./supabaseService";

const desklyKey = process.env.DESKLY_KEY;
const basecomLocationID =
    process.env.BASECOM_LOCATIONID || process.env.BASECOM_LOCATION_ID;

/**
 * Ergänzt UserDetails aus deskly um employeeId und slackID aus der DB.
 */
export async function enrichDesklyUsersWithEmployeeData(
    users: UserDetails[]
): Promise<UserDetails[]> {
    const emails = users.map((u) => u.email?.toLowerCase()).filter(Boolean);
    if (!emails.length) return users;

    const employees = await fetchEmployeesFromSupabase();
    if (!employees) {
        return users;
    }

    const emailToEmployee = new Map<
        string,
        { id: number; slack_id: string | null }
    >();
    interface Employee {
        id: number;
        mail: string;
        slack_id: string | null;
    }

    (employees as Employee[] ?? []).forEach((emp: Employee) => {
        if (emp.mail && emp.id) {
            emailToEmployee.set(emp.mail.toLowerCase(), {
                id: emp.id,
                slack_id: emp.slack_id,
            });
        }
    });

    return users.map((user) => {
        const emp = emailToEmployee.get(user.email?.toLowerCase() ?? "");
        return {
            ...user,
            employeeId: emp?.id,
            slackID: emp?.slack_id ?? "",
        };
    });
}

/**
 * Holt alle Buchungen für einen bestimmten Stock aus deskly.
 *
 **/
export async function fetchBookingsForFloor(
    floorID: string
): Promise<{ bookings: Booking[] | undefined; users: UserDetails[] }> {
    const today = new Date().toISOString().split("T")[0];
    const options: RequestInit = {
        method: "GET",
        headers: {
            accept: "application/json",
            "X-AUTH-MODE": "API-Key",
            Authorization: desklyKey ?? "",
        },
    };

    try {
        const response = await fetch(
            `https://app.desk.ly/en/api/v2/resourceBooking/list?page[limit]=50&page[offset]=0&date[]=${today}&location=${basecomLocationID}&floor=${floorID}`,
            options
        );

        if (!response.ok) {
            throw new Error(
                `Failed to fetch bookings for floor ${floorID}, status: ${response.status}`
            );
        }

        const res = (await response.json()) as ApiResponse;

        if (res.status.toLowerCase() !== "success") {
            console.log(
                `Unexpected API answer for floor ${floorID}, status was ${res.status}`
            );
            return { bookings: [], users: [] };
        }

        const bookings = res.data;
        const userIDs = bookings
            .map((entry) => entry.user?.id)
            .filter((id): id is string => typeof id === "string");
        const userInfo: UserDetails[] = await fetchUsersByIDs(userIDs);

        return { bookings, users: userInfo };
    } catch (error) {
        console.error(
            `Unexpected error querying bookings for floor ${floorID}`,
            error
        );
        return { bookings: [], users: [] };
    }
}

/**
 * Holt alle UserDetails für eine Liste von User-IDs aus deskly.
 */
async function fetchUsersByIDs(userIDs: string[]): Promise<UserDetails[]> {
    const options: RequestInit = {
        method: "GET",
        headers: {
            accept: "application/json",
            "X-AUTH-MODE": "API-Key",
            Authorization: desklyKey ?? "",
        },
    };

    const users: UserDetails[] = [];
    for (const userID of userIDs) {
        try {
            const response = await fetch(
                `https://app.desk.ly/en/api/v2/user/${userID}`,
                options
            );
            const userRes = (await response.json()) as UserApiResponse;
            if (
                typeof userRes.status === "string" &&
                userRes.status.toLowerCase() === "success" &&
                userRes.data
            ) {
                const { id, firstName, lastName, email } = userRes.data;
                users.push({ id, firstName, lastName, email, slackID: "" });
            } else {
                console.log(`Failed to fetch details for user: ${userID}`);
            }
        } catch (error) {
            console.error(`Error fetching user ${userID}:`, error);
        }
    }
    return users;
}
