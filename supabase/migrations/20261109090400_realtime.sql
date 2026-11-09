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
