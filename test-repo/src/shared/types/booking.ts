import { UserDetails } from './user';

export type BookingFloor = {
    id: string;
    name: string;
};

export type Booking = {
    user?: UserDetails;
    location?: { id: string; name?: string };
    resource?: { id: string; name?: string };
    bookingStartDateTime: string;
    floor?: BookingFloor;
};