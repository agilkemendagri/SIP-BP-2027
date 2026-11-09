import React,{useState} from "react";
import {sipBpEnvironmentLabel,isProductionEnvironment} from "../lib/sipBpEnvironment";
import type { SipProfile } from "../lib/sipBpAuth";
import {AppProvider,useApp} from "../context/AppContext";
import {Sidebar} from "./layout/Sidebar";
import {Navbar} from "./layout/Navbar";
import {DashboardView} from "./dashboard/DashboardView";
import {DaftarTransaksiView} from "./transaksi/DaftarTransaksiView";
import {KuitansiProfesiForm} from "./kuitansi/KuitansiProfesiForm";
import {KuitansiPerjadinLuarKotaForm} from "./kuitansi/KuitansiPerjadinLuarKotaForm";
import {KuitansiPerjadinDalamKotaForm} from "./kuitansi/KuitansiPerjadinDalamKotaForm";
import {SptbView} from "./sptb/SptbView";
import {RekapView} from "./rekap/RekapView";
import {PenggunaView} from "./pengguna/PenggunaView";
import {KuitansiPrintModal} from "./modals/KuitansiPrintModal";
import {SptbPrintModal} from "./modals/SptbPrintModal";
import {BulkSaktiModal} from "./modals/BulkSaktiModal";
import {PilihJenisKuitansiModal} from "./modals/PilihJenisKuitansiModal";
import {ToastContainer} from "./common/ToastContainer";
import {RefreshCcw,AlertTriangle} from "lucide-react";

function Content(){
 const {activeView,dataError,loadingTransaksi,refreshTransaksi}=useApp();
 const [mobileMenuOpen,setMobileMenuOpen]=useState(false);
 return <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col antialiased">
  <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen}/>
  <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
   <Navbar onToggleMobileMenu={()=>setMobileMenuOpen(v=>!v)}/>
   <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
    <div className="flex justify-between items-center mb-3 text-xs text-slate-600">
      <span>SIP-BP {sipBpEnvironmentLabel} · Data tersimpan di Supabase · Nomor SPTB dibuat server</span>
      <button onClick={()=>refreshTransaksi().catch(()=>{})} className="flex items-center gap-1 text-blue-700" disabled={loadingTransaksi}>
        <RefreshCcw size={14}/>{loadingTransaksi?"Memuat data...":"Muat ulang"}
      </button>
    </div>
    {dataError&&<div role="alert" className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-800 text-sm mb-4 flex gap-2"><AlertTriangle size={16}/>{dataError}. Data yang tampil mungkin belum terbaru.</div>}
    {activeView==="dashboard"&&<DashboardView/>}
    {activeView==="kuitansi_profesi"&&<KuitansiProfesiForm/>}
    {activeView==="kuitansi_luar_kota"&&<KuitansiPerjadinLuarKotaForm/>}
    {activeView==="kuitansi_dalam_kota"&&<KuitansiPerjadinDalamKotaForm/>}
    {activeView==="sptb"&&<SptbView/>}
    {activeView==="transaksi"&&<DaftarTransaksiView/>}
    {activeView==="rekap"&&<RekapView/>}
    {activeView==="pengguna"&&<PenggunaView/>}
   </main>
   <footer className="text-xs text-slate-500 border-t border-slate-200 py-4 px-6 text-center">
    SIP-BP · BBPKA PDN IV · {isProductionEnvironment ? "Sistem Bendahara Pengeluaran" : "Lingkungan pengembangan · Bukan untuk data keuangan riil"}
   </footer>
  </div>
  <PilihJenisKuitansiModal/><KuitansiPrintModal/><SptbPrintModal/><BulkSaktiModal/><ToastContainer/>
 </div>;
}
export const SecureFinanceShell:React.FC<{profile:SipProfile;onProfileUpdated:(profile:SipProfile)=>void}>=({profile,onProfileUpdated})=><AppProvider authenticatedProfile={profile} onProfileUpdated={onProfileUpdated}><Content/></AppProvider>;
