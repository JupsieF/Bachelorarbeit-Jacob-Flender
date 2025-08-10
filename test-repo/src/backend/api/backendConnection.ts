import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/../../supabase/database.types";

const supabaseUrl: string = process.env.SUPABASE_URL as string;
const supabaseKey: string = process.env.SUPABASE_KEY as string;

console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("SUPABASE_KEY:", process.env.SUPABASE_KEY ? "Loaded" : "Missing");

if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing supabase key or url in environment variables.");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export default supabase;
