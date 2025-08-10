import fetch, { RequestInit } from 'node-fetch';
import supabase from '../../src/backend/api/backendConnection';
import { DistancePair } from '../../src/shared/types/locationData';
import { distanceByFloor as globalDistanceByFloor } from '../../src/Setup/locationDistances';


// Environment variables
const desklyKey = process.env.DESKLY_KEY;
const basecomLocationID = process.env.BASECOM_LOCATIONID || process.env.BASECOM_LOCATION_ID;
const floor1ID = process.env.FLOOR1_ID as string;
const floor2ID = process.env.FLOOR2_ID as string;
const floor3ID = process.env.FLOOR3_ID as string;

const floorBookings: string[] = [floor1ID, floor2ID, floor3ID];

// =====================================================
// Type Definitions
// =====================================================

type BookingFloor = {
  id: string;
  name: string;
};

export type UserDetails = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
};

export type Booking = {
  user?: UserDetails;
  location?: { id: string; name?: string };
  resource?: { id: string; name?: string };
  bookingStartDateTime: string;
  floor?: BookingFloor;
};

type WateringTask = {
  wateringID: number;
  plantID: number;
  locationID: string;
  locationName?: string;
  floor: number;
  interval?: number;
  volume?: number;
  method?: string;
  plantName?: string;
};

type UserApiResponse = {
  status: string;
  data?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
};

type ApiResponse = {
  status: string;
  data: Booking[];
};

// =====================================================
// Utility Functions (Fetching & Syncing)
// =====================================================

/**
 * Fetch bookings for a specific floor.
 * 
 * @returns An object with:
 *   - bookings: A list of Booking objects (or undefined if an error occurred).
 *   - users: An array of UserDetails extracted from the bookings.
 */
async function fetchBookingsForFloor(floorID: string): Promise<{ bookings: Booking[] | undefined; users: UserDetails[] }> {
  const today = new Date().toISOString().split("T")[0];
  const options: RequestInit = {
    method: "GET",
    headers: {
      accept: "application/json",
      "X-AUTH-MODE": "API-Key",
      Authorization: desklyKey ?? ""
    }
  };

  try {
    const response = await fetch(
      `https://app.desk.ly/en/api/v2/resourceBooking/list?page[limit]=50&page[offset]=0&date[]=${today}&location=${basecomLocationID}&floor=${floorID}`,
      options
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch bookings for floor ${floorID}, status: ${response.status}`);
    }

    const res = (await response.json()) as ApiResponse;

    if (res.status.toLowerCase() !== "success") {
      console.log(`Unexpected API answer for floor ${floorID}, status was ${res.status}`);
      return { bookings: [], users: [] };
    }

    const bookings = res.data;
    const userIDs = bookings.map(entry => entry.user?.id).filter((id): id is string => typeof id === "string");
    const userInfo: UserDetails[] = await fetchUsersByIDs(userIDs);

    return { bookings, users: userInfo };
  } catch (error) {
    console.error(`Unexpected error querying bookings for floor ${floorID}`, error);
    return { bookings: [], users: [] };
  }
}

/**
 * Fetch user details in bulk from Desk.ly.
 */
async function fetchUsersByIDs(userIDs: string[]): Promise<UserDetails[]> {
  const options: RequestInit = {
    method: "GET",
    headers: {
      accept: "application/json",
      "X-AUTH-MODE": "API-Key",
      Authorization: desklyKey ?? ""
    }
  };

  const users: UserDetails[] = [];
  for (const userID of userIDs) {
    try {
      const response = await fetch(`https://app.desk.ly/en/api/v2/user/${userID}`, options);
      const userRes = (await response.json()) as UserApiResponse;
      if (typeof userRes.status === "string" && userRes.status.toLowerCase() === "success" && userRes.data) {
        const { id, firstName, lastName, email } = userRes.data;
        users.push({ id, firstName, lastName, email });
      } else {
        console.log(`Failed to fetch details for user: ${userID}`);
      }
    } catch (error) {
      console.error(`Error fetching user ${userID}:`, error);
    }
  }
  return users;
}

/**
 * Sync users with Supabase DB.
 * Only syncs users that have a defined email.
 */
