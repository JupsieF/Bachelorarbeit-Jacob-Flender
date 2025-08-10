import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/../../supabase/database.types";

const supabaseUrl: string = process.env.SUPABASE_URL as string;
const supabaseAdminKey: string = process.env.SUPABASE_ADMIN_KEY as string;

console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("SUPABASE_ADMIN_KEY:", process.env.SUPABASE_ADMIN_KEY ? "Loaded" : "Missing");

if (!supabaseUrl || !supabaseAdminKey) {
    throw new Error("Missing supabase key or url in environment variables.");
}

export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseAdminKey);

export default supabaseAdmin;
