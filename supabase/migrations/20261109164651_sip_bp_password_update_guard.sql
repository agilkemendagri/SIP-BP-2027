-- Supabase Auth owns password hashes. Clear forced-password-change only after auth.users actually updates its hash.
create function sip_bp_private.on_auth_password_updated()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 if new.encrypted_password is distinct from old.encrypted_password then
   update public.profiles
   set wajib_ganti_password = false,
       password_updated_at = now(), updated_at = now()
   where user_id = new.id;
 end if;
 return new;
end;
$$;
create trigger sip_bp_auth_password_updated after update of encrypted_password on auth.users
for each row when (old.encrypted_password is distinct from new.encrypted_password)
execute function sip_bp_private.on_auth_password_updated();
