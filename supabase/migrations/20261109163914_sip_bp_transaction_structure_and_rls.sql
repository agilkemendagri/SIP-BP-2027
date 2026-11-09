-- SIP-BP-DEV: transaction architecture, closed to writes from clients until vetted RPCs are deployed.
create table public.nomor_sptb_counter (
  tahun_penomoran integer not null check (tahun_penomoran between 2020 and 2200),
  bulan_penomoran integer not null check (bulan_penomoran between 1 and 12),
  sumber_dana text not null check (sumber_dana in ('RM','PNBP')),
  last_value integer not null default 0 check (last_value >= 0),
  primary key(tahun_penomoran, bulan_penomoran, sumber_dana)
);
create table public.transaksi (
  id uuid primary key default gen_random_uuid(),
  sumber_dana text not null check (sumber_dana in ('RM','PNBP')),
  jenis_kuitansi text not null check (jenis_kuitansi in ('jasa_profesi','perjadin_luar_kota','perjadin_dalam_kota')),
  tahun_anggaran integer not null check (tahun_anggaran between 2020 and 2200),
  tahun_penomoran integer not null,
  bulan_penomoran integer not null check (bulan_penomoran between 1 and 12),
  urutan_sptb integer not null check (urutan_sptb > 0),
  nomor_sptb text not null,
  tanggal_kuitansi date not null,
  kode_akun varchar(6) not null check (kode_akun ~ '^[0-9]{6}$'),
  nama_akun text not null default '',
  kegiatan text not null default '',
  uraian text not null default '',
  ringkasan_penerima text not null default '',
  total_bruto numeric(18,2) not null default 0 check (total_bruto >= 0),
  total_ppn numeric(18,2) not null default 0 check (total_ppn >= 0),
  total_pph numeric(18,2) not null default 0 check (total_pph >= 0),
  total_netto numeric(18,2) not null default 0 check (total_netto >= 0),
  status text not null default 'Draft' check (status in ('Draft','Final')),
  sudah_sakti boolean not null default false,
  tanggal_sakti timestamptz,
  nomor_sppd text,
  tanggal_sppd date,
  nomor_surat_tugas text,
  tanggal_tugas date,
  kota_asal text,
  kota_tujuan text,
  sudah_dibayar_semula numeric(18,2) not null default 0 check (sudah_dibayar_semula >= 0),
  ppk_nama text,
  ppk_nip text,
  bendahara_nama text,
  bendahara_nip text,
  extra_data jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finalized_at timestamptz,
  constraint unique_sptb_per_issuance_year unique (tahun_penomoran, nomor_sptb),
  constraint unique_sptb_sequence unique (tahun_penomoran, bulan_penomoran, sumber_dana, urutan_sptb),
  constraint sakti_requires_final check (not sudah_sakti or status = 'Final'),
  constraint sakti_date_consistent check ((sudah_sakti and tanggal_sakti is not null) or (not sudah_sakti and tanggal_sakti is null))
);
create index transaksi_scope_date_idx on public.transaksi(sumber_dana,tanggal_kuitansi desc);
create index transaksi_status_sakti_idx on public.transaksi(status,sudah_sakti);
create table public.rincian_transaksi (
  id uuid primary key default gen_random_uuid(),
  transaksi_id uuid not null references public.transaksi(id) on delete restrict,
  urutan integer not null check (urutan > 0),
  nama_penerima text not null default '',
  nip_nik text,
  golongan text,
  jabatan text,
  uraian_item text not null default '',
  volume numeric(14,3) not null default 0 check(volume >= 0),
  satuan text not null default '',
  tarif_satuan numeric(18,2) not null default 0 check(tarif_satuan >= 0),
  bruto numeric(18,2) not null default 0 check(bruto >= 0),
  ppn_rate numeric(7,3) not null default 0 check (ppn_rate between 0 and 100),
  ppn_nominal numeric(18,2) not null default 0 check(ppn_nominal >= 0),
  pph_rate numeric(7,3) not null default 0 check (pph_rate between 0 and 100),
  pph_nominal numeric(18,2) not null default 0 check(pph_nominal >= 0),
  netto numeric(18,2) not null default 0 check(netto >= 0),
  npwp text,
  bank text,
  rekening text,
  keterangan text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint satu_urutan_per_transaksi unique(transaksi_id,urutan)
);
create index rincian_transaksi_parent_idx on public.rincian_transaksi(transaksi_id);

create table public.konfigurasi_pejabat (
  id uuid primary key default gen_random_uuid(),
  sumber_dana text check(sumber_dana in ('RM','PNBP')),
  jenis_pejabat text not null check(jenis_pejabat in ('PPK','BENDAHARA','BPP')),
  nama text not null,
  nip text,
  jabatan_tertulis text,
  aktif boolean not null default true,
  berlaku_mulai date,
  berlaku_sampai date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tanggal_pejabat_valid check(berlaku_sampai is null or berlaku_mulai is null or berlaku_sampai >= berlaku_mulai)
);

create table sip_bp_private.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id text not null,
  event_type text not null,
  actor_user_id uuid,
  event_at timestamptz not null default now(),
  old_data jsonb,
  new_data jsonb,
  reason text
);
create index audit_log_record_idx on sip_bp_private.audit_log(table_name,record_id,event_at desc);

