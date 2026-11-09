create table public.account_events (
 id bigint generated always as identity primary key,
 actor_user_id uuid references auth.users(id),
 target_user_id uuid references auth.users(id),
 event_type text not null check (event_type in ('create_bpp','update_bpp','deactivate_bpp','activate_bpp','reset_bpp_password','password_changed')),
 reason text,
 created_at timestamptz not null default now()
);
alter table public.account_events enable row level security;
revoke all on public.account_events from anon,authenticated;
grant select on public.account_events to authenticated;
create policy account_events_bendahara_read on public.account_events for select to authenticated
using ((select sip_bp_private.is_bendahara()));
create function sip_bp_private.audit_profiles()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 insert into sip_bp_private.audit_log(table_name,record_id,event_type,actor_user_id,old_data,new_data)
 values ('profiles',coalesce(new.user_id,old.user_id)::text,tg_op,(select auth.uid()),
  case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
  case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end);
 return coalesce(new,old);
end;
$$;
create trigger profiles_audit after insert or update or delete on public.profiles
for each row execute function sip_bp_private.audit_profiles();