async function syncUsersWithDB(users: UserDetails[]) {
  try {
    // Filter out users that do not have an email.
    const usersWithEmail = users.filter(user => user.email);
    const emails = usersWithEmail.map(user => user.email!.trim());
    const { data: existingUsers, error } = await supabase
      .from("Employee")
      .select("id, first_name, last_name, slack_id, mail")
      .in("mail", emails);
    if (error) {
      console.error("Error fetching users from DB:", error);
      return;
    }
    const userLookup = new Map(existingUsers.map((user: any) => [user.mail, user]));
    const missingUsers: UserDetails[] = [];
    usersWithEmail.forEach(user => {
      if (!userLookup.has(user.email!.trim())) {
        missingUsers.push(user);
      }
    });
    if (missingUsers.length === 0) return;
    const usersToInsert = missingUsers.map(user => ({
      first_name: user.firstName,
      last_name: user.lastName,
      mail: user.email,
    }));
    const { data: insertedUsers, error: insertError } = await supabase
      .from("Employee")
      .insert(usersToInsert)
      .select();
    if (insertError) {
      console.error("Error inserting users into DB:", insertError);
    } else {
      console.log("Successfully inserted users:", insertedUsers);
    }
  } catch (error) {
    console.error("Error processing insertion:", error);
  }
}

/**
 * Fetches watering tasks from the database.
 * @returns an array of WateringTasks.
 */
async function fetchWateringTasks(): Promise<WateringTask[]> {
  try {
    const { data, error } = await supabase
      .from("Plant_Watering")
      .select("id, plant_id, location_id, location_name, floor, interval, volume, method, plant_name");

    if (error) {
      console.error("Error fetching watering tasks from DB:", error);
      return [];
    }

    const wateringTasks: WateringTask[] = (data ?? []).map((task: any) => ({
      wateringID: task.id,
      plantID: task.plant_id,
      locationID: task.location_id,
      locationName: task.location_name,
      floor: task.floor,
      interval: task.interval,
      volume: task.volume,
      method: task.method,
      plantName: task.plant_name
    }));

    return wateringTasks;
  } catch (error) {
    console.log("Unexpected error", error);
    return [];
  }
}

// =====================================================
// Core Functions (Filtering, Selection, Notification)
// =====================================================

/**
 * Filter distance pairs and create a mapping by watering task.
 *
 * @param wateringTasks - Used to build a record of tasks and pairs for this task.
 * @param bookings - Array of objects containing a "data" property with bookings.
 * @param users - An array of UserDetails; used to attach user information.
 * @param distancePairs - A record where the keys are floors and the values are arrays of DistancePair for that floor.
 *
 * @returns An object with:
 *   - bookingsByFloor: a mapping (record) of floor numbers to arrays of Booking objects.
 *   - distancePairsByTask: a mapping (record) of watering task IDs to arrays of valid DistancePairs.
 */
