import React,{useEffect,useState} from 'react';
import {useApp} from '../../context/AppContext';
import {usePejabatSettings} from '../../context/PejabatSettingsContext';
import type {PejabatSettings} from '../../lib/sipBpPejabatSettings';
import {ShieldCheck,Save,RefreshCcw} from 'lucide-react';
const fields:[keyof PejabatSettings,string][]=[['kota','Kota Dokumen'],['satkerPanjang','Nama Satker Lengkap'],['satkerPendek','Nama Satker Singkat'],['ppkNama','Nama PPK'],['ppkNip','NIP PPK'],['bppRmNama','Nama BPP RM'],['bppRmNip','NIP BPP RM'],['bppPnbpNama','Nama BPP PNBP'],['bppPnbpNip','NIP BPP PNBP']];
export const PejabatSettingsView:React.FC=()=>{
 const {currentRole}=useApp();const {value,ready,loading,error,reload,save}=usePejabatSettings();
 const [draft,setDraft]=useState<PejabatSettings>(value);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [saveError,setSaveError]=useState('');
 useEffect(()=>setDraft(value),[value]);if(currentRole!=='bendahara')return null;
 const submit=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setMessage('');setSaveError('');try{await save(draft);setMessage('Data pejabat tersimpan untuk semua modul kuitansi.');}catch(e){setSaveError(e instanceof Error?e.message:'Gagal menyimpan');}finally{setBusy(false);}};
 return <section className="bg-white rounded-xl border border-blue-200 p-5 space-y-4">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold flex items-center gap-2"><ShieldCheck size={20}/>Konfigurasi Pejabat Penandatangan</h2><p className="text-xs text-slate-600">Konfigurasi bersama semua jenis kuitansi. Hanya Bendahara dapat memperbarui.</p></div><button type="button" onClick={()=>reload().catch(()=>{})} className="text-sm text-blue-700 flex gap-1"><RefreshCcw size={15}/>Muat ulang</button></div>
  {(error||saveError)&&<p role="alert" className="bg-red-50 border p-3 text-sm text-red-800">{saveError||error}</p>}
  {message&&<p role="status" className="bg-green-50 border p-3 text-sm text-green-800">{message}</p>}
  <form onSubmit={submit} className="space-y-3"><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{fields.map(([k,label])=><label key={k} className="text-xs font-semibold">{label}<input className="mt-1 w-full rounded border p-2 text-sm" maxLength={160} disabled={loading||!ready||busy} value={String(draft[k])} onChange={e=>setDraft(v=>({...v,[k]:e.target.value}))}/></label>)}</div>
  <button disabled={!ready||loading||busy} className="bg-blue-700 text-white rounded px-4 py-2 text-sm font-semibold flex items-center gap-2 disabled:opacity-50"><Save size={15}/>{busy?'Menyimpan...':'Simpan untuk Semua Modul'}</button></form>
 </section>;
};