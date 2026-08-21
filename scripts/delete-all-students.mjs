#!/usr/bin/env node
/*
Safe deletion script for student data.
Usage:
  1) Preview (no deletion):
     DATABASE_URL="postgres://..." node ./scripts/delete-all-students.mjs

  2) Perform deletion (IRREVERSIBLE):
     FORCE=1 DATABASE_URL="postgres://..." node ./scripts/delete-all-students.mjs

The script will:
 - list counts of affected tables
 - show up to 10 student ids
 - stop unless FORCE=1 is set
 - when forced, delete from related tables and students in a single transaction
 - recommend creating a backup before running
*/

import { Client } from 'pg';

const conn = process.env.DATABASE_URL || process.argv[2];
const force = process.env.FORCE === '1' || process.env.FORCE === 'true';
if (!conn) {
  console.error('ERROR: DATABASE_URL not provided. Set DATABASE_URL env or pass as first arg.');
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString: conn });
  try {
    await client.connect();
    console.log('Connected to DB. Gathering info...');

    const counts = {};
    const tablesToCheck = [
      'students',
      'student_archive_audit',
      'student_enrollments',
      'student_leaving_requests',
      'profiles'
    ];

    for (const t of tablesToCheck) {
      try {
        const res = await client.query(`SELECT count(*)::int AS c FROM public.${t}`);
        counts[t] = res.rows[0].c;
      } catch (e) {
        counts[t] = 'N/A';
      }
    }

    // Count students specifically
    const { rows: studentRows } = await client.query('SELECT id FROM public.students LIMIT 10');
    const studentIds = studentRows.map((r) => r.id);

    console.log('Table counts (public schema):');
    console.table(counts);
    console.log('Sample student ids (up to 10):', studentIds.length ? studentIds : '(none)');

    if (!studentIds.length) {
      console.log('No student records found — nothing to delete.');
      await client.end();
      return;
    }

    console.log('\n*** IMPORTANT: This operation is IRREVERSIBLE. Back up your database (pg_dump) before proceeding. ***');
    if (!force) {
      console.log('\nTo perform deletion, re-run with FORCE=1 environment variable.\nExample (bash): FORCE=1 DATABASE_URL="postgres://..." node ./scripts/delete-all-students.mjs\nPowerShell: $env:FORCE = "1"; $env:DATABASE_URL = "postgres://..."; node .\\scripts\\delete-all-students.mjs');
      await client.end();
      return;
    }

    console.log('Starting deletion transaction...');
    try {
      await client.query('BEGIN');

      // Delete audit rows for students
      await client.query(`DELETE FROM public.student_archive_audit WHERE student_id IN (SELECT id FROM public.students)`);

      // Delete enrollments
      await client.query(`DELETE FROM public.student_enrollments WHERE student_id IN (SELECT id FROM public.students)`);

      // Delete leaving requests
      await client.query(`DELETE FROM public.student_leaving_requests WHERE student_id IN (SELECT id FROM public.students)`);

      // Delete other student-scoped rows if present (best-effort, ignore errors)
      const otherTables = ['student_contacts', 'student_attendance', 'student_fees'];
      for (const t of otherTables) {
        try {
          await client.query(`DELETE FROM public.${t} WHERE student_id IN (SELECT id FROM public.students)`);
        } catch (e) {
          // ignore absent tables
        }
      }

      // Optionally delete profiles for these students
      try {
        await client.query(`DELETE FROM public.profiles WHERE id IN (SELECT id FROM public.students)`);
      } catch (e) {
        // If profiles are referenced elsewhere, this may fail — ignore and continue
      }

      // Finally delete students
      await client.query(`DELETE FROM public.students`);

      await client.query('COMMIT');
      console.log('Deletion completed successfully. All rows from public.students and related tables removed (best-effort).');
    } catch (e) {
      console.error('Deletion failed, rolling back:', e.message || e);
      try { await client.query('ROLLBACK'); } catch (_) {}
      process.exit(3);
    }

    await client.end();
  } catch (e) {
    console.error('DB error:', e.message || e);
    process.exit(2);
  }
}

main();
