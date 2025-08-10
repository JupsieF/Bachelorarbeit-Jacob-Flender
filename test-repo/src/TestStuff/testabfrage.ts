import { config } from 'dotenv';
config({ path: '../../.env' });
import supabase from "../backend/api/backendConnection";

const norwegenId = process.env.NORWEGEN_RESOURCE_ID;

async function printVertices() {

    const { data: vertices, error } = await supabase
        .from("Location")
        .select("x_value, y_value")    
        .eq("deskly_id", norwegenId);

    if (error) {
        console.log("Error:", error);
        return;
    }

    if (Array.isArray(vertices)) {
    console.log("vertices is an array");

        if (vertices.length > 0) {
            console.log("Type of the first element in vertices:", typeof vertices[0]);
            if (Array.isArray(vertices[0])) {
                console.log("The first element is an array");
            }
        }
    } else {
        console.log("vertices is not an array");
    }

    console.log("Representation of vertices from the db:", vertices);
    console.log();
    console.log("x:", vertices[0].x_value);
    console.log("y:", vertices[0].y_value);

    //accessVertices(vertices);
}

async function calculateSomething() {
    const factor: number = 1.553;

    const { data, error } = await supabase
        .from("Location")
        .select("x_value")
        .eq("deskly_id", norwegenId);

    if (error) {
        console.error("Error fetching data:", error);
        return;
    }

    if (!data || data.length === 0) {
        console.log("No data found for the given deskly_id.");
        return;
    }

    // Extract x_value from the first object in the array
    const x_value = data[0].x_value;

    if (typeof x_value !== "number") {
        console.log("x_value is not a number:", x_value);
        return;
    }

    const result = x_value * factor;
    console.log("Ich bin das Result!", result);
}

printVertices();
calculateSomething();