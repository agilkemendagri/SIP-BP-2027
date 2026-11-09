import React,{createContext,useContext,useState,useEffect,useMemo,useCallback,ReactNode} from "react";
import type { Role,Transaksi,UserSimulasi,SumberDana } from "../types";
import type { SipProfile } from "../lib/sipBpAuth";
import {listProfiles} from "../lib/sipBpAuth";
import {
 fetchFinancialTransactions,saveFinancialTransaction,changeFinancialStatus,
 deleteFinancialTransaction,bulkMarkFinancialSakti,unlockFinancialSakti,type SaktiBatchReport
} from "../lib/sipBpFinance";

export type ActiveView="dashboard"|"kuitansi_profesi"|"kuitansi_luar_kota"|"kuitansi_dalam_kota"|"sptb"|"transaksi"|"rekap"|"pengguna";
export interface ToastMessage {id:string;message:string;type:"success"|"warning"|"error"|"info"}
interface AppContextType {
 activeView:ActiveView;
 setActiveView:(view:ActiveView)=>void;
 currentRole:Role;
 setCurrentRole:(role:Role)=>void;
 currentUser:UserSimulasi;
 allTransaksi:Transaksi[];
 visibleTransaksi:Transaksi[];
 penggunaList:UserSimulasi[];
 loadingTransaksi:boolean;
 dataError:string;
 refreshTransaksi:()=>Promise<Transaksi[]>;
 filterTahun:string;setFilterTahun:(v:string)=>void;
 filterBulan:string;setFilterBulan:(v:string)=>void;
 addTransaksi:(data:Omit<Transaksi,"id"|"createdAt"|"updatedAt">)=>Promise<Transaksi>;
 updateTransaksi:(id:string,updates:Partial<Transaksi>)=>Promise<void>;
 deleteTransaksi:(id:string)=>Promise<boolean>;
 markSaktiBulk:(ids:string[])=>Promise<void>;
 saktiBatchReport:SaktiBatchReport|null;
 toggleSaktiSingle:(id:string)=>Promise<void>;
 finalizeTransaksi:(id:string)=>Promise<void>;
 returnToDraft:(id:string)=>Promise<void>;
 addUser:(user:Omit<UserSimulasi,"id">)=>void;
 updateUser:(id:string,updates:Partial<UserSimulasi>)=>void;
 resetToDefaultData:()=>void;
 previewKuitansi:Transaksi|null;setPreviewKuitansi:(x:Transaksi|null)=>void;
 previewSptb:Transaksi|null;setPreviewSptb:(x:Transaksi|null)=>void;
 editingTransaksi:Transaksi|null;setEditingTransaksi:(x:Transaksi|null)=>void;
 isCreateKuitansiModalOpen:boolean;setIsCreateKuitansiModalOpen:(v:boolean)=>void;
 startNewKuitansi:(v:"kuitansi_profesi"|"kuitansi_luar_kota"|"kuitansi_dalam_kota")=>void;
 generateNextTransactionNumbers:(source:SumberDana,date?:string)=>{nomorSPTB:string;nomorKuitansi:string};
 selectedForSaktiIds:string[];setSelectedForSaktiIds:React.Dispatch<React.SetStateAction<string[]>>;
 isBulkSaktiModalOpen:boolean;setIsBulkSaktiModalOpen:(v:boolean)=>void;
 toasts:ToastMessage[];showToast:(msg:string,type?:ToastMessage["type"])=>void;
 removeToast:(id:string)=>void;
}
const C=createContext<AppContextType|undefined>(undefined);
const userFromProfile=(p:SipProfile):UserSimulasi=>({
 id:p.user_id,nama:p.nama_lengkap,nip:p.nip||"",jabatan:p.jabatan,
 peran:p.role,sumberDanaAkses:p.role==="bendahara"?"SEMUA":p.role==="bpp_rm"?"RM":"PNBP",
 statusAktif:p.aktif,email:p.email_kontak||""
});
export const AppProvider:React.FC<{children:ReactNode;authenticatedProfile:SipProfile}>=({children,authenticatedProfile})=>{
 const [activeView,setActiveView]=useState<ActiveView>("dashboard");
 const [allTransaksi,setAllTransaksi]=useState<Transaksi[]>([]);
 const [penggunaList,setPenggunaList]=useState<UserSimulasi[]>([userFromProfile(authenticatedProfile)]);
 const [loadingTransaksi,setLoadingTransaksi]=useState(true);
 const [dataError,setDataError]=useState("");
 const currentRole=authenticatedProfile.role;
 const currentUser=useMemo(()=>userFromProfile(authenticatedProfile),[authenticatedProfile]);
 const [filterTahun,setFilterTahun]=useState(String(new Date().getFullYear()));
 const [filterBulan,setFilterBulan]=useState("SEMUA");
 const [previewKuitansi,setPreviewKuitansi]=useState<Transaksi|null>(null);
 const [previewSptb,setPreviewSptb]=useState<Transaksi|null>(null);
 const [editingTransaksi,setEditingTransaksi]=useState<Transaksi|null>(null);
 const [isCreateKuitansiModalOpen,setIsCreateKuitansiModalOpen]=useState(false);
 const [selectedForSaktiIds,setSelectedForSaktiIds]=useState<string[]>([]);
 const [isBulkSaktiModalOpen,setIsBulkSaktiModalOpen]=useState(false);
 const [saktiBatchReport,setSaktiBatchReport]=useState<SaktiBatchReport|null>(null);
 const [toasts,setToasts]=useState<ToastMessage[]>([]);
 const showToast=useCallback((message:string,type:ToastMessage["type"]="info")=>{
   const id=crypto.randomUUID();
   setToasts(prev=>[...prev,{id,message,type}]);
   window.setTimeout(()=>setToasts(prev=>prev.filter(t=>t.id!==id)),5500);
 },[]);
 const removeToast=(id:string)=>setToasts(prev=>prev.filter(t=>t.id!==id));
 const refreshTransaksi=useCallback(async()=>{
   setLoadingTransaksi(true);
   try {
     const rows=await fetchFinancialTransactions();
     setAllTransaksi(rows);setDataError("");
     return rows;
   }catch(e) {
     setDataError(e instanceof Error?e.message:"Gagal memuat data");
     throw e;
   }finally{setLoadingTransaksi(false);}
 },[]);
 useEffect(()=>{refreshTransaksi().catch(()=>{});},[refreshTransaksi]);
 useEffect(()=>{
   if(currentRole==="bendahara") {
     listProfiles().then(p=>setPenggunaList(p.map(userFromProfile))).catch(()=>{});
   }
 },[currentRole]);
 const visibleTransaksi=useMemo(()=>allTransaksi.filter(t=>
    currentRole==="bendahara"||(currentRole==="bpp_rm"&&t.sumberDana==="RM")||
    (currentRole==="bpp_pnbp"&&t.sumberDana==="PNBP")
 ),[allTransaksi,currentRole]);
 const setCurrentRole=(role:Role)=>{
   if(role!==currentRole)showToast("Peran mengikuti identitas login. Tidak bisa diganti tanpa login akun lain.","warning");
 };
 const startNewKuitansi=(type:"kuitansi_profesi"|"kuitansi_luar_kota"|"kuitansi_dalam_kota")=>{
   setEditingTransaksi(null);setActiveView(type);setIsCreateKuitansiModalOpen(false);
 };
 const generateNextTransactionNumbers=(source:SumberDana,date?:string)=>{
   const month=(date||new Date().toISOString().slice(0,10)).split("-")[1];
   const nomorSPTB="SPTB/"+source+"/BBPKAIV/"+Number(month)+"/(otomatis saat simpan)";
   return {nomorSPTB,nomorKuitansi:nomorSPTB};
 };
 const run=async <T,>(task:()=>Promise<T>,success:string)=>{
   try {const result=await task();showToast(success,"success");return result;}
   catch(e){const message=e instanceof Error?e.message:"Operasi tidak berhasil";showToast(message,"error");throw e;}
 };
 const addTransaksi=async(data:Omit<Transaksi,"id"|"createdAt"|"updatedAt">):Promise<Transaksi>=>{
   return run(async()=>{
     const id=await saveFinancialTransaction(data);
     const fresh=await refreshTransaksi();
     const row=fresh.find(t=>t.id===id);
     if(!row) throw new Error("Transaksi tersimpan, tetapi belum muncul di daftar. Muat ulang untuk memastikan.");
     return row;
   },"Transaksi berhasil disimpan di Supabase");
 };
 const updateTransaksi=async(id:string,updates:Partial<Transaksi>)=>{
   await run(async()=>{
      const prev=allTransaksi.find(x=>x.id===id);
      if(!prev)throw new Error("Transaksi tidak ditemukan");
      await saveFinancialTransaction({...prev,...updates},id);
      await refreshTransaksi();
   },"Perubahan transaksi tersimpan di Supabase");
 };
 const deleteTransaksi=async(id:string):Promise<boolean>=>{
   return run(async()=>{await deleteFinancialTransaction(id);await refreshTransaksi();return true;},"Draft transaksi dihapus");
 };
 const finalizeTransaksi=async(id:string)=>{
   await run(async()=>{await changeFinancialStatus(id,"Final");await refreshTransaksi();},"SPTB berstatus Final");
 };
 const returnToDraft=async(id:string)=>{
   await run(async()=>{await changeFinancialStatus(id,"Draft");await refreshTransaksi();},"SPTB dikembalikan ke Draft");
 };
 const markSaktiBulk=async(ids:string[])=>{
   setSaktiBatchReport(null);
   try {
     const report=await bulkMarkFinancialSakti(ids);
     setSaktiBatchReport(report);
     await refreshTransaksi();
     setSelectedForSaktiIds(report.failed.map(item=>item.id));
     if(report.failed.length) {
       setIsBulkSaktiModalOpen(true);
       showToast(report.succeeded.length+" berhasil; "+report.failed.length+" gagal. Periksa daftar hasil.","warning");
     }else {
       setIsBulkSaktiModalOpen(false);
       showToast(report.succeeded.length+" SPTB berhasil ditandai di SAKTI.","success");
     }
   }catch(err) {
     showToast(err instanceof Error?err.message:"Penandaan SAKTI gagal","error");
     throw err;
   }
 };
 const toggleSaktiSingle=async(id:string)=>{
   const t=allTransaksi.find(x=>x.id===id);
   if(!t)throw new Error("Transaksi tidak ditemukan");
   if(t.sudahSakti) {
     const reason=window.prompt("Masukkan alasan pembukaan kunci SAKTI (minimal 10 karakter):");
     if(!reason)return;
     if(reason.trim().length<10){showToast("Alasan wajib minimal 10 karakter.","warning");return;}
     if(!window.confirm("Buka kunci SAKTI "+t.nomorSPTB+"? Hanya lakukan jika penandaan keliru dan bukti belum dipakai di SAKTI. Alasan akan dicatat pada audit log."))return;
     await run(async()=>{await unlockFinancialSakti(id,reason.trim());await refreshTransaksi();},
       "Kunci SAKTI dibuka. Alasan dicatat di audit log");
   }else await markSaktiBulk([id]);
 };
 const addUser=()=>showToast("Kelola akun melalui menu Pengguna","info");
 const updateUser=()=>showToast("Kelola akun melalui menu Pengguna","info");
 const resetToDefaultData=()=>showToast("Reset data simulasi dinonaktifkan untuk database Supabase","warning");
 return <C.Provider value={{
   activeView,setActiveView,currentRole,setCurrentRole,currentUser,allTransaksi,visibleTransaksi,
   penggunaList,loadingTransaksi,dataError,refreshTransaksi,filterTahun,setFilterTahun,filterBulan,setFilterBulan,
   addTransaksi,updateTransaksi,deleteTransaksi,markSaktiBulk,toggleSaktiSingle,finalizeTransaksi,returnToDraft,
   addUser,updateUser,resetToDefaultData,previewKuitansi,setPreviewKuitansi,previewSptb,setPreviewSptb,
   editingTransaksi,setEditingTransaksi,isCreateKuitansiModalOpen,setIsCreateKuitansiModalOpen,
   startNewKuitansi,generateNextTransactionNumbers,selectedForSaktiIds,setSelectedForSaktiIds,
   isBulkSaktiModalOpen,setIsBulkSaktiModalOpen,saktiBatchReport,toasts,showToast,removeToast
 }}>{children}</C.Provider>;
};
export function useApp():AppContextType{
 const v=useContext(C);if(!v)throw new Error("AppProvider is missing");return v;
}
