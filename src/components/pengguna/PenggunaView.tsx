import React,{useEffect,useState} from "react";
import {Users,UserPlus,RefreshCcw,Copy,Shield,Eye,EyeOff} from "lucide-react";
import {listProfiles,adminAccount,type SipProfile} from "../../lib/sipBpAuth";
import {useApp} from "../../context/AppContext";
const roleText:{[k:string]:string}={bendahara:"Bendahara",bpp_rm:"BPP RM",bpp_pnbp:"BPP PNBP"};
export const PenggunaView:React.FC=()=>{
 const {currentRole}=useApp();
 const [users,setUsers]=useState<SipProfile[]>([]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [secret,setSecret]=useState("");
 const [showSecret,setShowSecret]=useState(false);
 const [reason,setReason]=useState("");
 const [form,setForm]=useState({username:"",nama_lengkap:"",nip:"",jabatan:"",role:"bpp_rm"});
 const reload=async()=>{const p=await listProfiles();setUsers(p);};
 useEffect(()=>{if(currentRole==="bendahara")reload().catch(e=>setError(e.message));},[currentRole]);
 if(currentRole!=="bendahara")return <div role="alert" className="p-6 border rounded-xl">Akses pengelolaan akun hanya untuk Bendahara Pengeluaran.</div>;
 const action=async(name:string,fields:Record<string,unknown>):Promise<boolean>=>{
   setBusy(true);setError("");setMessage("");setSecret("");
   try {
    const out=await adminAccount(name,fields);
    if(out.temporary_password){setSecret(out.temporary_password);setShowSecret(false);}
    setMessage("Perubahan akun berhasil disimpan.");await reload();return true;
   }catch(e){setError(e instanceof Error?e.message:"Perubahan tidak berhasil");return false;}
   finally{setBusy(false);}
 };
 const create=async(e:React.FormEvent)=>{
   e.preventDefault();const ok=await action("create_bpp",form);
   if(ok)setForm({username:"",nama_lengkap:"",nip:"",jabatan:"",role:"bpp_rm"});
 };
 return <div className="space-y-5">
  <div className="bg-white rounded-xl border p-5 flex flex-wrap justify-between items-center gap-2">
   <div><h2 className="text-lg font-bold flex items-center gap-2"><Users size={20}/>Manajemen Akun BPP</h2>
    <p className="text-xs text-slate-500 mt-1">Akun login asli Supabase Auth · hanya Bendahara Pengeluaran</p>
   </div><button onClick={()=>reload().catch(e=>setError(e.message))} className="flex items-center gap-2 text-blue-700 text-sm"><RefreshCcw size={16}/>Muat ulang</button>
  </div>
  {error&&<div className="bg-red-50 text-red-800 border border-red-200 rounded-lg p-3 text-sm" role="alert">{error}</div>}
  {message&&<div className="bg-green-50 text-green-800 border border-green-200 rounded-lg p-3 text-sm" role="status">{message}</div>}
  {secret&&<div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
   <strong>Password sementara — hanya ditampilkan sekali</strong>
   <div className="flex flex-wrap gap-3 items-center mt-2 font-mono">
    <span>{showSecret?secret:"••••••••••••••••••••••••"}</span>
    <button aria-label="Tampilkan password" onClick={()=>setShowSecret(v=>!v)}>{showSecret?<EyeOff size={18}/>:<Eye size={18}/>}</button>
    <button aria-label="Salin password" onClick={()=>navigator.clipboard?.writeText(secret)}><Copy size={18}/></button>
   </div>
   <p className="text-xs text-amber-900 mt-2">Bagikan langsung melalui saluran yang aman; BPP wajib mengubah saat pertama login.</p>
   <button onClick={()=>setSecret("")} className="text-xs underline mt-2">Hapus dari tampilan</button>
  </div>}
  <form onSubmit={create} className="bg-white border rounded-xl p-5 space-y-3">
   <h3 className="font-bold flex gap-2 items-center"><UserPlus size={18}/>Tambah Akun BPP</h3>
   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <label className="text-xs font-medium">Username
     <input required pattern="[a-z][a-z0-9._-]{2,31}" value={form.username} onChange={e=>setForm(v=>({...v,username:e.target.value.toLowerCase()}))} className="block w-full border rounded-lg p-2 mt-1" placeholder="Contoh: bppbaru"/>
    </label>
    <label className="text-xs font-medium">Nama lengkap
     <input required value={form.nama_lengkap} onChange={e=>setForm(v=>({...v,nama_lengkap:e.target.value}))} className="block w-full border rounded-lg p-2 mt-1"/>
    </label>
    <label className="text-xs font-medium">NIP
     <input value={form.nip} onChange={e=>setForm(v=>({...v,nip:e.target.value}))} className="block w-full border rounded-lg p-2 mt-1"/>
    </label>
    <label className="text-xs font-medium">Jabatan
     <input value={form.jabatan} onChange={e=>setForm(v=>({...v,jabatan:e.target.value}))} className="block w-full border rounded-lg p-2 mt-1"/>
    </label>
    <label className="text-xs font-medium">Peran
     <select value={form.role} onChange={e=>setForm(v=>({...v,role:e.target.value}))} className="block w-full border rounded-lg p-2 mt-1">
      <option value="bpp_rm">BPP RM</option><option value="bpp_pnbp">BPP PNBP</option>
     </select>
    </label>
   </div>
   <button disabled={busy} className="bg-blue-700 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50">Buat akun BPP</button>
  </form>
  <section className="bg-white border rounded-xl p-5">
   <h3 className="font-semibold mb-3">Akun terdaftar</h3>
   <div className="overflow-x-auto"><table className="w-full text-xs text-left">
    <thead><tr className="bg-slate-100"><th className="p-2">Username / Nama</th><th className="p-2">Peran</th><th className="p-2">Status</th><th className="p-2">Aksi</th></tr></thead>
    <tbody>{users.map(u=><tr key={u.user_id} className="border-b">
     <td className="p-2"><strong>@{u.username}</strong><div>{u.nama_lengkap}</div></td>
     <td className="p-2">{roleText[u.role]}</td>
     <td className="p-2">{u.aktif?"Aktif":"Nonaktif"}{u.wajib_ganti_password?" · Ganti password":""}</td>
     <td className="p-2">
      {u.role==="bendahara"?<span className="flex gap-1 text-slate-500"><Shield size={12}/>Pengelola utama</span>:
      <div className="flex flex-wrap gap-3 text-blue-700">
       <button disabled={busy} className="underline" onClick={()=>action("update_bpp",{user_id:u.user_id,aktif:!u.aktif})}>{u.aktif?"Nonaktifkan":"Aktifkan"}</button>
       <button disabled={busy} className="underline" onClick={()=>action("update_bpp",{user_id:u.user_id,role:u.role==="bpp_rm"?"bpp_pnbp":"bpp_rm"})}>Ubah peran</button>
       <button disabled={busy} className="underline" onClick={()=>{
         if(reason.trim().length<8){setError("Tuliskan alasan reset password (minimal 8 karakter).");return;}
         if(window.confirm("Reset password @"+u.username+"?"))action("reset_bpp_password",{user_id:u.user_id,reason:reason.trim()});
       }}>Reset password</button>
      </div>}
     </td>
    </tr>)}</tbody>
   </table></div>
   <label className="block text-xs mt-4 font-medium">Alasan reset password
    <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Contoh: Permintaan resmi pegawai" className="block w-full border rounded-lg p-2 mt-1"/>
   </label>
  </section>
 </div>;
};
