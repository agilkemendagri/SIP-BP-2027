-- SIP-BP DEV 1D: security-checked atomic transaction API.
-- All browser writes stay REVOKED: public wrappers are invoker-only,
-- internal implementations are security-definer in a non-exposed schema.
create or replace function sip_bp_private.guard_rincian()
returns trigger language plpgsql set search_path=''
as $$
declare v_parent uuid;
declare v_status text;
declare v_sakti boolean;
begin
  v_parent := case when TG_OP='DELETE' then old.transaksi_id else new.transaksi_id end;
  select status,sudah_sakti into v_status,v_sakti
  from public.transaksi where id=v_parent for update;
  if v_status is null then raise exception 'Transaksi induk tidak ditemukan'; end if;
  if v_status<>'Draft' or v_sakti then
    raise exception 'Rincian hanya bisa diubah saat Draft dan belum digunakan SAKTI';
  end if;
  if TG_OP='DELETE' then return old; end if;
  return new;
end; $$;

create or replace function sip_bp_private.audit_row()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  insert into sip_bp_private.audit_log(table_name,record_id,event_type,actor_user_id,old_data,new_data)
  values (tg_table_name,
      case when tg_op='DELETE' then old.id::text else new.id::text end,
      tg_op, (select auth.uid()),
      case when tg_op<>'INSERT' then to_jsonb(old) end,
      case when tg_op<>'DELETE' then to_jsonb(new) end);
  if tg_op='DELETE' then return old; end if;
  return new;
end; $$;

create or replace function sip_bp_private.guard_transaksi()
returns trigger language plpgsql set search_path=''
as $$
begin
 if (old.id,old.nomor_sptb,old.urutan_sptb,old.tahun_penomoran,old.bulan_penomoran,old.sumber_dana)
 is distinct from
    (new.id,new.nomor_sptb,new.urutan_sptb,new.tahun_penomoran,new.bulan_penomoran,new.sumber_dana)
 then raise exception 'Nomor SPTB dan sumber dana tidak dapat diubah'; end if;
 if old.sudah_sakti then
   if coalesce(current_setting('sip_bp.unlock_sakti', true),'')<>'yes'
     or new.sudah_sakti or new.status<>'Final'
     or (to_jsonb(old) - array['sudah_sakti','tanggal_sakti','updated_at','updated_by'])
        is distinct from
        (to_jsonb(new) - array['sudah_sakti','tanggal_sakti','updated_at','updated_by'])
   then raise exception 'Transaksi telah dikunci SAKTI'; end if;
 end if;
 if old.status='Final' and new.status='Final' and not old.sudah_sakti then
   if (to_jsonb(old) - array['sudah_sakti','tanggal_sakti','updated_at','updated_by'])
     is distinct from
      (to_jsonb(new) - array['sudah_sakti','tanggal_sakti','updated_at','updated_by'])
   then raise exception 'Koreksi Final wajib dikembalikan ke Draft'; end if;
   if new.sudah_sakti and coalesce(current_setting('sip_bp.mark_sakti',true),'')<>'yes'
   then raise exception 'Penandaan SAKTI harus melalui prosedur khusus'; end if;
 end if;
 new.tahun_anggaran := extract(year from new.tanggal_kuitansi)::integer;
 new.updated_at := now();
 return new;
end; $$;

create or replace function sip_bp_private.save_transaction(payload jsonb)
returns uuid language plpgsql security definer set search_path=''
as $$
declare
 v_user uuid := (select auth.uid());
 v_source text := payload->>'sumberDana';
 v_id uuid;
 v_parent public.transaksi%rowtype;
 v_items jsonb := payload->'penerimaList';
 v_item jsonb;
 v_idx integer:=0;
 v_bruto numeric:=0; v_ppn numeric:=0; v_pph numeric:=0; v_netto numeric:=0;
 v_item_bruto numeric; v_item_ppn numeric; v_item_pph numeric; v_item_netto numeric;
 v_date date; v_akun text; v_type text;
