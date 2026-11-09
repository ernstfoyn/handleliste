-- Handlelista – samlet SQL for Supabase SQL Editor.
-- Kilde: supabase/migrations/*.sql. Ved endringer i migrasjonene, bruk migrasjonene
-- som sannhet og generer denne filen på nytt.

-- ============================================================
-- supabase/migrations/20261109090000_schema.sql
-- ============================================================
-- Handlelista – grunnskjema
-- Alle id-er som lages på klienten er UUID-er slik at offline-synk blir idempotent.

create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Gjest'
    check (char_length(btrim(display_name)) between 1 and 60),
  created_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Min husholdning'
    check (char_length(btrim(name)) between 1 and 120),
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table public.lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  archived_at timestamptz,
  deleted_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lists_household_idx on public.lists (household_id) where deleted_at is null;

create table public.list_members (
  list_id uuid not null references public.lists (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (list_id, user_id)
);

create index list_members_user_idx on public.list_members (user_id);
create index list_members_list_idx on public.list_members (list_id);

create table public.items (
  id uuid primary key,
  list_id uuid not null references public.lists (id) on delete cascade,
  name text not null,
  display_name text not null,
  normalized_name text not null,
  quantity text,
  note text,
  is_checked boolean not null default false,
  checked_at timestamptz,
  deleted_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  position bigint not null default 0,
  constraint items_display_name_length check (char_length(btrim(display_name)) between 1 and 200),
  constraint items_quantity_length check (quantity is null or char_length(quantity) <= 80),
  constraint items_note_length check (note is null or char_length(note) <= 500)
);

create index items_list_idx on public.items (list_id, position) where deleted_at is null;
create index items_list_checked_idx on public.items (list_id, is_checked) where deleted_at is null;

create table public.item_catalog (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  normalized_name text not null,
  display_name text not null,
  use_count integer not null default 0 check (use_count >= 0),
  last_used_at timestamptz not null default now(),
  unique (household_id, normalized_name)
);

create index item_catalog_household_idx on public.item_catalog (household_id);

create table public.list_invites (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists (id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(18), 'hex'),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  revoked_at timestamptz
);

create index list_invites_list_idx on public.list_invites (list_id);

-- ============================================================
-- supabase/migrations/20261109090100_functions.sql
-- ============================================================
-- Hjelpefunksjoner, triggere og idempotent bootstrap.
-- Funksjonene er SECURITY DEFINER for å unngå RLS-resursjon mellom
-- lists <-> list_members <-> profiles. De tar aldri imot en user_id fra
-- klienten uten at den er eksplisitt dokumentert.

create or replace function public.is_household_member(
  p_household_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.user_id = p_user_id
  );
$$;

create or replace function public.is_list_member(
  p_list_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.list_members lm
    join public.lists l on l.id = lm.list_id
    where lm.list_id = p_list_id
      and lm.user_id = p_user_id
      and l.deleted_at is null
  );
$$;

create or replace function public.is_list_owner(
  p_list_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.list_members lm
    join public.lists l on l.id = lm.list_id
    where lm.list_id = p_list_id
      and lm.user_id = p_user_id
      and lm.role = 'owner'
      and l.deleted_at is null
  );
$$;

create or replace function public.shares_list_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.list_members me
    join public.lists l on l.id = me.list_id and l.deleted_at is null
    join public.list_members them on them.list_id = me.list_id
    where me.user_id = auth.uid()
      and them.user_id = p_user_id
  );
$$;

revoke all on function public.is_household_member(uuid, uuid) from public;
revoke all on function public.is_list_member(uuid, uuid) from public;
revoke all on function public.is_list_owner(uuid, uuid) from public;
revoke all on function public.shares_list_with(uuid) from public;
grant execute on function public.is_household_member(uuid, uuid) to authenticated;
grant execute on function public.is_list_member(uuid, uuid) to authenticated;
grant execute on function public.is_list_owner(uuid, uuid) to authenticated;
grant execute on function public.shares_list_with(uuid) to authenticated;

-- Lister: serverstempler og eierskapskontroll ved sletting.
create or replace function public.set_list_metadata()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.updated_at := now();
    new.updated_by := coalesce(auth.uid(), new.created_by);
    return new;
  end if;

  if new.household_id <> old.household_id then
    raise exception 'En liste kan ikke flyttes til en annen husholdning';
  end if;

  if new.deleted_at is not null and old.deleted_at is null and not public.is_list_owner(old.id) then
    raise exception 'Kun eier kan slette listen' using errcode = 'P0001';
  end if;

  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), old.updated_by);
  return new;
end;
$$;

create trigger lists_set_metadata
  before insert or update on public.lists
  for each row execute function public.set_list_metadata();

-- Alle som oppretter en liste blir eier. Dette gjør at klienten kan opprette
-- lister offline med klient-generert UUID, uten en ekstra RPC.
create or replace function public.add_list_owner()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.created_by is not null then
    insert into public.list_members (list_id, user_id, role)
    values (new.id, new.created_by, 'owner')
    on conflict (list_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger lists_add_owner
  after insert on public.lists
  for each row execute function public.add_list_owner();

-- Varer: serverstempler. normalized_name kommer fra klienten (samme
-- normalisering som autocomplete bruker), med en enkel fallback.
create or replace function public.set_item_metadata()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.updated_at := now();
    new.created_by := coalesce(new.created_by, auth.uid());
    new.updated_by := coalesce(auth.uid(), new.created_by);
    new.normalized_name := coalesce(
      nullif(btrim(new.normalized_name), ''),
      lower(btrim(new.display_name))
    );
    return new;
  end if;

  new.list_id := old.list_id;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), old.updated_by);
  new.normalized_name := coalesce(
    nullif(btrim(new.normalized_name), ''),
    old.normalized_name,
    lower(btrim(new.display_name))
  );
  return new;
end;
$$;

create trigger items_set_metadata
  before insert or update on public.items
  for each row execute function public.set_item_metadata();

create or replace function public.touch_list_from_item()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_list_id uuid := coalesce(new.list_id, old.list_id);
begin
  update public.lists
  set updated_at = now(),
      updated_by = coalesce(auth.uid(), updated_by)
  where id = v_list_id;
  return null;
end;
$$;

create trigger items_touch_list
  after insert or update or delete on public.items
  for each row execute function public.touch_list_from_item();

-- Alle varer man legger inn skal huskes, også de som ennå ikke er huket av.
-- Selve kjøpet telles først når varen går til kjøpt (record_catalog_use).
create or replace function public.record_catalog_on_add()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_household_id uuid;
  v_normalized_name text;
begin
  select l.household_id into v_household_id
  from public.lists l
  where l.id = new.list_id;

  v_normalized_name := coalesce(
    nullif(btrim(new.normalized_name), ''),
    lower(btrim(new.display_name))
  );

  if v_household_id is not null and v_normalized_name <> '' then
    insert into public.item_catalog (household_id, normalized_name, display_name, use_count, last_used_at)
    values (v_household_id, v_normalized_name, new.display_name, 0, now())
    on conflict (household_id, normalized_name) do update
      set display_name = excluded.display_name,
          last_used_at = now();
  end if;
  return null;
end;
$$;

create trigger items_record_catalog_add
  after insert on public.items
  for each row execute function public.record_catalog_on_add();

-- Historikk: use_count økes kun når en vare går fra ukjøpt til kjøpt.
-- Det gjør replay av samme outbox-operasjon idempotent (ingen ny overgang).
create or replace function public.record_catalog_use()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_household_id uuid;
  v_normalized_name text;
begin
  if new.is_checked and not coalesce(old.is_checked, false) then
    select l.household_id into v_household_id
    from public.lists l
    where l.id = new.list_id;

    v_normalized_name := coalesce(
      nullif(btrim(new.normalized_name), ''),
      lower(btrim(new.display_name))
    );

    if v_household_id is not null and v_normalized_name <> '' then
      insert into public.item_catalog (household_id, normalized_name, display_name, use_count, last_used_at)
      values (v_household_id, v_normalized_name, new.display_name, 1, now())
      on conflict (household_id, normalized_name) do update
        set use_count = public.item_catalog.use_count + 1,
            display_name = excluded.display_name,
            last_used_at = now();
    end if;
  end if;
  return null;
end;
$$;

create trigger items_record_catalog
  after update of is_checked on public.items
  for each row execute function public.record_catalog_use();

-- Ny bruker: profil + husholdning + standardliste.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_household_id uuid;
  v_list_id uuid;
  v_display_name text;
begin
  v_display_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Gjest'
  );

  insert into public.profiles (id, display_name)
  values (new.id, left(v_display_name, 60))
  on conflict (id) do nothing;

  insert into public.households (name)
  values ('Min husholdning')
  returning id into v_household_id;

  insert into public.household_members (household_id, user_id, role)
  values (v_household_id, new.id, 'owner')
  on conflict do nothing;

  insert into public.lists (household_id, name, created_by, updated_by)
  values (v_household_id, 'Handleliste', new.id, new.id)
  returning id into v_list_id;

  insert into public.list_members (list_id, user_id, role)
  values (v_list_id, new.id, 'owner')
  on conflict do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Idempotent reparasjon for brukere som mangler profil/husholdning/liste.
create or replace function public.ensure_bootstrap()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_household_id uuid;
  v_list_id uuid;
  v_display_name text;
begin
  if v_user_id is null then
    return;
  end if;

  select coalesce(
    nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'Gjest'
  )
  into v_display_name
  from auth.users u
  where u.id = v_user_id;

  insert into public.profiles (id, display_name)
  values (v_user_id, left(coalesce(v_display_name, 'Gjest'), 60))
  on conflict (id) do nothing;

  select hm.household_id into v_household_id
  from public.household_members hm
  where hm.user_id = v_user_id
  order by hm.created_at
  limit 1;

  if v_household_id is null then
    insert into public.households (name)
    values ('Min husholdning')
    returning id into v_household_id;

    insert into public.household_members (household_id, user_id, role)
    values (v_household_id, v_user_id, 'owner')
    on conflict do nothing;
  end if;

  if not exists (
    select 1
    from public.lists l
    join public.list_members lm on lm.list_id = l.id
    where l.household_id = v_household_id
      and lm.user_id = v_user_id
      and l.deleted_at is null
  ) then
    insert into public.lists (household_id, name, created_by, updated_by)
    values (v_household_id, 'Handleliste', v_user_id, v_user_id)
    returning id into v_list_id;

    insert into public.list_members (list_id, user_id, role)
    values (v_list_id, v_user_id, 'owner')
    on conflict do nothing;
  end if;
end;
$$;

revoke all on function public.ensure_bootstrap() from public;
grant execute on function public.ensure_bootstrap() to authenticated;

-- Triggerfunksjoner skal ikke kunne kalles direkte fra klienten.
revoke all on function public.set_list_metadata() from public;
revoke all on function public.add_list_owner() from public;
revoke all on function public.set_item_metadata() from public;
revoke all on function public.touch_list_from_item() from public;
revoke all on function public.record_catalog_use() from public;
revoke all on function public.record_catalog_on_add() from public;
revoke all on function public.handle_new_user() from public;

-- ============================================================
-- supabase/migrations/20261109090200_rls.sql
-- ============================================================
-- Row Level Security. Ingen liste skal kunne leses eller skrives uten medlemskap.
-- Hjelpefunksjonene er SECURITY DEFINER og eier av tabellene, slik at policyene
-- ikke resurserer gjennom list_members/profiles.

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.lists enable row level security;
alter table public.list_members enable row level security;
alter table public.items enable row level security;
alter table public.item_catalog enable row level security;
alter table public.list_invites enable row level security;

-- Profiler: egen profil + profiler til folk man deler minst én liste med.
create policy "profiles_select_self_or_list_peers"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.shares_list_with(id));

create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Husholdninger: kun medlemmer.
create policy "households_select_members"
  on public.households for select
  to authenticated
  using (public.is_household_member(id));

create policy "household_members_select_members"
  on public.household_members for select
  to authenticated
  using (public.is_household_member(household_id));

-- Lister.
create policy "lists_select_members"
  on public.lists for select
  to authenticated
  using (public.is_list_member(id));

create policy "lists_insert_household_member"
  on public.lists for insert
  to authenticated
  with check (created_by = auth.uid() and public.is_household_member(household_id));

create policy "lists_update_members"
  on public.lists for update
  to authenticated
  using (public.is_list_member(id))
  with check (public.is_list_member(id));

-- Listemedlemmer: alle medlemmer kan se hvem som er med. Kun eier kan fjerne
-- andre, og eier kan ikke fjerne seg selv (listen må alltid ha en eier).
create policy "list_members_select_members"
  on public.list_members for select
  to authenticated
  using (public.is_list_member(list_id));

create policy "list_members_delete_owner"
  on public.list_members for delete
  to authenticated
  using (public.is_list_owner(list_id) and user_id <> auth.uid());

-- Varer.
create policy "items_select_members"
  on public.items for select
  to authenticated
  using (public.is_list_member(list_id));

create policy "items_insert_members"
  on public.items for insert
  to authenticated
  with check (public.is_list_member(list_id) and created_by = auth.uid());

create policy "items_update_members"
  on public.items for update
  to authenticated
  using (public.is_list_member(list_id))
  with check (public.is_list_member(list_id));

create policy "items_delete_members"
  on public.items for delete
  to authenticated
  using (public.is_list_member(list_id));

-- Varehistorikk: leses av husholdningen. Skrives kun av triggeren
-- record_catalog_use (SECURITY DEFINER). Klienten kan derfor ikke jukse
-- use_count opp eller ned.
create policy "item_catalog_select_household"
  on public.item_catalog for select
  to authenticated
  using (public.is_household_member(household_id));

-- Invitasjoner: kun eier kan se/lage/oppheve. Selve innløsningen skjer via
-- SECURITY DEFINER-RPC-en accept_list_invite.
create policy "list_invites_select_owner"
  on public.list_invites for select
  to authenticated
  using (public.is_list_owner(list_id));

create policy "list_invites_insert_owner"
  on public.list_invites for insert
  to authenticated
  with check (public.is_list_owner(list_id) and created_by = auth.uid());

create policy "list_invites_update_owner"
  on public.list_invites for update
  to authenticated
  using (public.is_list_owner(list_id))
  with check (public.is_list_owner(list_id));

create policy "list_invites_delete_owner"
  on public.list_invites for delete
  to authenticated
  using (public.is_list_owner(list_id));

-- Grunnleggende grants. RLS gjør resten.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ============================================================
-- supabase/migrations/20261109090300_rpc.sql
-- ============================================================
-- Invitasjons-RPC. SECURITY DEFINER fordi mottakeren verken er medlem eller
-- eier av listen ennå. Tokenet er hemmeligheten, og funksjonen gir kun
-- medlemskap i den listen tokenet peker på.

create or replace function public.accept_list_invite(p_token text)
returns table (list_id uuid, list_name text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_invite public.list_invites%rowtype;
  v_list public.lists%rowtype;
begin
  if v_user_id is null then
    raise exception 'Du må være innlogget.' using errcode = '28000';
  end if;

  select *
  into v_invite
  from public.list_invites li
  where li.token = p_token
    and li.revoked_at is null
    and li.expires_at > now();

  if not found then
    raise exception 'Invitasjonen er ugyldig eller utløpt.' using errcode = 'P0002';
  end if;

  select *
  into v_list
  from public.lists l
  where l.id = v_invite.list_id
    and l.deleted_at is null;

  if not found then
    raise exception 'Listen finnes ikke lenger.' using errcode = 'P0002';
  end if;

  insert into public.list_members (list_id, user_id, role)
  values (v_invite.list_id, v_user_id, 'member')
  on conflict on constraint list_members_pkey do nothing;

  return query select v_list.id, v_list.name;
end;
$$;

revoke all on function public.accept_list_invite(text) from public;
grant execute on function public.accept_list_invite(text) to authenticated;

-- ============================================================
-- supabase/migrations/20261109090400_realtime.sql
-- ============================================================
-- Realtime: full rad ved delete, og legg tabellene til publikasjonen.
-- Supabase aktiverer Realtime for publikasjonen supabase_realtime.

alter table public.items replica identity full;
alter table public.lists replica identity full;
alter table public.list_members replica identity full;
alter table public.profiles replica identity full;
alter table public.item_catalog replica identity full;
alter table public.households replica identity full;

do $$
declare
  table_name text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach table_name in array array[
      'items',
      'lists',
      'list_members',
      'profiles',
      'item_catalog',
      'households'
    ]
    loop
      begin
        execute format('alter publication supabase_realtime add table public.%I', table_name);
      exception
        when duplicate_object then null;
      end;
    end loop;
  end if;
end;
$$;

