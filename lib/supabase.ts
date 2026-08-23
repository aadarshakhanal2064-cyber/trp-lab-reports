import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * The app is useless without these, and failing loudly at startup beats
 * failing mysteriously on the first save with a patient waiting at the counter.
 */
if (!url || !anonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Copy .env.example to .env.local and fill it in.",
  );
}

/**
 * This key is safe to ship to the browser. It grants no access on its own —
 * every table is protected by Row Level Security, so an unauthenticated caller
 * can read and write nothing.
 */
export const supabase = createClient(url, anonKey);
