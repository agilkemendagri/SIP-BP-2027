import { sessionToken } from "./sipBpAuth";
import type { Transaksi, PenerimaItem } from "../types";
const root = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/,"");
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
/** HTTP error with a confirmed server response. Transport failures are not safe to retry for financial writes. */
class SipBpHttpError extends Error {
 constructor(message:string,public readonly status:number) {super(message);this.name="SipBpHttpError";}
}
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
  throw new SipBpHttpError(String(message),res.status);
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
// Reconcile document-level travel taxes with item-level detail before server validation.
// The server remains authoritative and independently validates all monetary amounts.
function reconcileFinanceLines(data:Omit<Transaksi,"id"|"createdAt"|"updatedAt">|Transaksi) {
 const source=data.penerimaList||[];
 if(!source.length)throw new Error("Minimal satu penerima/rincian diperlukan.");
 const rows=source.map(p=>({...p}));
 const bruto=rows.reduce((n,p)=>n+Number(p.bruto||0),0);
 if(Math.abs(bruto-Number(data.totalBruto||0))>1)
   throw new Error("Jumlah bruto rincian tidak cocok dengan total kuitansi.");
 for(const [field,target] of [["ppnNominal",Number(data.totalPPN||0)],["pphNominal",Number(data.totalPPh||0)]] as const){
  const actual=rows.reduce((n,p)=>n+Number(p[field]||0),0);
  const difference=Math.round((target-actual)*100)/100;
  if(Math.abs(difference)<0.01)continue;
  if(Math.abs(difference)<=rows.length) {
   const last=rows[rows.length-1];
   (last as any)[field]=Number(((Number(last[field]||0))+difference).toFixed(2));
  }else if(actual===0&&target>0&&bruto>0) {
   let allocated=0;
   rows.forEach((p,i)=>{
    const tax=i===rows.length-1?target-allocated:Math.round(target*Number(p.bruto||0)/bruto*100)/100;
    (p as any)[field]=tax;allocated+=tax;
   });
  }else throw new Error("Jumlah pajak rincian tidak sesuai total dokumen. Koreksi rincian sebelum menyimpan.");
 }
 rows.forEach(p=>{p.netto=Number((Number(p.bruto||0)-Number(p.ppnNominal||0)-Number(p.pphNominal||0)).toFixed(2));});
 const net=rows.reduce((n,p)=>n+p.netto,0);
 if(net<0||Math.abs(net-Number(data.totalNetto||0))>Math.max(1,rows.length))
   throw new Error("Jumlah netto tidak cocok dengan bruto dikurangi pajak.");
 return rows;
}

export async function saveFinancialTransaction(data:Omit<Transaksi,"id"|"createdAt"|"updatedAt">|Transaksi,existingId?:string) {
 const payload:any={...data,penerimaList:reconcileFinanceLines(data)};
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
export interface SaktiBatchReport {
 succeeded: string[];
 failed: { id: string; message: string }[];
}
/**
 * Prefer one atomic server request. A mixed invalid batch falls back to
 * individual requests; the UI can then report exact successes and failures.
 */
export async function bulkMarkFinancialSakti(ids:string[]):Promise<SaktiBatchReport> {
 if(ids.length<1||ids.length>100 || new Set(ids).size!==ids.length)
   throw new Error("Pilih 1 sampai 100 transaksi tanpa duplikasi");
 try {
   await financeRpc("sip_bp_mark_sakti",{p_ids:ids});
   return {succeeded:[...ids],failed:[]};
 } catch(err) {
   // Retrying an ambiguous network/server failure can re-submit a successful
   // request after the response was lost. Only confirmed client/business
   // rejections are eligible for per-item fallback.
   if(!(err instanceof SipBpHttpError) || ![400,403,404,409,422].includes(err.status))
     throw err;
   const succeeded:string[]=[];
   const failed:SaktiBatchReport["failed"]=[];
   for(const id of ids) {
     try {
       await financeRpc("sip_bp_mark_sakti",{p_ids:[id]});
       succeeded.push(id);
     }catch(err) {
       failed.push({id,message:err instanceof Error?err.message:"Ditolak server"});
     }
   }
   return {succeeded,failed};
 }
}
export async function unlockFinancialSakti(id:string,reason:string) {
 return financeRpc("sip_bp_unlock_sakti",{p_id:id,p_reason:reason});
}
