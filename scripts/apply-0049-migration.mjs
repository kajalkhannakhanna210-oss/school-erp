#!/usr/bin/env node
// Apply migration 0049 to add inactive_date, inactive_reason, inactive_by to students
// Usage: set ENV var DATABASE_URL (Postgres connection string) then: node scripts/apply-0049-migration.mjs
// Example: DATABASE_URL="postgres://user:pass@db.host:5432/dbname" node scripts/apply-0049-migration.mjs

import { Client } from 'pg';

const sql = `-- Migration 0049: Add inactive/archival columns to students

alter table public.students
  add column if not exists inactive_date date,
  add column if not exists inactive_reason text,
  add column if not exists inactive_by uuid references public.profiles(id);

-- Index for queries by inactive_date
create index if not exists idx_students_inactive_date on public.students (inactive_date);
`;

async function main() {
  const conn = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.SUPABASE_DATABASE_URL;
  if (!conn) {
    console.error('ERROR: DATABASE_URL environment variable not set. Provide a Postgres connection string with sufficient privileges to ALTER TABLE students.');
    process.exit(1);
  }

  const client = new Client({ connectionString: conn });
  try {
    await client.connect();
    console.log('Connected to database. Running migration 0049...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Migration applied successfully.');
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('Migration failed:', e.message || e);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