async function filterDistancePairs(
  wateringTasks: WateringTask[],
  bookings: { data?: Booking[] }[],
  users: UserDetails[],
  distancePairs: Record<number, DistancePair[]>
): Promise<{
  bookingsByFloor: Record<number, Booking[]>;
  distancePairsByTask: Record<number, DistancePair[]>;
}> {
  // Build a lookup map from user IDs to their UserDetails.
  const userMap = new Map<string, UserDetails>();
  users.forEach(u => userMap.set(u.id, u));

  // Group bookings by floor.
  const bookingsByFloor: Record<number, Booking[]> = {};
  bookings.forEach(response => {
    response.data?.forEach(booking => {
      // Extract the floor number from the floor object.
      let floorNumber: number | undefined;
      if (booking.floor && typeof booking.floor === 'object' && booking.floor.name) {
        floorNumber = parseInt(booking.floor.name, 10);
      } else if (typeof booking.floor === 'number' || typeof booking.floor === 'string') {
        floorNumber = parseInt(booking.floor as string, 10);
      }

      if (floorNumber !== undefined && !isNaN(floorNumber)) {
        if (!bookingsByFloor[floorNumber]) {
          bookingsByFloor[floorNumber] = [];
        }
        bookingsByFloor[floorNumber].push(booking);
      }
    });
  });

  // Debug
  //console.log("bookings für floor 1", bookingsByFloor[1]);

  // Debug
  //console.log(bookingsByFloor);

  // Get the list of plant locations from the watering tasks.
  const plantLocationIDs = wateringTasks.map(task => task.locationID);

  // For each floor, filter the distance pairs using the provided conditions.
  const filteredDistancePairsByFloor: Record<number, DistancePair[]> = {};

  for (const floorKey in distancePairs) {
    // Debug
    //console.log("Floor Key:", floorKey);
    const floor = parseInt(floorKey);
    //console.log("Floor:", floor);
    const pairs = distancePairs[floor];
    const floorBookings = bookingsByFloor[floor] || [];

    // Debug
    console.log("floorBookings: ", floorBookings);
    console.log("pairs: ", pairs);

    const validPairs = pairs.filter(pair => {
      const fromBooked = floorBookings.some(
        booking => booking.resource && booking.resource.id === pair.from.desklyID
      );

      const toBooked = floorBookings.some(
        booking => booking.resource && booking.resource.id === pair.to.desklyID
      );

      const fromIsPlant = plantLocationIDs.includes(pair.from.desklyID);
      const toIsPlant = plantLocationIDs.includes(pair.to.desklyID);

      // Debug
      /*
      console.log(`Checking pair ${pair.from.name} -> ${pair.to.name}: `, {
        fromBooked,
        toBooked,
        fromIsPlant,
        toIsPlant,
      });*/

      if (fromIsPlant && !toIsPlant) {
        return toBooked;
      }
      if (toIsPlant && !fromIsPlant) {
        return fromBooked;
      }
      if (fromIsPlant && toIsPlant) {
        return fromBooked || toBooked;
      }
      return false;
    })
      .map(pair => {
        // Create a copy of the pair and attach user info when available.
        const newPair: DistancePair = { ...pair };
        const bookingForFrom = floorBookings.find(
          booking =>
            booking.resource &&
            booking.resource.id === pair.from.desklyID &&
            booking.user?.id
        );
        if (bookingForFrom && bookingForFrom.user) {
          newPair.fromUser = userMap.get(bookingForFrom.user.id);
        }
        const bookingForTo = floorBookings.find(
          booking =>
            booking.resource &&
            booking.resource.id === pair.to.desklyID &&
            booking.user?.id
        );
        if (bookingForTo && bookingForTo.user) {
          newPair.toUser = userMap.get(bookingForTo.user.id);
        }
        return newPair;
      });

    validPairs.sort((a, b) => a.distance - b.distance);
    filteredDistancePairsByFloor[floor] = validPairs;
  }

  // Build a mapping of watering task ID to relevant distance pairs.
  const distancePairsByTask: Record<number, DistancePair[]> = {};
  wateringTasks.forEach(task => {
    const relevantPairs: DistancePair[] = [];
    for (const floor in filteredDistancePairsByFloor) {
      const pairs = filteredDistancePairsByFloor[floor];
      const matchingPairs = pairs.filter(
        pair => pair.from.desklyID === task.locationID || pair.to.desklyID === task.locationID
      );
      relevantPairs.push(...matchingPairs);
    }
    distancePairsByTask[task.wateringID] = relevantPairs;
  });

  return { bookingsByFloor, distancePairsByTask };
}

/**
 * For a given watering task and its associated distance pairs, select the nearest user 
 * who is not blacklisted and notify them.
 */
async function selectAndNotifyUserForWateringTask(
  wateringTask: WateringTask,
  pairs: DistancePair[],
  omitList: Set<string>
): Promise<void> {
  for (const pair of pairs) {
    let candidate: UserDetails | undefined;
    if (pair.from.desklyID === wateringTask.locationID && pair.toUser) {
      candidate = pair.toUser;
    } else if (pair.to.desklyID === wateringTask.locationID && pair.fromUser) {
      candidate = pair.fromUser;
    }
    if (candidate && !omitList.has(candidate.id)) {
      notifyUser(wateringTask, candidate);
      return;
    }
  }
  console.log(`No suitable candidate found for watering task ${wateringTask.wateringID}.`);
}

/**
 * Process all watering tasks using the mapping of wateringTask -> distance pairs.
 */