begin
 if v_user is null or not sip_bp_private.can_access_source(v_source) then
  raise exception 'Akses transaksi tidak diizinkan' using errcode='42501';
 end if;
 if jsonb_typeof(payload)<>'object' or jsonb_typeof(v_items)<>'array'
    or jsonb_array_length(v_items) not between 1 and 250
 then raise exception 'Minimal satu rincian transaksi diwajibkan'; end if;
 v_type := payload->>'jenisKuitansi';
 v_akun := payload->>'kodeAkun';
 if v_source not in ('RM','PNBP')
   or v_type not in ('jasa_profesi','perjadin_luar_kota','perjadin_dalam_kota')
   or v_akun !~ '^[0-9]{6}$'
   or coalesce(payload->>'tanggalKuitansi','') !~ '^\d{4}-\d{2}-\d{2}$'
 then raise exception 'Sumber dana, jenis, akun, atau tanggal tidak valid'; end if;
 v_date := (payload->>'tanggalKuitansi')::date;
 if extract(year from v_date) not between 2020 and 2200 then
   raise exception 'Tahun kuitansi di luar rentang yang diizinkan'; end if;
 if nullif(payload->>'id','') is not null then
  v_id := (payload->>'id')::uuid;
  select * into v_parent from public.transaksi where id=v_id for update;
  if not found or v_parent.sumber_dana<>v_source
   or not sip_bp_private.can_access_source(v_parent.sumber_dana)
  then raise exception 'Transaksi tidak ditemukan atau akses ditolak' using errcode='42501'; end if;
  if v_parent.status<>'Draft' or v_parent.sudah_sakti then
   raise exception 'Koreksi hanya dapat dilakukan pada Draft belum SAKTI'; end if;
 end if;
 for v_item in select value from jsonb_array_elements(v_items)
 loop
   v_idx:=v_idx+1;
   if jsonb_typeof(v_item)<>'object' then raise exception 'Rincian tidak valid'; end if;
   v_item_bruto:=coalesce(nullif(v_item->>'bruto','')::numeric,0);
   v_item_ppn:=coalesce(nullif(v_item->>'ppnNominal','')::numeric,0);
   v_item_pph:=coalesce(nullif(v_item->>'pphNominal','')::numeric,0);
   v_item_netto:=coalesce(nullif(v_item->>'netto','')::numeric,0);
   if length(trim(coalesce(v_item->>'nama','')))=0
      or v_item_bruto<0 or v_item_ppn<0 or v_item_pph<0 or v_item_netto<0
      or abs(v_item_netto-(v_item_bruto-v_item_ppn-v_item_pph))>1.01
      or v_item_bruto>100000000000000
   then raise exception 'Nama penerima atau jumlah pajak/netto tidak konsisten pada rincian %',v_idx; end if;
   v_bruto:=v_bruto+v_item_bruto;
   v_ppn:=v_ppn+v_item_ppn;
   v_pph:=v_pph+v_item_pph;
   v_netto:=v_netto+v_item_netto;
 end loop;
 if v_id is null then
  insert into public.transaksi (
    sumber_dana,jenis_kuitansi,tanggal_kuitansi,kode_akun,nama_akun,kegiatan,uraian,ringkasan_penerima,
    total_bruto,total_ppn,total_pph,total_netto,status,
    ppk_nama,ppk_nip,bendahara_nama,bendahara_nip,
    nomor_surat_tugas,tanggal_tugas,kota_asal,kota_tujuan,created_by,updated_by,extra_data)
  values(
    v_source,v_type,v_date,v_akun,coalesce(payload->>'namaAkun',''),
    coalesce(payload->>'kegiatan',''),coalesce(payload->>'uraian',''),
    coalesce(payload->>'ringkasanPenerima',''),
    v_bruto,v_ppn,v_pph,v_netto,'Draft',
    payload->>'ppkNama',payload->>'ppkNip',payload->>'bendaharaNama',payload->>'bendaharaNip',
    payload->>'suratTugasNomor',nullif(payload->>'tanggalTugas','')::date,
    payload->>'kotaAsal',payload->>'kotaTujuan',
    v_user,v_user,'{}'::jsonb)
  returning id into v_id;
 else
  update public.transaksi set
    jenis_kuitansi=v_type,tanggal_kuitansi=v_date,kode_akun=v_akun,
    nama_akun=coalesce(payload->>'namaAkun',''),kegiatan=coalesce(payload->>'kegiatan',''),
    uraian=coalesce(payload->>'uraian',''),ringkasan_penerima=coalesce(payload->>'ringkasanPenerima',''),
    total_bruto=v_bruto,total_ppn=v_ppn,total_pph=v_pph,total_netto=v_netto,
    ppk_nama=payload->>'ppkNama',ppk_nip=payload->>'ppkNip',
    bendahara_nama=payload->>'bendaharaNama',bendahara_nip=payload->>'bendaharaNip',
    nomor_surat_tugas=payload->>'suratTugasNomor',tanggal_tugas=nullif(payload->>'tanggalTugas','')::date,
    kota_asal=payload->>'kotaAsal',kota_tujuan=payload->>'kotaTujuan',updated_by=v_user
  where id=v_id;
  delete from public.rincian_transaksi where transaksi_id=v_id;
 end if;
 v_idx:=0;
 for v_item in select value from jsonb_array_elements(v_items) loop
  v_idx:=v_idx+1;
  insert into public.rincian_transaksi (
    transaksi_id,urutan,nama_penerima,nip_nik,golongan,jabatan,uraian_item,
    volume,satuan,tarif_satuan,bruto,ppn_rate,ppn_nominal,pph_rate,pph_nominal,netto,npwp,rekening,bank)
  values(v_id,v_idx,v_item->>'nama',v_item->>'nip',v_item->>'golongan',
    v_item->>'jabatan',coalesce(v_item->>'uraianItem',''),
    coalesce(nullif(v_item->>'volume','')::numeric,0),
    coalesce(v_item->>'satuan',''),coalesce(nullif(v_item->>'tarifSatuan','')::numeric,0),
    coalesce(nullif(v_item->>'bruto','')::numeric,0),
    coalesce(nullif(v_item->>'ppnRate','')::numeric,0),
    coalesce(nullif(v_item->>'ppnNominal','')::numeric,0),
    coalesce(nullif(v_item->>'pphRate','')::numeric,0),
    coalesce(nullif(v_item->>'pphNominal','')::numeric,0),
    coalesce(nullif(v_item->>'netto','')::numeric,0),
    v_item->>'npwp',v_item->>'rekening',v_item->>'bank');
 end loop;
 return v_id;
