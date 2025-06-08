import { createClient } from "@supabase/supabase-js";

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

// Create Supabase client with service role key (preferred) or anon key (fallback)
// Service role key provides full access for server-side operations
// Anon key provides limited access but is sufficient for basic operations
const supabaseKey = supabaseServiceKey || supabaseAnonKey;

export const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

// Debug logging for troubleshooting
if (process.env.NODE_ENV !== "production") {
  console.log("🔧 Database Configuration Debug:");
  console.log(`   SUPABASE_URL: ${supabaseUrl ? "Present" : "Missing"}`);
  console.log(
    `   SUPABASE_SERVICE_ROLE_KEY: ${
      supabaseServiceKey ? "Present" : "Missing"
    }`
  );
  console.log(
    `   SUPABASE_ANON_KEY: ${supabaseAnonKey ? "Present" : "Missing"}`
  );
  console.log(`   Selected Key: ${supabaseKey ? "Present" : "Missing"}`);
  console.log(`   Supabase Client: ${supabase ? "Initialized" : "NULL"}`);
}

// Export for backward compatibility (if needed)
export const db = supabase;
