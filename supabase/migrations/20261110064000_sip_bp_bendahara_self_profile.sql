-- Bendahara may maintain only their own display identity.
-- Never grant direct UPDATE privilege on public.profiles.
create or replace function public.sip_bp_update_own_profile(
  p_nama_lengkap text,
  p_nip text,
  p_jabatan text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(p_nama_lengkap, ''));
  v_nip text := nullif(btrim(coalesce(p_nip, '')), '');
  v_jabatan text := btrim(coalesce(p_jabatan, ''));
begin
  if not (select sip_bp_private.is_bendahara()) then
    raise exception 'Hanya Bendahara aktif yang dapat mengubah profilnya sendiri'
      using errcode='42501';
  end if;
  if length(v_name) < 3 or length(v_name) > 160 then
    raise exception 'Nama lengkap harus 3 sampai 160 karakter'
      using errcode='22023';
  end if;
  if v_nip is not null and v_nip !~ '^[0-9]{18}$' then
    raise exception 'NIP harus 18 digit angka atau dikosongkan'
      using errcode='22023';
  end if;
  if length(v_jabatan) < 3 or length(v_jabatan) > 160 then
    raise exception 'Jabatan harus 3 sampai 160 karakter'
      using errcode='22023';
  end if;
  update public.profiles
  set nama_lengkap=v_name,
      nip=v_nip,
      jabatan=v_jabatan,
      updated_at=now()
  where user_id=(select auth.uid()) and role='bendahara' and aktif
    and not wajib_ganti_password;
  if not found then
    raise exception 'Profil Bendahara tidak ditemukan atau tidak aktif'
      using errcode='42501';
  end if;
end;
$$;
revoke all on function public.sip_bp_update_own_profile(text,text,text) from public,anon;
grant execute on function public.sip_bp_update_own_profile(text,text,text) to authenticated;
comment on function public.sip_bp_update_own_profile(text,text,text) is
  'Allows active Bendahara to edit only their own nama_lengkap, nip and jabatan; role and authentication metadata remain protected.';
