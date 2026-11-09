CREATE OR REPLACE FUNCTION sip_bp_private.save_transaction(payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
 if coalesce(payload->>'status','Draft') not in ('Draft','Final') then
   raise exception 'Status transaksi tidak valid';
 end if;
 if payload->>'status'='Final' then
   if v_bruto<=0 then raise exception 'Finalisasi memerlukan nominal bruto positif'; end if;
   perform sip_bp_private.change_transaction_status(v_id,'Final');
 end if;
 return v_id;
end; $function$
;
