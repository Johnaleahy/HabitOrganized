import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// Executes the actual migration in PostgreSQL. Only Supabase's auth identity
// function and users table are supplied by the harness.
test('database enforces ownership, daily uniqueness, and retry-safe guest import', async () => {
  const db = new PGlite();
  const alice = '00000000-0000-4000-8000-000000000001';
  const bob = '00000000-0000-4000-8000-000000000002';
  const guitar = '00000000-0000-4000-8000-000000000003';
  const pushups = '00000000-0000-4000-8000-000000000004';
  try {
    await db.exec(`
      create role authenticated;
      create role anon;
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema public, auth to authenticated, anon;
    `);
    await db.query('insert into auth.users(id) values ($1), ($2)', [alice, bob]);
    await db.exec(await readFile(new URL('../supabase/migrations/202610160001_initial.sql', import.meta.url), 'utf8'));
    await db.exec('set role authenticated');
    const asUser = id => db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
    const insertHabit = (id, owner, name = 'Guitar') => db.query('insert into public.habits(id,user_id,name,target_minutes) values ($1,$2,$3,5)', [id, owner, name]);
    await asUser(alice);
    await insertHabit(guitar, alice);
    await db.query('insert into public.profiles(user_id,timezone) values ($1,$2)', [alice, 'America/Halifax']);

    await asUser(bob);
    assert.equal((await db.query('select * from public.habits')).rows.length, 0, 'other users cannot read habits');
    assert.equal((await db.query('select * from public.profiles')).rows.length, 0, 'other users cannot read profiles');
    await assert.rejects(insertHabit(pushups, alice), /row-level security/i, 'forged habit ownership is rejected');
    await insertHabit(pushups, bob, 'Push-ups');
    await db.query('update public.habits set name=$1 where id=$2', ['Changed by Bob', guitar]);
    await db.query('delete from public.habits where id=$1', [guitar]);

    await asUser(alice);
    assert.equal((await db.query('select name from public.habits where id=$1', [guitar])).rows[0].name, 'Guitar', 'other users cannot edit or delete habits');
    await assert.rejects(db.query('insert into public.check_ins(user_id,habit_id,local_date) values ($1,$2,$3)', [alice, pushups, '2026-10-23']), /foreign key/i, 'check-ins must belong to the same owner as their habit');
    await db.query('insert into public.check_ins(user_id,habit_id,local_date) values ($1,$2,$3)', [alice, guitar, '2026-10-23']);
    await assert.rejects(db.query('insert into public.check_ins(user_id,habit_id,local_date) values ($1,$2,$3)', [alice, guitar, '2026-10-23']), /unique/i, 'one daily check-in per habit');
    // Mirrors the retry semantics of the guest importer after a partial save.
    await db.query('insert into public.habits(id,user_id,name,target_minutes) values ($1,$2,$3,5) on conflict(id) do nothing', [guitar, alice, 'Guitar']);
    await db.query('insert into public.check_ins(user_id,habit_id,local_date) values ($1,$2,$3) on conflict(habit_id,local_date) do nothing', [alice, guitar, '2026-10-23']);
    assert.equal((await db.query('select * from public.check_ins')).rows.length, 1, 'retry does not duplicate progress');
    await asUser(bob);
    assert.equal((await db.query('select * from public.check_ins')).rows.length, 0, 'other users cannot read check-ins');
    await db.query('delete from public.check_ins where habit_id=$1', [guitar]);
    await asUser(alice);
    assert.equal((await db.query('select * from public.check_ins')).rows.length, 1, 'other users cannot undo completions');
    await db.query('delete from public.check_ins where habit_id=$1', [guitar]);
    assert.equal((await db.query('select * from public.check_ins')).rows.length, 0, 'owner can undo a completion');
    await db.exec('reset role; set role anon');
    await assert.rejects(db.query('select * from public.habits'), /permission denied/i, 'anonymous visitors have no database access');
  } finally {
    await db.close();
  }
});
