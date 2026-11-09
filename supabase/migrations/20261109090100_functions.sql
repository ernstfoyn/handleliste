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
