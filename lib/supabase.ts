import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
