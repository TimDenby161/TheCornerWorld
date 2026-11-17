-- Who can read and change what. Run with `npm run test:db` (the local database must be up).
-- Each test signs in as someone, tries something, and checks the database allowed or refused it.
begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

-- ---------- the cast ----------
-- Everyone here has an address at rules.test, which nobody real can have, and the checks count only
-- them and the two client trips made below, so rows already in the database don't change the answers.
-- ada and ben are visitors. cy is a client whose address is on a trip. dee signed up with the same
-- kind of address as a client but never proved she owns it. tim is the admin.
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, created_at, updated_at) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ada@rules.test', now(), now(), now()),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ben@rules.test', now(), now(), now()),
  ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'Cy@Rules.Test', now(), now(), now()),
  ('00000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dee@rules.test', null, now(), now()),
  ('00000000-0000-0000-0000-0000000000ad', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tim@rules.test', now(), now(), now());
insert into private.admins (user_id) values ('00000000-0000-0000-0000-0000000000ad');

insert into public.client_trips (id, title) values
  ('11111111-1111-1111-1111-111111111111', 'Japan in spring'),
  ('22222222-2222-2222-2222-222222222222', 'Peru');
insert into public.client_trip_members (trip_id, email) values
  ('11111111-1111-1111-1111-111111111111', 'cy@rules.test'),
  ('11111111-1111-1111-1111-111111111111', 'dee@rules.test'),
  ('22222222-2222-2222-2222-222222222222', 'someone-else@rules.test');
insert into public.client_trip_pages (trip_id, html, css, js) values
  ('11111111-1111-1111-1111-111111111111', '<h1>Japan</h1>', 'h1{}', '1'),
  ('22222222-2222-2222-2222-222222222222', '<h1>Peru</h1>', 'h1{}', '1');

-- Signs in as a user, or as nobody (a visitor who hasn't signed in)
create function pg_temp.sign_in(who uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', who, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create function pg_temp.sign_out() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'anon', true);
end $$;
create function pg_temp.as_owner() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
end $$;

-- ---------- every table has its rules switched on ----------
select pg_temp.as_owner();
select is((select count(*)::int from pg_tables where schemaname in ('public', 'private') and not rowsecurity), 0, 'Every table in public and private has row level security on');
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('public', 'private') and p.prosecdef and (p.proconfig is null or not p.proconfig @> array['search_path=""'])), 0, 'Every function that runs with its owner''s rights has an empty search path');

-- ---------- a visitor who hasn't signed in ----------
select pg_temp.sign_out();
select throws_ok('select * from public.client_trips', '42501', null, 'Not signed in: can''t read client trips');
select throws_ok('select * from public.client_trip_pages', '42501', null, 'Not signed in: can''t read client trip pages');
select throws_ok('select * from public.client_trip_members', '42501', null, 'Not signed in: can''t read who is on a trip');
select throws_ok('select * from private.admins', '42501', null, 'Not signed in: can''t read the admin list');
select throws_ok('select public.is_admin()', '42501', null, 'Not signed in: can''t call is_admin');
select throws_ok('select public.delete_my_account()', '42501', null, 'Not signed in: can''t call delete_my_account');

-- ---------- client trip pages ----------
select pg_temp.sign_in('00000000-0000-0000-0000-00000000000a');
select is((select count(*)::int from public.client_trips), 0, 'Ada, on no trip, sees no client trips');
select is((select count(*)::int from public.client_trip_pages), 0, 'Ada sees no client trip pages');
select is((select public.is_admin()), false, 'Ada is not an admin');
select throws_ok('select * from private.admins', '42501', null, 'Ada can''t read the admin list');
select throws_ok($$insert into private.admins (user_id) values ('00000000-0000-0000-0000-00000000000a')$$, '42501', null, 'Ada can''t make herself an admin');
select throws_ok($$insert into public.client_trip_members (trip_id, email) values ('11111111-1111-1111-1111-111111111111', 'ada@rules.test')$$, '42501', null, 'Ada can''t add herself to a client trip');

select pg_temp.sign_in('00000000-0000-0000-0000-00000000000c');
select is((select string_agg(title, ',') from public.client_trips), 'Japan in spring', 'Cy sees the trip his address is on, whatever its capitals, and no other');
select is((select string_agg(html, ',') from public.client_trip_pages), '<h1>Japan</h1>', 'Cy can open that trip''s page, and no other');
select is((select count(*)::int from public.client_trip_members), 0, 'Cy can''t see who else is on the trip');
select throws_ok($$insert into public.client_trip_pages (trip_id, html, css, js) values ('22222222-2222-2222-2222-222222222222', 'x', 'x', 'x')$$, '42501', null, 'Cy can''t publish a page');
select lives_ok($$update public.client_trip_pages set js = 'alert(1)'$$, 'Cy''s attempt to change his page''s script runs…');
select pg_temp.as_owner();
select is((select js from public.client_trip_pages where trip_id = '11111111-1111-1111-1111-111111111111'), '1', '…and changes nothing');

select pg_temp.sign_in('00000000-0000-0000-0000-00000000000d');
select is((select count(*)::int from public.client_trips), 0, 'Dee''s address is on a trip, but her account never proved it owns the address: she sees nothing');
select is((select count(*)::int from public.client_trip_pages), 0, 'Dee can''t open the page either');

-- ---------- the admin ----------
select pg_temp.sign_in('00000000-0000-0000-0000-0000000000ad');
select is((select public.is_admin()), true, 'Tim is an admin');
select is((select count(*)::int from public.client_trips where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')), 2, 'Tim sees every client trip');
select is((select count(*)::int from public.client_trip_members where email like '%@rules.test'), 3, 'Tim sees who is on each trip');
select lives_ok($$insert into public.client_trip_members (trip_id, email) values ('22222222-2222-2222-2222-222222222222', 'ada@rules.test')$$, 'Tim adds Ada to a trip');
select throws_ok($$insert into public.client_trip_members (trip_id, email) values ('22222222-2222-2222-2222-222222222222', 'Ada@Rules.Test')$$, '23514', null, 'An address must be stored in lower case');

-- ---------- deleting an account ----------
select pg_temp.sign_in('00000000-0000-0000-0000-00000000000b');
select lives_ok('select public.delete_my_account()', 'Ben deletes his account');
select pg_temp.as_owner();
select is((select count(*)::int from auth.users where id = '00000000-0000-0000-0000-00000000000b'), 0, 'Ben''s account is gone');
select is((select count(*)::int from auth.users where email ilike '%@rules.test'), 4, 'Nobody else''s account went with it');

select * from finish();
rollback;