-- Sequential number allocated atomically on database insertion, using Jakarta-local issuance month.
create function sip_bp_private.assign_sptb_number()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_now date := (now() at time zone 'Asia/Jakarta')::date;
declare v_seq integer;
begin
  new.tahun_penomoran := extract(year from v_now)::integer;
  new.bulan_penomoran := extract(month from v_now)::integer;
  new.tahun_anggaran := extract(year from new.tanggal_kuitansi)::integer;
  insert into public.nomor_sptb_counter(tahun_penomoran,bulan_penomoran,sumber_dana,last_value)
  values(new.tahun_penomoran,new.bulan_penomoran,new.sumber_dana,1)
  on conflict (tahun_penomoran,bulan_penomoran,sumber_dana)
  do update set last_value = public.nomor_sptb_counter.last_value + 1
  returning last_value into v_seq;
  new.urutan_sptb := v_seq;
  new.nomor_sptb := 'SPTB/' || new.sumber_dana || '/BBPKAIV/' || new.bulan_penomoran || '/' || v_seq;
  return new;
end;
$$;
create trigger transaksi_set_number before insert on public.transaksi
for each row execute function sip_bp_private.assign_sptb_number();

-- Prevent inadvertent re-numbering, changing source, or altering records already used in SAKTI.
create function sip_bp_private.guard_transaksi()
returns trigger language plpgsql set search_path = ''
as $$
begin
 if (old.id,old.nomor_sptb,old.urutan_sptb,old.tahun_penomoran,old.bulan_penomoran,old.sumber_dana)
    is distinct from
    (new.id,new.nomor_sptb,new.urutan_sptb,new.tahun_penomoran,new.bulan_penomoran,new.sumber_dana)
 then raise exception 'Nomor SPTB dan sumber dana tidak dapat diubah';
 end if;
 if old.sudah_sakti then
   raise exception 'Transaksi terkunci setelah digunakan di SAKTI; pembukaan kunci harus melalui prosedur terotorisasi';
 end if;
 if old.status='Final' and new.status='Final' and
   (to_jsonb(old) - array['updated_at','updated_by']) is distinct from
   (to_jsonb(new) - array['updated_at','updated_by']) then
   raise exception 'Koreksi transaksi Final harus dikembalikan ke Draft terlebih dahulu';
 end if;
 new.tahun_anggaran := extract(year from new.tanggal_kuitansi)::integer;
 new.updated_at := now();
 return new;
end;
$$;
create trigger transaksi_guard before update on public.transaksi
for each row execute function sip_bp_private.guard_transaksi();

create function sip_bp_private.guard_rincian()
returns trigger language plpgsql set search_path = ''
as $$
declare v_parent uuid;
declare v_status text;
declare v_sakti boolean;
begin
  v_parent := coalesce(new.transaksi_id,old.transaksi_id);
  select status,sudah_sakti into v_status,v_sakti
    from public.transaksi where id = v_parent for update;
  if v_status is null then raise exception 'Transaksi induk tidak ditemukan'; end if;
  if v_status <> 'Draft' or v_sakti then
    raise exception 'Rincian hanya dapat diubah saat transaksi berstatus Draft dan belum digunakan di SAKTI';
  end if;
  return coalesce(new,old);
end;
$$;
create trigger rincian_guard before insert or update or delete on public.rincian_transaksi
for each row execute function sip_bp_private.guard_rincian();

create function sip_bp_private.audit_row()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 insert into sip_bp_private.audit_log(table_name,record_id,event_type,actor_user_id,old_data,new_data)
 values(tg_table_name,coalesce(new.id,old.id)::text,tg_op,(select auth.uid()),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end);
 return coalesce(new,old);
end;
$$;
create trigger transaksi_audit after insert or update or delete on public.transaksi
for each row execute function sip_bp_private.audit_row();
create trigger rincian_audit after insert or update or delete on public.rincian_transaksi
for each row execute function sip_bp_private.audit_row();

-- RLS for ALL public tables. No direct client writes until authorized RPC workflows are deployed.
alter table public.nomor_sptb_counter enable row level security;
alter table public.transaksi enable row level security;
alter table public.rincian_transaksi enable row level security;
alter table public.konfigurasi_pejabat enable row level security;
revoke all on public.nomor_sptb_counter, public.transaksi, public.rincian_transaksi, public.konfigurasi_pejabat from anon,authenticated;
grant select on public.transaksi,public.rincian_transaksi,public.konfigurasi_pejabat to authenticated;

create function sip_bp_private.can_access_source(p_source text)
returns boolean language sql stable security definer set search_path = ''
as $$
 select exists (
  select 1 from public.profiles p
  where p.user_id = (select auth.uid()) and p.aktif
    and (p.role='bendahara' or
      (p.role='bpp_rm' and p_source='RM') or
      (p.role='bpp_pnbp' and p_source='PNBP'))
 );
$$;
revoke all on function sip_bp_private.can_access_source(text) from public;
grant execute on function sip_bp_private.can_access_source(text) to authenticated;

create policy transaksi_read_scope on public.transaksi for select to authenticated
using ((select auth.uid()) is not null and (select sip_bp_private.can_access_source(sumber_dana)));
create policy rincian_read_scope on public.rincian_transaksi for select to authenticated
using (exists (select 1 from public.transaksi t where t.id=transaksi_id));
create policy pejabat_read_scope on public.konfigurasi_pejabat for select to authenticated
using (aktif and ((select sip_bp_private.can_access_source('RM')) and sumber_dana is null
  or (sumber_dana is not null and (select sip_bp_private.can_access_source(sumber_dana)))));