async function processWateringTasks(
  tasks: WateringTask[],
  distancePairsByTask: Record<number, DistancePair[]>,
  omitList: Set<string>
): Promise<void> {
  for (const task of tasks) {
    const pairs = distancePairsByTask[task.wateringID] || [];
    if (pairs.length === 0) {
      console.log(`No distance pairs for watering task ${task.wateringID}.`);
      continue;
    }
    await selectAndNotifyUserForWateringTask(task, pairs, omitList);
  }
}

/**
 * Fetch Slack IDs in bulk from Supabase for the given emails.
 * @param emails Array of user emails.
 * @returns A Map where the key is the user email and the value is the Slack ID, if available.
 */
async function fetchSlackIDsByEmails(emails: string[]): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("Employee")
    .select("mail, slack_id")
    .in("mail", emails);

  if (error || !data) {
    console.error("Error fetching Slack IDs:", error);
    return new Map();
  }

  // Build and return the mapping.
  const slackIDMap = new Map<string, string>();
  data.forEach((record: { mail: string; slack_id: string }) => {
    if (record.slack_id) {
      slackIDMap.set(record.mail.trim(), record.slack_id);
    }
  });
  return slackIDMap;
}

const jacob: string = "j.flender@basecom.de";
const lucius: string = "l.weimer@basecom.de";

const mails: string[] = [jacob, lucius];

/**
 * Mock function
 * Notify a selected user for a watering task.
 */
function notifyUser(task: WateringTask, user: UserDetails): void {

  // Divide users in two groups: 1. SlackID given in DB and 2. SlackID not given in DB.

  // Check Slack User list using Bolt-API to fetch SlackID using the email.

  // Notify the users in Slack using their SlackID, then access the data which is relevant for the watering:
  // Name of the plant, location of the plant, how much water.

}

// =====================================================
// Main Workflow
// =====================================================

/**
 * Main workflow function that orchestrates:
 * 1. Fetching location data and calculating distances.
 * 2. Fetching watering tasks.
 * 3. Retrieving bookings and user details per floor.
 * 4. Optionally syncing users with Supabase.
 * 5. Filtering distance pairs based on the watering tasks and booking data.
 * 6. Notifying the nearest valid user for each watering task.
 */
async function main() {
  // --- Step 1: Use pre-calculated distances (or force a re-calc if needed) ---
  // For now, we use the global "distanceByFloor" from the imported module.

  // --- Step 2: Fetch watering tasks ---
  const wateringTasks = await fetchWateringTasks();
  console.log("Fetched watering tasks:", wateringTasks);

  // --- Step 3: For each floor, fetch booking data and associated user details ---
  const aggregatedBookings: { data?: Booking[] }[] = [];
  let aggregatedUsers: UserDetails[] = [];
  for (const floorID of floorBookings) {
    const result = await fetchBookingsForFloor(floorID);
    aggregatedBookings.push({ data: result.bookings });
    // Add users from the result.
    result.users.forEach(user => {
      if (!aggregatedUsers.some(u => u.id === user.id)) {
        aggregatedUsers.push(user);
      }
    });
  }

  // Debug
  //console.log("Bookings:", JSON.stringify(aggregatedBookings, null, 2));

  // --- Step 4: Optionally, sync fetched users with your Supabase DB ---
  await syncUsersWithDB(aggregatedUsers);

  // --- New Step: Fetch Slack IDs in bulk for the aggregated users ---
  const emails = aggregatedUsers
    .filter(user => user.email)
    .map(user => user.email!.trim());
  const slackIDMap = await fetchSlackIDsByEmails(emails);
  console.log("Fetched Slack IDs:", slackIDMap);

  // --- Step 5: Filter and map distance pairs per watering task ---
  const { distancePairsByTask } = await filterDistancePairs(wateringTasks, aggregatedBookings, aggregatedUsers, globalDistanceByFloor);
  console.log("Distance pairs mapped by watering task:", distancePairsByTask);

  // --- Step 6: Process watering tasks to select and notify the nearest valid user ---
  const omitList = new Set<string>(); // Add any user IDs you wish to omit here.
  await processWateringTasks(wateringTasks, distancePairsByTask, omitList);

  console.log("Workflow completed.");
}

// Execute the main workflow.
main().catch(error => {
  console.error("An error occurred during the main workflow execution:", error);
});