end; $$;

create or replace function sip_bp_private.change_transaction_status(p_id uuid,p_status text)
returns boolean language plpgsql security definer set search_path=''
as $$
declare v_t public.transaksi%rowtype;
declare v_count integer;
begin
 if (select auth.uid()) is null or p_status not in ('Draft','Final') then
   raise exception 'Status atau sesi tidak valid' using errcode='42501'; end if;
 select * into v_t from public.transaksi where id=p_id for update;
 if not found or not sip_bp_private.can_access_source(v_t.sumber_dana) then
   raise exception 'Transaksi tidak ditemukan / akses ditolak' using errcode='42501'; end if;
 if v_t.sudah_sakti then raise exception 'Transaksi terkunci SAKTI'; end if;
 if v_t.status=p_status then return true; end if;
 if p_status='Final' then
   select count(*) into v_count from public.rincian_transaksi where transaksi_id=p_id;
   if v_count=0 or v_t.total_bruto<=0 then raise exception 'Finalisasi memerlukan rincian dan nilai bruto'; end if;
 end if;
 update public.transaksi set status=p_status,
   finalized_at=case when p_status='Final' then now() else null end,
   updated_by=(select auth.uid()) where id=p_id;
 return true;
end; $$;

create or replace function sip_bp_private.delete_transaction(p_id uuid)
returns boolean language plpgsql security definer set search_path=''
as $$
declare v_t public.transaksi%rowtype;
begin
 if (select auth.uid()) is null then raise exception 'Sesi tidak valid' using errcode='42501'; end if;
 select * into v_t from public.transaksi where id=p_id for update;
 if not found or not sip_bp_private.can_access_source(v_t.sumber_dana) then
   raise exception 'Transaksi tidak ditemukan / akses ditolak' using errcode='42501'; end if;
 if v_t.status<>'Draft' or v_t.sudah_sakti then
   raise exception 'Hanya transaksi Draft belum digunakan di SAKTI dapat dihapus'; end if;
 delete from public.rincian_transaksi where transaksi_id=p_id;
 delete from public.transaksi where id=p_id;
 return true;
end; $$;

create or replace function sip_bp_private.mark_transactions_sakti(p_ids uuid[])
returns integer language plpgsql security definer set search_path=''
as $$
declare v_t public.transaksi%rowtype; v_count integer:=0;
begin
 if (select auth.uid()) is null or array_length(p_ids,1) is null or array_length(p_ids,1)>100
 then raise exception 'Sesi tidak valid atau maksimal 100 SPTB' using errcode='42501'; end if;
 if array_length(p_ids,1) <> (select count(distinct id) from unnest(p_ids) as id)
 then raise exception 'ID transaksi berulang'; end if;
 for v_t in select * from public.transaksi where id=any(p_ids) order by id for update loop
   if not sip_bp_private.can_access_source(v_t.sumber_dana)
     or v_t.status<>'Final' or v_t.sudah_sakti
   then raise exception 'Ada SPTB tidak berhak, belum Final, atau sudah digunakan di SAKTI'; end if;
   v_count:=v_count+1;
 end loop;
 if v_count<>array_length(p_ids,1) then raise exception 'Sebagian SPTB tidak ditemukan'; end if;
 perform set_config('sip_bp.mark_sakti','yes',true);
 update public.transaksi set sudah_sakti=true,tanggal_sakti=now(),updated_by=(select auth.uid())
 where id=any(p_ids);
 perform set_config('sip_bp.mark_sakti','',true);
 return v_count;
