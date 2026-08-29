import { createClient } from "@supabase/supabase-js";

// ============================================================================
// SUPABASE CONFIGURATION
// Paste your Supabase Project URL and Public (Anon/Publishable) Key below:
// ============================================================================

// 1. Paste your Supabase Project URL here:
const SUPABASE_URL = "https://dkdasovezlnjaaywzjqm.supabase.co/rest/v1/";

// 2. Paste your Supabase Public Key (Anon / Publishable) here:
const SUPABASE_PUBLIC_KEY = "sb_publishable_5VEiqEfj8czqUTkChQ7PXg_J75Z3CCR";

// Normalize URL (strip trailing /rest/v1/ if included) for Auth and REST compatibility
const normalizedUrl = SUPABASE_URL.replace(/\/rest\/v1\/?$/, "");

// ============================================================================
// SUPABASE CLIENT EXPORT
// ============================================================================
export const supabase = createClient(normalizedUrl, SUPABASE_PUBLIC_KEY);
