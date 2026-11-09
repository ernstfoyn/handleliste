-- Rettelse: eieren skal kunne myk-slette listen.
--
-- Den gamle update-policyen hadde `with check (is_list_member(id))`. Når
-- deleted_at ble satt, returnerte is_list_member(false) for den nye raden, og
-- eierens sletting ble avvist av RLS. Triggeren håndhever fortsatt at bare
-- eier kan sette deleted_at.

drop policy if exists "lists_update_members" on public.lists;

create policy "lists_update_members"
  on public.lists for update
  to authenticated
  using (public.is_list_member(id))
  with check (deleted_at is not null or public.is_list_member(id));

-- Ekstra vern: id skal aldri kunne endres.
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

  if new.id <> old.id then
    raise exception 'Listens id kan ikke endres' using errcode = 'P0001';
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

revoke all on function public.set_list_metadata() from public;
