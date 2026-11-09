begin;

set search_path = public, extensions;

select plan(13);

-- To brukere. Auth-triggeren oppretter profil, husholdning og standardliste.
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
)
values
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'a@example.com',
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Test A"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'b@example.com',
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Test B"}'::jsonb
  );

select is(
  (select count(*) from public.profiles where id = '00000000-0000-0000-0000-000000000001'),
  1::bigint,
  'auth-trigger oppretter profil'
);

-- Kontekst: bruker A.
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text,
  true
);
set local role authenticated;

select is(
  (select count(*) from public.lists where created_by = '00000000-0000-0000-0000-000000000001' and deleted_at is null),
  1::bigint,
  'A ser sin standardliste'
);

insert into public.lists (id, household_id, name, created_by, updated_by)
select
  '10000000-0000-0000-0000-000000000001',
  hm.household_id,
  'Delt testliste',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
from public.household_members hm
where hm.user_id = '00000000-0000-0000-0000-000000000001'
limit 1;

select is(
  (select count(*) from public.lists where id = '10000000-0000-0000-0000-000000000001'),
  1::bigint,
  'A kan opprette liste i egen husholdning'
);

select is(
  (
    select count(*)
    from public.list_members
    where list_id = '10000000-0000-0000-0000-000000000001'
      and user_id = '00000000-0000-0000-0000-000000000001'
      and role = 'owner'
  ),
  1::bigint,
  'oppretter blir eier automatisk'
);

insert into public.items (
  id,
  list_id,
  name,
  display_name,
  normalized_name,
  created_by,
  updated_by,
  position
)
values (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Brød',
  'Brød',
  'brød',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  1
);

select is(
  (select count(*) from public.items where list_id = '10000000-0000-0000-0000-000000000001'),
  1::bigint,
  'A ser egen vare'
);

insert into public.list_invites (list_id, token, created_by)
values (
  '10000000-0000-0000-0000-000000000001',
  'rls-test-invite-token',
  '00000000-0000-0000-0000-000000000001'
);

-- Kontekst: bruker B, som ikke er medlem.
reset role;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000002', 'role', 'authenticated')::text,
  true
);
set local role authenticated;

select is(
  (select count(*) from public.lists where id = '10000000-0000-0000-0000-000000000001'),
  0::bigint,
  'ikke-medlem får 0 rader fra listen'
);

select is(
  (select count(*) from public.items where list_id = '10000000-0000-0000-0000-000000000001'),
  0::bigint,
  'ikke-medlem får 0 rader fra varene'
);

select is(
  (select count(*) from public.list_invites where list_id = '10000000-0000-0000-0000-000000000001'),
  0::bigint,
  'ikke-eier ser ikke invitasjoner'
);

select throws_ok(
  $$
    insert into public.items (
      id, list_id, name, display_name, normalized_name, created_by, updated_by, position
    )
    values (
      '20000000-0000-0000-0000-000000000002',
      '10000000-0000-0000-0000-000000000001',
      'Melk',
      'Melk',
      'melk',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000002',
      2
    )
  $$,
  '42501',
  null,
  'ikke-medlem kan ikke skrive til listen'
);

select lives_ok(
  $$ select * from public.accept_list_invite('rls-test-invite-token') $$,
  'invitasjons-RPC gir medlemskap'
);

select is(
  (select count(*) from public.items where list_id = '10000000-0000-0000-0000-000000000001'),
  1::bigint,
  'medlem ser varene etter å ha blitt med'
);

select throws_ok(
  $$
    update public.lists
    set deleted_at = now()
    where id = '10000000-0000-0000-0000-000000000001'
  $$,
  'P0001',
  null,
  'medlem kan ikke slette listen'
);

-- Tilbake til eier: eieren skal kunne myk-slette listen.
reset role;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text,
  true
);
set local role authenticated;

select lives_ok(
  $$
    update public.lists
    set deleted_at = now()
    where id = '10000000-0000-0000-0000-000000000001'
  $$,
  'eier kan slette listen'
);

select * from finish();

rollback;
