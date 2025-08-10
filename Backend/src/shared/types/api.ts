import { Booking } from "./booking";

export type ApiResponse = {
    status: string;
    data: Booking[];
};

export type UserApiResponse = {
    status: string;
    data?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
};