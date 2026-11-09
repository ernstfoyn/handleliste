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
