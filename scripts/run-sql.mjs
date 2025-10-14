import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRole) {
  console.error('[run-sql] Missing Supabase URL or service role key.');
  process.exit(1);
}

const sqlStatements = `
  create extension if not exists "uuid-ossp";

  create table if not exists photos (
    id text primary key,
    name text not null,
    mime_type text not null,
    size bigint,
    thumbnail_link text,
    web_content_link text,
    web_view_link text,
    created_time timestamptz,
    modified_time timestamptz,
    is_approved boolean default false,
    is_public boolean default false,
    approved_by text,
    approved_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );

  create index if not exists idx_photos_approved on photos(is_approved, is_public);
  create index if not exists idx_photos_created on photos(created_time desc);

  create table if not exists photo_tags (
    id uuid primary key default uuid_generate_v4(),
    name text unique not null,
    description text,
    created_at timestamptz default now()
  );

  create table if not exists photo_tag_relations (
    photo_id text references photos(id) on delete cascade,
    tag_id uuid references photo_tags(id) on delete cascade,
    primary key (photo_id, tag_id)
  );
`;

const client = createClient(supabaseUrl, serviceRole, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const { data, error } = await client.rpc('exec_sql', {
  query: sqlStatements,
});

if (error) {
  console.error('[run-sql] RPC error:', error);
  process.exit(1);
}

console.log('[run-sql] SQL execution result:', JSON.stringify(data, null, 2));
