import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client — credentials come from environment variables
 * (injected at build time for the static export).
 */
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://ffxfyekaagynkczlrrct.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmeGZ5ZWthYWd5bmtjemxycmN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTEzNjIsImV4cCI6MjA4NjI4NzM2Mn0.dvJQcYn3BjXomka6XEJn9a5gQAivgvzOb4ugxZZ0Qcs";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Convenience exports for database / auth operations
export const db = supabase;
export const auth = supabase.auth;
