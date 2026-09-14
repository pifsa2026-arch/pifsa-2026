import { createClient } from '@supabase/supabase-js';

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Normalize URL: strip trailing /rest/v1/ or slashes if pasted by mistake.
if (supabaseUrl) {
  supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

// IMPORTANT: pass the key ONLY as the apikey option (2nd arg). Do NOT force a
// global Authorization header — doing so overrides the logged-in user's session
// token, so authenticated reads would be treated as anon and return nothing.
// The supabase-js client automatically sends the correct Authorization header:
// the anon key for public requests, and the user's JWT after login.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;