end; $$;

create or replace function sip_bp_private.unlock_transaction_sakti(p_id uuid,p_reason text)
returns boolean language plpgsql security definer set search_path=''
as $$
declare v_t public.transaksi%rowtype;
begin
 if (select auth.uid()) is null
  or length(trim(coalesce(p_reason,'')))<10 or length(p_reason)>500 then
  raise exception 'Alasan pembukaan kunci minimal 10 karakter dan maksimal 500 karakter';
 end if;
 select * into v_t from public.transaksi where id=p_id for update;
 if not found or not sip_bp_private.can_access_source(v_t.sumber_dana)
   or not v_t.sudah_sakti then raise exception 'Transaksi tidak tersedia atau tidak berhak'; end if;
 perform set_config('sip_bp.unlock_sakti','yes',true);
 update public.transaksi set sudah_sakti=false,tanggal_sakti=null,updated_by=(select auth.uid())
 where id=p_id;
 perform set_config('sip_bp.unlock_sakti','',true);
 insert into sip_bp_private.audit_log(table_name,record_id,event_type,actor_user_id,reason,old_data,new_data)
 values('transaksi',p_id::text,'UNLOCK_SAKTI',(select auth.uid()),trim(p_reason),
        to_jsonb(v_t),(select to_jsonb(t) from public.transaksi t where t.id=p_id));
 return true;
end; $$;

-- Exposed RPC wrappers are SECURITY INVOKER, not SECURITY DEFINER.
create or replace function public.sip_bp_save_transaction(payload jsonb)
returns uuid language sql security invoker set search_path=''
as $$ select sip_bp_private.save_transaction(payload); $$;
create or replace function public.sip_bp_change_status(p_id uuid,p_status text)
returns boolean language sql security invoker set search_path=''
as $$ select sip_bp_private.change_transaction_status(p_id,p_status); $$;
create or replace function public.sip_bp_delete_transaction(p_id uuid)
returns boolean language sql security invoker set search_path=''
as $$ select sip_bp_private.delete_transaction(p_id); $$;
create or replace function public.sip_bp_mark_sakti(p_ids uuid[])
returns integer language sql security invoker set search_path=''
as $$ select sip_bp_private.mark_transactions_sakti(p_ids); $$;
create or replace function public.sip_bp_unlock_sakti(p_id uuid,p_reason text)
returns boolean language sql security invoker set search_path=''
as $$ select sip_bp_private.unlock_transaction_sakti(p_id,p_reason); $$;

revoke all on function sip_bp_private.save_transaction(jsonb) from public,anon;
revoke all on function sip_bp_private.change_transaction_status(uuid,text) from public,anon;
revoke all on function sip_bp_private.delete_transaction(uuid) from public,anon;
revoke all on function sip_bp_private.mark_transactions_sakti(uuid[]) from public,anon;
revoke all on function sip_bp_private.unlock_transaction_sakti(uuid,text) from public,anon;
grant usage on schema sip_bp_private to authenticated;
grant execute on function sip_bp_private.save_transaction(jsonb) to authenticated;
grant execute on function sip_bp_private.change_transaction_status(uuid,text) to authenticated;
grant execute on function sip_bp_private.delete_transaction(uuid) to authenticated;
grant execute on function sip_bp_private.mark_transactions_sakti(uuid[]) to authenticated;
grant execute on function sip_bp_private.unlock_transaction_sakti(uuid,text) to authenticated;
revoke all on function public.sip_bp_save_transaction(jsonb) from public,anon;
revoke all on function public.sip_bp_change_status(uuid,text) from public,anon;
revoke all on function public.sip_bp_delete_transaction(uuid) from public,anon;
revoke all on function public.sip_bp_mark_sakti(uuid[]) from public,anon;
revoke all on function public.sip_bp_unlock_sakti(uuid,text) from public,anon;
grant execute on function public.sip_bp_save_transaction(jsonb) to authenticated;
grant execute on function public.sip_bp_change_status(uuid,text) to authenticated;
grant execute on function public.sip_bp_delete_transaction(uuid) to authenticated;
grant execute on function public.sip_bp_mark_sakti(uuid[]) to authenticated;
grant execute on function public.sip_bp_unlock_sakti(uuid,text) to authenticated;
