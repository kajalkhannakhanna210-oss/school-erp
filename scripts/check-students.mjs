#!/usr/bin/env node
import { Client } from 'pg';

const conn = process.env.DATABASE_URL || process.argv[2];
if (!conn) {
  console.error('Usage: DATABASE_URL="postgres://..." node ./scripts/check-students.mjs OR node ./scripts/check-students.mjs "postgres://..."');
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString: conn });
  try {
    await client.connect();
    const c = await client.query('SELECT count(*) FROM public.students');
    console.log('students count:', c.rows[0].count);

    const sample = await client.query("SELECT id, admission_number, is_active, photo_path FROM public.students ORDER BY admission_number NULLS LAST LIMIT 10");
    console.log('sample rows:');
    console.table(sample.rows);

    // Try to join profiles to show names if possible
    try {
      const withNames = await client.query("SELECT s.id, s.admission_number, s.is_active, p.full_name FROM public.students s LEFT JOIN public.profiles p ON p.id = s.id ORDER BY s.admission_number NULLS LAST LIMIT 10");
      console.log('sample rows with profile names:');
      console.table(withNames.rows);
    } catch (e) {
      // ignore
    }

    await client.end();
  } catch (e) {
    console.error('DB error:', e.message || e);
    process.exit(2);
  }
}

main();
