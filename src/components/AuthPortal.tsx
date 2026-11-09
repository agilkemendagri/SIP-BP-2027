import React, {useEffect,useState} from "react";
import { LockKeyhole, ShieldCheck, LogOut, UserPlus, RefreshCcw, Database, Copy, Eye, EyeOff } from "lucide-react";
import {
  SipProfile, ownProfile, signInUsername, signOut, changeOwnPassword,
  listProfiles, adminAccount
} from "../lib/sipBpAuth";

const errText = (e:unknown) => e instanceof Error ? e.message : "Proses tidak berhasil";
const roleLabel:Record<string,string> = {
  bendahara:"Bendahara Pengeluaran",bpp_rm:"BPP Rupiah Murni",bpp_pnbp:"BPP PNBP"
};

export const AuthPortal:React.FC=()=>{
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [profile,setProfile]=useState<SipProfile|null>(null);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const [username,setUsername]=useState("");
  const [password,setPassword]=useState("");
  const [oldPassword,setOldPassword]=useState("");
  const [newPassword,setNewPassword]=useState("");
  const [users,setUsers]=useState<SipProfile[]>([]);
  const [form,setForm]=useState({username:"",nama_lengkap:"",nip:"",jabatan:"",role:"bpp_rm"});
  const [resetReason,setResetReason]=useState("");
  const [secret,setSecret]=useState("");
  const [showSecret,setShowSecret]=useState(false);

  useEffect(()=>{
    let active=true;
    ownProfile().then(p=>{if(active)setProfile(p && p.aktif ? p : null);})
      .catch(()=>{if(active)setProfile(null);})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[]);
  const reloadUsers=async()=>setUsers(await listProfiles());
  useEffect(()=>{
    if(profile?.role==="bendahara" && !profile.wajib_ganti_password) {
      reloadUsers().catch(e=>setError(errText(e)));
    }
  },[profile?.user_id,profile?.role,profile?.wajib_ganti_password]);
  const login=async(e:React.FormEvent)=>{
    e.preventDefault();setError("");setMessage("");setBusy(true);
    try{
      const p=await signInUsername(username,password);
      setProfile(p);setPassword("");setUsername("");
    }catch(e){setError("Username atau password tidak sesuai, atau akun belum aktif.");}
    finally{setBusy(false);}
  };
  const logout=async()=>{await signOut();setProfile(null);setUsers([]);setSecret("");setError("");setMessage("");};
  const change=async(e:React.FormEvent)=>{
    e.preventDefault();setBusy(true);setError("");
    try{
      await changeOwnPassword(oldPassword,newPassword);
      setOldPassword("");setNewPassword("");
      setMessage("Password telah diperbarui. Silakan masuk kembali menggunakan password baru.");
      setProfile(null);
    }catch(e){setError(errText(e));}
    finally{setBusy(false);}
  };
  const action=async(op:string,fields:Record<string,unknown>)=>{
    setBusy(true);setError("");setMessage("");setSecret("");
    try{
      const result=await adminAccount(op,fields);
      if(result.temporary_password) {setSecret(result.temporary_password);setShowSecret(false);}
      setMessage("Perubahan akun BPP berhasil diproses.");
      await reloadUsers();
    }catch(e){setError(errText(e));}
    finally{setBusy(false);}
  };
  const create=async(e:React.FormEvent)=>{
    e.preventDefault();
    await action("create_bpp",form);
    setForm({username:"",nama_lengkap:"",nip:"",jabatan:"",role:"bpp_rm"});
  };

  return <div className="min-h-screen bg-slate-100 text-slate-900">
    <header className="bg-slate-950 text-white px-5 py-4 flex items-center justify-between">
      <div><div className="font-bold text-lg">SIP-BP <span className="text-blue-300">DEV</span></div>
      <div className="text-xs text-slate-300">Sistem Informasi Pencatatan Bendahara Pengeluaran</div></div>
      {profile&&<button className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm" onClick={logout}><LogOut size={16}/>Keluar</button>}
    </header>
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 text-sm mb-6">
        Lingkungan pengembangan Supabase. Modul transaksi keuangan lama masih simulasi dan belum dihubungkan ke database.
        Jangan masukkan data keuangan asli. Versi produksi tidak berubah.
      </div>
      {error&&<p role="alert" className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg mb-4">{error}</p>}
      {message&&<p role="status" className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-lg mb-4">{message}</p>}
      {loading?<p>Memeriksa sesi masuk...</p>:!profile?
      <div className="max-w-md mx-auto bg-white border rounded-2xl shadow-sm p-7">
        <div className="flex items-center gap-2 mb-4"><LockKeyhole size={22}/><h1 className="font-bold text-lg">Masuk SIP-BP</h1></div>
        <form onSubmit={login} className="space-y-4">
          <label className="block text-sm font-medium">Username
            <input autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} required maxLength={32}
              className="mt-1 block w-full rounded-lg border px-3 py-2" placeholder="username akun SIP-BP"/>
          </label>
          <label className="block text-sm font-medium">Password
            <input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}
              required className="mt-1 block w-full rounded-lg border px-3 py-2"/>
          </label>
          <button disabled={busy} className="w-full bg-blue-700 text-white py-2.5 rounded-lg font-semibold disabled:opacity-50">{busy?"Memeriksa...":"Masuk"}</button>
        </form>
        <p className="text-xs text-slate-500 mt-4">Akun diterbitkan oleh Bendahara. Pemulihan akun Bendahara melalui petugas teknis terverifikasi.</p>
      </div>:
      <div className="space-y-6">
        <section className="bg-white border rounded-2xl p-5 flex flex-col sm:flex-row gap-4 justify-between">
          <div><h1 className="text-lg font-bold">{profile.nama_lengkap}</h1>
            <p className="text-sm text-slate-600">{roleLabel[profile.role]} · @{profile.username}</p>
            <p className="text-xs text-slate-500">Akses: {profile.role==="bendahara"?"RM & PNBP":profile.role==="bpp_rm"?"RM":"PNBP"}</p>
          </div><div className="flex items-center gap-2 text-green-700 text-sm"><ShieldCheck size={18}/>Identitas diverifikasi oleh Supabase Auth</div>
        </section>
        {profile.wajib_ganti_password?
          <section className="bg-white border border-amber-300 rounded-2xl p-6 max-w-lg">
            <h2 className="font-bold text-lg mb-2">Wajib mengganti password</h2>
            <p className="text-sm text-slate-600 mb-4">Sebelum menggunakan SIP-BP, ganti password sementara. Hak akses transaksi tetap terkunci sampai perubahan berhasil.</p>
            <form className="space-y-3" onSubmit={change}>
              <label className="block text-sm">Password saat ini<input type="password" autoComplete="current-password" required value={oldPassword} onChange={e=>setOldPassword(e.target.value)} className="block w-full border rounded-lg px-3 py-2 mt-1"/></label>
              <label className="block text-sm">Password baru<input type="password" autoComplete="new-password" required minLength={12} value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="block w-full border rounded-lg px-3 py-2 mt-1"/></label>
              <p className="text-xs text-slate-500">Minimal 12 karakter dengan huruf besar, huruf kecil, angka, dan simbol.</p>
              <button disabled={busy} className="bg-blue-700 text-white rounded-lg px-4 py-2 disabled:opacity-50">{busy?"Memproses...":"Ganti Password"}</button>
            </form>
          </section>:
          <>
          <section className="bg-white border rounded-2xl p-6">
            <div className="flex items-center gap-2"><Database size={20}/><h2 className="font-bold">Fondasi autentikasi aktif</h2></div>
            <p className="mt-2 text-sm text-slate-600">Role ini berasal dari database dan tidak dapat dipilih atau diganti dari browser. Akses data RM/PNBP dikendalikan oleh kebijakan RLS. Integrasi daftar transaksi dan kuitansi ke database dilanjutkan pada Tahap 1D.</p>
          </section>
          {profile.role==="bendahara"&&<section className="bg-white border rounded-2xl p-6 space-y-5">
            <div className="flex gap-2 items-center"><UserPlus size={20}/><h2 className="font-bold text-lg">Manajemen akun BPP</h2></div>
            {secret&&<div className="border border-amber-300 bg-amber-50 rounded-xl p-3">
              <div className="font-semibold text-amber-900">Password sementara (hanya ditampilkan sekali)</div>
              <div className="flex gap-2 items-center mt-2">
                <code className="font-mono text-sm break-all">{showSecret?secret:"••••••••••••••••••••••••"}</code>
                <button type="button" aria-label="Tampilkan password sementara" onClick={()=>setShowSecret(v=>!v)}>{showSecret?<EyeOff size={18}/>:<Eye size={18}/>}</button>
                <button type="button" aria-label="Salin password sementara" onClick={()=>navigator.clipboard?.writeText(secret)}><Copy size={18}/></button>
              </div>
              <p className="text-xs text-amber-800 mt-1">Serahkan langsung kepada BPP melalui jalur aman. Password tidak disimpan di tabel profil.</p>
              <button className="text-sm underline mt-2" onClick={()=>setSecret("")}>Sembunyikan & hapus dari tampilan</button>
            </div>}
            <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={create}>
              <label className="text-sm">Username<input required pattern="[a-z][a-z0-9._-]{2,31}" value={form.username} onChange={e=>setForm(v=>({...v,username:e.target.value.toLowerCase()}))} className="w-full block border rounded-lg p-2 mt-1"/></label>
              <label className="text-sm">Nama lengkap<input required value={form.nama_lengkap} onChange={e=>setForm(v=>({...v,nama_lengkap:e.target.value}))} className="w-full block border rounded-lg p-2 mt-1"/></label>
              <label className="text-sm">NIP<input value={form.nip} onChange={e=>setForm(v=>({...v,nip:e.target.value}))} className="w-full block border rounded-lg p-2 mt-1"/></label>
              <label className="text-sm">Jabatan<input value={form.jabatan} onChange={e=>setForm(v=>({...v,jabatan:e.target.value}))} className="w-full block border rounded-lg p-2 mt-1"/></label>
              <label className="text-sm">Peran<select value={form.role} onChange={e=>setForm(v=>({...v,role:e.target.value}))} className="w-full block border rounded-lg p-2 mt-1"><option value="bpp_rm">BPP RM</option><option value="bpp_pnbp">BPP PNBP</option></select></label>
              <div className="flex items-end"><button disabled={busy} className="bg-blue-700 text-white rounded-lg px-5 py-2.5 disabled:opacity-50">Tambah BPP</button></div>
            </form>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="text-left border-b"><th className="p-2">Username / Nama</th><th className="p-2">Peran</th><th className="p-2">Status</th><th className="p-2">Aksi</th></tr></thead>
              <tbody>{users.map(u=><tr className="border-b" key={u.user_id}>
                <td className="p-2"><strong>@{u.username}</strong><br/>{u.nama_lengkap}</td>
                <td className="p-2">{roleLabel[u.role]}</td>
                <td className="p-2">{u.aktif?"Aktif":"Nonaktif"}{u.wajib_ganti_password?" · Ganti password":""}</td>
                <td className="p-2">{u.role!=="bendahara"&&<div className="flex flex-wrap gap-2">
                  <button disabled={busy} className="text-blue-700 underline" onClick={()=>action("update_bpp",{user_id:u.user_id,aktif:!u.aktif})}>{u.aktif?"Nonaktifkan":"Aktifkan"}</button>
                  <button disabled={busy} className="text-blue-700 underline" onClick={()=>action("update_bpp",{user_id:u.user_id,role:u.role==="bpp_rm"?"bpp_pnbp":"bpp_rm"})}>Ubah peran</button>
                  <button disabled={busy} className="text-blue-700 underline" onClick={()=>{
                    if(resetReason.trim().length<8){setError("Isi alasan reset minimal 8 karakter terlebih dahulu.");return;}
                    if(window.confirm("Reset password sementara untuk @"+u.username+"?")) action("reset_bpp_password",{user_id:u.user_id,reason:resetReason});
                  }}>Reset password</button>
                </div>}</td>
              </tr>)}</tbody></table></div>
            <label className="block text-sm">Alasan reset password BPP
              <input value={resetReason} onChange={e=>setResetReason(e.target.value)} placeholder="Contoh: BPP tidak dapat mengakses akun" className="w-full block border rounded-lg p-2 mt-1"/>
            </label>
            <button type="button" onClick={()=>reloadUsers().catch(e=>setError(errText(e)))} className="flex items-center gap-2 text-sm text-blue-700"><RefreshCcw size={16}/>Muat ulang akun</button>
          </section>}
          </>
        }
      </div>}
    </main>
  </div>;
};
