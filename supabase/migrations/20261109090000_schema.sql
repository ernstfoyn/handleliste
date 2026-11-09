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
