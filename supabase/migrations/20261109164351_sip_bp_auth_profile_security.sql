alter table public.profiles
  add column if not exists jabatan text not null default '',
  add column if not exists email_kontak text,
  add column if not exists password_updated_at timestamptz;
create index if not exists profiles_role_active on public.profiles(role,aktif);
create or replace function sip_bp_private.is_bendahara()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from public.profiles p
    where p.user_id = (select auth.uid())
      and p.aktif and not p.wajib_ganti_password and p.role = 'bendahara');
$$;
create or replace function sip_bp_private.can_access_source(p_source text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from public.profiles p
    where p.user_id = (select auth.uid())
      and p.aktif and not p.wajib_ganti_password
      and (p.role='bendahara'
        or (p.role='bpp_rm' and p_source='RM')
        or (p.role='bpp_pnbp' and p_source='PNBP')));
$$;
revoke all on function sip_bp_private.is_bendahara() from public;
revoke all on function sip_bp_private.can_access_source(text) from public;
grant execute on function sip_bp_private.is_bendahara() to authenticated;
grant execute on function sip_bp_private.can_access_source(text) to authenticated;
