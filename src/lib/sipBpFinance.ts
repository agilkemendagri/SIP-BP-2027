import { sessionToken } from "./sipBpAuth";
import type { Transaksi, PenerimaItem } from "../types";
const root = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/,"");
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
async function api(path:string,options:RequestInit={}):Promise<any> {
 const token=await sessionToken();
 if(!token) throw new Error("Sesi login berakhir. Silakan login kembali.");
 const res=await fetch(root+path,{
  ...options, cache:"no-store",
  headers:{"apikey":key,"Authorization":"Bearer "+token,"Content-Type":"application/json",...(options.headers||{})}
 });
 const payload=await res.json().catch(()=>null);
 if(!res.ok) {
  const message=payload?.message||payload?.error_description||payload?.hint||payload?.error||"Layanan tidak tersedia";
  throw new Error(String(message));
 }
 return payload;
}
const num=(v:unknown)=>Number(v||0);
export const financeRpc=(name:string,args:Record<string,unknown>)=>api(
 "/rest/v1/rpc/"+encodeURIComponent(name),{method:"POST",body:JSON.stringify(args)}
);
function mapTransaction(t:any):Transaksi {
 const items=(t.rincian_transaksi||[]).sort((a:any,b:any)=>a.urutan-b.urutan);
 return {
  id:t.id,
  nomorKuitansi:t.nomor_sptb,
  nomorSPTB:t.nomor_sptb,
  tanggalKuitansi:t.tanggal_kuitansi,
  sumberDana:t.sumber_dana,
  jenisKuitansi:t.jenis_kuitansi,
  kegiatan:t.kegiatan||"",
  kodeAkun:t.kode_akun,
  namaAkun:t.nama_akun||"",
  uraian:t.uraian||"",
  ringkasanPenerima:t.ringkasan_penerima||"",
  penerimaList:items.map((r:any):PenerimaItem=>({
    id:r.id,nama:r.nama_penerima,nip:r.nip_nik||undefined,
    golongan:r.golongan||undefined,jabatan:r.jabatan||undefined,
    uraianItem:r.uraian_item,volume:num(r.volume),satuan:r.satuan||"",
    tarifSatuan:num(r.tarif_satuan),bruto:num(r.bruto),
    ppnRate:num(r.ppn_rate),ppnNominal:num(r.ppn_nominal),
    pphRate:num(r.pph_rate),pphNominal:num(r.pph_nominal),
    netto:num(r.netto),npwp:r.npwp||undefined,rekening:r.rekening||undefined,bank:r.bank||undefined
  })),
  totalBruto:num(t.total_bruto),totalPPN:num(t.total_ppn),
  totalPPh:num(t.total_pph),totalNetto:num(t.total_netto),
  status:t.status,sudahSakti:!!t.sudah_sakti,
  tanggalSakti:t.tanggal_sakti?String(t.tanggal_sakti).slice(0,10):undefined,
  ppkNama:t.ppk_nama||"",ppkNip:t.ppk_nip||"",
  bendaharaNama:t.bendahara_nama||"",bendaharaNip:t.bendahara_nip||"",
  suratTugasNomor:t.nomor_surat_tugas||undefined,
  tanggalTugas:t.tanggal_tugas||undefined,
  kotaAsal:t.kota_asal||undefined,kotaTujuan:t.kota_tujuan||undefined,
  createdAt:t.created_at,updatedAt:t.updated_at
 };
}
export async function fetchFinancialTransactions():Promise<Transaksi[]> {
 const rows:any[]=[];
 // Read visible data only. Supabase RLS checks the current logged-in role.
 for(let offset=0;offset<20000;offset+=500) {
   const batch=await api("/rest/v1/transaksi?select=*,rincian_transaksi(*)&order=tanggal_kuitansi.desc,created_at.desc&limit=500&offset="+offset);
   if(!Array.isArray(batch)) throw new Error("Format data transaksi tidak dikenali");
   rows.push(...batch);
   if(batch.length<500) return rows.map(mapTransaction);
 }
 throw new Error("Batas pembacaan 20.000 transaksi tercapai. Gunakan filter server.");
}
export async function saveFinancialTransaction(data:Omit<Transaksi,"id"|"createdAt"|"updatedAt">|Transaksi,existingId?:string) {
 const payload:any={...data};
 // The backend assigns SPTB numbers; client-provided numbers are ignored.
 delete payload.nomorSPTB;delete payload.nomorKuitansi;
 delete payload.sudahSakti;delete payload.tanggalSakti;
 delete payload.createdAt;delete payload.updatedAt;
 if(existingId) payload.id=existingId;
 else delete payload.id;
 // Server saves and optionally finalizes within a single database transaction.
 const id=await financeRpc("sip_bp_save_transaction",{payload});
 return id as string;
}
export async function changeFinancialStatus(id:string,status:"Draft"|"Final") {
 await financeRpc("sip_bp_change_status",{p_id:id,p_status:status});
}
export async function deleteFinancialTransaction(id:string) {
 await financeRpc("sip_bp_delete_transaction",{p_id:id});
}
export async function bulkMarkFinancialSakti(ids:string[]) {
 if(ids.length<1||ids.length>100) throw new Error("Penandaan SAKTI maksimal 100 transaksi");
 return financeRpc("sip_bp_mark_sakti",{p_ids:ids});
}
export async function unlockFinancialSakti(id:string,reason:string) {
 return financeRpc("sip_bp_unlock_sakti",{p_id:id,p_reason:reason});
}
