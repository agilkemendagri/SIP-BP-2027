import React,{useEffect,useState} from "react";
import {sipBpEnvironmentLabel,isProductionEnvironment} from "../lib/sipBpEnvironment";
import {LockKeyhole,ShieldCheck,LogOut} from "lucide-react";
import {type SipProfile,ownProfile,signInUsername,signOut,changeOwnPassword} from "../lib/sipBpAuth";
import {SecureFinanceShell} from "./SecureFinanceShell";
import {PrintStandaloneView} from "./kuitansi/PrintStandaloneView";

export const AuthPortal:React.FC=()=>{
 const [profile,setProfile]=useState<SipProfile|null>(null);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [username,setUsername]=useState("");
 const [password,setPassword]=useState("");
 const [oldPassword,setOldPassword]=useState("");
 const [newPassword,setNewPassword]=useState("");
 useEffect(()=>{
   let live=true;
   ownProfile().then(p=>{if(live&&p?.aktif)setProfile(p);})
    .catch(()=>{}).finally(()=>{if(live)setLoading(false);});
   return ()=>{live=false;};
 },[]);
 const login=async(e:React.FormEvent)=>{
  e.preventDefault();setBusy(true);setError("");setMessage("");
  try{const p=await signInUsername(username,password);setProfile(p);setPassword("");}
  catch{setError("Username atau password tidak sesuai, atau akun tidak aktif.");}
  finally{setBusy(false);}
 };
 const logout=async()=>{
  await signOut();setProfile(null);setUsername("");setPassword("");setOldPassword("");setNewPassword("");
 };
 const change=async(e:React.FormEvent)=>{
  e.preventDefault();setBusy(true);setError("");
  try{await changeOwnPassword(oldPassword,newPassword);
   setOldPassword("");setNewPassword("");setProfile(null);
   setMessage("Password berhasil diubah. Silakan login ulang.");
  }catch(e){setError(e instanceof Error?e.message:"Gagal mengubah password");}
  finally{setBusy(false);}
 };
 if(profile&&!profile.wajib_ganti_password) {
  if(new URLSearchParams(window.location.search).get("print")==="true")return <PrintStandaloneView/>;
  return <div>
   <div className="bg-slate-950 text-white px-4 py-2 text-xs flex items-center justify-between gap-3">
    <span><ShieldCheck size={13} className="inline mr-1"/>SIP-BP {sipBpEnvironmentLabel} · @{profile.username} · {profile.role==="bendahara"?"RM + PNBP":profile.role==="bpp_rm"?"RM":"PNBP"}</span>
    <button type="button" onClick={logout} className="flex gap-1 items-center bg-slate-800 px-3 py-1.5 rounded-lg"><LogOut size={14}/>Keluar</button>
   </div>
   <SecureFinanceShell profile={profile}/>
  </div>;
 }
 return <div className="min-h-screen bg-slate-100 text-slate-900">
  <header className="bg-slate-950 p-5 text-white">
   <h1 className="font-bold text-xl">SIP-BP <span className="text-blue-300">{isProductionEnvironment ? "" : "DEV"}</span></h1>
   <p className="text-xs text-slate-300">Sistem Informasi Pencatatan Bendahara Pengeluaran · BBPKA PDN IV</p>
  </header>
  <main className="max-w-md mx-auto p-4 pt-10">
   {!isProductionEnvironment && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 mb-5 text-sm text-amber-900">
    Lingkungan pengembangan. Jangan masukkan data keuangan resmi sebelum sistem dinyatakan siap.
   </div>}
   {error&&<p role="alert" className="rounded-lg border border-red-200 bg-red-50 text-red-800 p-3 mb-4">{error}</p>}
   {message&&<p role="status" className="rounded-lg border border-green-200 bg-green-50 text-green-800 p-3 mb-4">{message}</p>}
   {loading?<p>Memeriksa sesi...</p>:!profile?
   <section className="bg-white rounded-2xl border shadow-sm p-6">
    <h2 className="font-bold text-lg flex gap-2 items-center mb-5"><LockKeyhole size={22}/>Masuk SIP-BP</h2>
    <form onSubmit={login} className="space-y-4">
     <label className="block text-sm font-medium">Username atau email institusi
      <input required autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} maxLength={254}
       className="block w-full border rounded-lg p-2.5 mt-1" placeholder="Username BPP atau email Bendahara"/>
     </label>
     <label className="block text-sm font-medium">Password
      <input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}
       className="block w-full border rounded-lg p-2.5 mt-1"/>
     </label>
     <button disabled={busy} className="w-full bg-blue-700 disabled:opacity-50 text-white rounded-lg p-2.5 font-semibold">{busy?"Memeriksa...":"Masuk"}</button>
    </form>
   </section>:
   <section className="bg-white rounded-2xl border shadow-sm p-6">
    <h2 className="font-bold text-lg mb-2">Wajib Mengganti Password</h2>
    <p className="text-sm text-slate-600 mb-4">Halo @{profile.username}. Password sementara harus diganti sebelum membuka data keuangan.</p>
    <form onSubmit={change} className="space-y-3">
     <label className="block text-sm">Password saat ini<input required type="password" autoComplete="current-password" value={oldPassword} onChange={e=>setOldPassword(e.target.value)} className="block w-full rounded-lg border p-2.5 mt-1"/></label>
     <label className="block text-sm">Password baru<input required type="password" autoComplete="new-password" minLength={12} value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="block w-full rounded-lg border p-2.5 mt-1"/></label>
     <p className="text-xs text-slate-600">Minimal 12 karakter, huruf besar, kecil, angka dan simbol.</p>
     <button disabled={busy} className="bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50">Ubah Password</button>
     <button type="button" onClick={logout} className="ml-3 text-sm underline">Keluar</button>
    </form>
   </section>}
  </main>
 </div>;
};
