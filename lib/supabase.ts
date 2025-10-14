import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (process.env.NODE_ENV !== 'production') {
  if (!supabaseUrl) {
    console.warn('[supabase] NEXT_PUBLIC_SUPABASE_URL is missing.');
  }
  if (!supabaseAnonKey && supabaseUrl?.includes('127.0.0.1')) {
    console.warn('[supabase] Using local Supabase - anon key not required.');
  } else if (!supabaseAnonKey) {
    console.warn('[supabase] NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.');
  }
  if (!supabaseServiceRoleKey) {
    console.warn('[supabase] SUPABASE_SERVICE_ROLE_KEY is missing.');
  } else if (!supabaseServiceRoleKey.includes('.')) {
    console.warn(
      '[supabase] SUPABASE_SERVICE_ROLE_KEY does not look like a JWT. ' +
        'Copy the "service_role" key from Supabase project settings.',
    );
  }
}

// For local development, use service role key for both client and admin
const isLocal = supabaseUrl?.includes('127.0.0.1') || supabaseUrl?.includes('localhost');
const clientKey = isLocal ? supabaseServiceRoleKey : supabaseAnonKey;

export const supabase = createSupabaseClient(supabaseUrl, clientKey);

// Server-side client with service role key
export const supabaseAdmin = createSupabaseClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Create client function for API routes
export function createClient() {
  const isLocal = supabaseUrl?.includes('127.0.0.1') || supabaseUrl?.includes('localhost');
  const clientKey = isLocal ? supabaseServiceRoleKey : supabaseAnonKey;
  return createSupabaseClient(supabaseUrl, clientKey);
}

// Create admin client function for API routes
export function createAdminClient() {
  return createSupabaseClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
