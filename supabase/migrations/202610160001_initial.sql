-- Run once in the Supabase SQL Editor, or apply with Supabase CLI migrations.
begin;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now()
);

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  target_minutes integer not null check (target_minutes between 5 and 15),
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null,
  local_date date not null,
  created_at timestamptz not null default now(),
  foreign key (habit_id, user_id) references public.habits(id, user_id) on delete cascade,
  unique (habit_id, local_date)
);

create index habits_user_id_idx on public.habits(user_id);
create index check_ins_user_date_idx on public.check_ins(user_id, local_date);

alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.check_ins enable row level security;

create policy "Own profile" on public.profiles for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Own habits" on public.habits for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Own check-ins" on public.check_ins for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.profiles, public.habits, public.check_ins from anon;
grant select, insert, update, delete on public.profiles, public.habits, public.check_ins to authenticated;
commit;
