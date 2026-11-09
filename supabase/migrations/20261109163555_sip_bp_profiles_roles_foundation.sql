-- SIP-BP DEV: fondasi profil dan hak akses.
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete restrict,
  username text not null unique,
  nama_lengkap text not null,
  nip text,
  role text not null check (role in ('bendahara','bpp_rm','bpp_pnbp')),
  aktif boolean not null default true,
  wajib_ganti_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z][a-z0-9._-]{2,31}$')
);
create unique index profiles_one_active_bendahara
  on public.profiles ((role)) where role = 'bendahara' and aktif;
create schema if not exists sip_bp_private;
revoke all on schema sip_bp_private from public;
create function sip_bp_private.is_bendahara()
returns boolean language sql stable security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.profiles p
    where p.user_id = (select auth.uid())
      and p.aktif and p.role = 'bendahara'
  );
$$;
revoke all on function sip_bp_private.is_bendahara() from public;
grant usage on schema sip_bp_private to authenticated;
grant execute on function sip_bp_private.is_bendahara() to authenticated;
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
create policy profiles_read_own_or_bendahara
on public.profiles for select to authenticated
using (
  user_id = (select auth.uid())
  or (select sip_bp_private.is_bendahara())
);
comment on table public.profiles is 'Profil SIP-BP; akun dan password dikelola oleh Supabase Auth. Peran hanya dapat diubah melalui alur administrasi tepercaya.';
