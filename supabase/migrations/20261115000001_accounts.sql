-- Accounts for The Corner World.
--
-- People sign in with Google (Supabase Auth keeps them in auth.users). This migration adds what an
-- account can hold, and the rules for who may read and change it:
--
--   public.client_trips        a paid trip page made for a client
--   public.client_trip_members the email addresses allowed to open a client's trip page
--   public.client_trip_pages   the page itself (its HTML, styles and script)
--   private.admins             who may manage client trips: the site's owner
--
-- The site is static and talks to this database straight from the browser with a key anyone can read,
-- so the rules below are the whole of the security. Every table has row level security on; nothing is
-- granted to visitors who haven't signed in; and each signed-in role gets only the rights it needs.
-- The `private` schema is not offered by the data API at all (see [api] schemas in supabase/config.toml
-- and the project's API settings), so its tables and functions can't be called from a browser.

create schema if not exists private;
revoke all on schema private from public;
-- The access rules on the public tables call functions in this schema as the signed-in user
grant usage on schema private to authenticated;

-- ---------- admins ----------

create table private.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);
comment on table private.admins is 'Who may manage client trips. Rows are added by hand in the SQL editor, never from the site.';
-- No rights are granted on this table and it has no policies: it is read only by is_admin() below
alter table private.admins enable row level security;
revoke all on private.admins from public, anon, authenticated;

-- True if the signed-in user is an admin. Runs with its owner's rights so it can read private.admins,
-- which the caller can't; it takes no arguments and answers only about the caller.
create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.admins where user_id = (select auth.uid()));
$$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

-- Keeps updated_at honest: it is always the time the row last changed, whatever the browser sent
create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.touch_updated_at() from public, anon, authenticated;

-- ---------- client trip pages ----------

create table public.client_trips (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.client_trips is 'A trip page made for a paying client. Seen by the people listed in client_trip_members, managed by admins.';

create table public.client_trip_members (
  trip_id uuid not null references public.client_trips (id) on delete cascade,
  -- Lower case, so it can be compared with the address an account signed in with
  email text not null check (email = lower(email) and char_length(email) <= 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  added_at timestamptz not null default now(),
  primary key (trip_id, email)
);
comment on table public.client_trip_members is 'The email addresses allowed to open a client trip page. A person gets in by signing in with an account that has proved it owns the address.';
create index client_trip_members_email_idx on public.client_trip_members (email);

create table public.client_trip_pages (
  trip_id uuid primary key references public.client_trips (id) on delete cascade,
  html text not null,
  css text not null,
  js text not null,
  updated_at timestamptz not null default now(),
  constraint client_trip_pages_are_page_sized check (octet_length(html) + octet_length(css) + octet_length(js) <= 1500000)
);
comment on table public.client_trip_pages is 'A client trip page''s content. The script runs in the client''s browser on the site, so only admins may write here.';

create trigger client_trips_touch before update on public.client_trips
  for each row execute function private.touch_updated_at();
create trigger client_trip_pages_touch before insert or update on public.client_trip_pages
  for each row execute function private.touch_updated_at();

-- True if the signed-in user may open this client trip: their account's email address is on the
-- trip's list, and the account has proved it owns that address (Google vouches for it at sign-in).
-- The address is read from auth.users, not from the sign-in token, so it is always the current one.
create function private.is_trip_member(trip uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.client_trip_members m
    join auth.users u on lower(u.email) = m.email
    where m.trip_id = trip
      and u.id = (select auth.uid())
      and u.email_confirmed_at is not null
  );
$$;
revoke all on function private.is_trip_member(uuid) from public, anon;
grant execute on function private.is_trip_member(uuid) to authenticated;

alter table public.client_trips enable row level security;
alter table public.client_trip_members enable row level security;
alter table public.client_trip_pages enable row level security;

revoke all on public.client_trips, public.client_trip_members, public.client_trip_pages from public, anon, authenticated;
-- Signed-in users are granted the writes as well as the reads, because an admin is a signed-in user
-- like any other; the policies below are what keep the writes to admins. Nobody edits a row of
-- client_trip_members (a person is added or removed), so it gets no update right.
grant select, insert, update, delete on public.client_trips, public.client_trip_pages to authenticated;
grant select, insert, delete on public.client_trip_members to authenticated;

create policy "Members and admins see a client trip" on public.client_trips
  for select to authenticated using ((select private.is_admin()) or private.is_trip_member(id));
create policy "Admins add client trips" on public.client_trips
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins change client trips" on public.client_trips
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins delete client trips" on public.client_trips
  for delete to authenticated using ((select private.is_admin()));

-- Clients never need the list of who else is on a trip, so only admins can read it
create policy "Admins see who is on a client trip" on public.client_trip_members
  for select to authenticated using ((select private.is_admin()));
create policy "Admins add people to a client trip" on public.client_trip_members
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins remove people from a client trip" on public.client_trip_members
  for delete to authenticated using ((select private.is_admin()));

create policy "Members and admins open a client trip page" on public.client_trip_pages
  for select to authenticated using ((select private.is_admin()) or private.is_trip_member(trip_id));
create policy "Admins publish a client trip page" on public.client_trip_pages
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins replace a client trip page" on public.client_trip_pages
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins take down a client trip page" on public.client_trip_pages
  for delete to authenticated using ((select private.is_admin()));

-- ---------- what the site can call ----------

-- Lets a page ask whether to show the admin screens. It decides nothing: the policies above do.
create function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.is_admin();
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Deletes the signed-in user's account and, through the foreign keys above, everything kept for it.
-- It takes no arguments, so an account can only ever delete itself.
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  delete from auth.users where id = (select auth.uid());
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
