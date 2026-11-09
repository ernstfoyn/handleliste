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
