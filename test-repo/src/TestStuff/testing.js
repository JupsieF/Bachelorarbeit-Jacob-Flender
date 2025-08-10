import { fetchBookingsForFloor } from '../backend/api/desklyService';

const floorName = process.env.FLOOR1_NAME;
const floorID = process.env.FLOOR1_ID;

function anonymizeBooking(booking, idx) {
    return {
        ...booking,
        id: `booking-${idx}`,
        bookingStartDateTime: booking.bookingStartDateTime,
        bookingEndDateTime: booking.bookingEndDateTime,
        userCheckedIn: booking.userCheckedIn,
        resourceType: booking.resourceType,
        isCalendarEvent: booking.isCalendarEvent,
        createdAt: booking.createdAt,
        bookedBy: booking.bookedBy
            ? {
                  ...booking.bookedBy,
                  id: `B-user-${idx}`,
                  firstName: `BFirstName${idx}`,
                  lastName: `BLastName${idx}`,
              }
            : undefined,
        user: booking.user
            ? {
                  ...booking.user,
                  id: `U-user-${idx}`,
                  firstName: `UFirstName${idx}`,
                  lastName: `ULastName${idx}`,
              }
            : undefined,
        location: booking.location
            ? {
                  ...booking.location,
                  id: `location-${idx}`,
              }
            : undefined,
        floor: booking.floor
            ? {
                  ...booking.floor,
                  id: `floor-${idx}`,
              }
            : undefined,
        room: booking.room
            ? {
                  ...booking.room,
                  id: `room-${idx}`,
              }
            : undefined,
        resource: booking.resource
            ? {
                  ...booking.resource,
                  id: `resource-${idx}`,
              }
            : undefined,
    };
}

async function logSampleBookings() {
    const result = await fetchBookingsForFloor(floorID);
    const anonymizedBookings = (result.bookings || []).map(anonymizeBooking);
    console.log(`Buchungen für Stock: ${floorName}:`);
    console.log(JSON.stringify(anonymizedBookings, null, 2));
}

logSampleBookings();