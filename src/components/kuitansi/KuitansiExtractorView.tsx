import React,{useEffect,useMemo,useRef,useState} from 'react';
import {FileScan,Upload,ShieldCheck,AlertTriangle,Plus,Trash2,RefreshCw,FileText} from 'lucide-react';
import {useApp} from '../../context/AppContext';
import {usePejabatSettings,signerForFunding} from '../../context/PejabatSettingsContext';
import {parseReceiptText,type ImportedRow} from '../../utils/receiptExtractor';
import {parseProfessionReceipt} from '../../utils/professionReceiptParser';
import {parseOutsideTravelReceipt,parseInsideTravelReceipt} from '../../utils/travelReceiptParser';
import type {ExtractedReceiptData} from './KuitansiWithExtractor';
import type {SumberDana,KuitansiType} from '../../types';

const money=(n:number)=>new Intl.NumberFormat('id-ID').format(n||0);
const freshRow=():ImportedRow=>({id:crypto.randomUUID(),nama:'',uraianItem:'',volume:1,satuan:'JP',tarifSatuan:0,bruto:0,ppnNominal:0,pphNominal:0,netto:0});
const fileTypes=['image/png','image/jpeg','image/webp','application/pdf'];
const maxBytes=12*1024*1024;

export const KuitansiExtractorView:React.FC<{fixedType?:KuitansiType;onApplyToForm?:(data:ExtractedReceiptData)=>void}>=({fixedType,onApplyToForm})=>{
 const {currentRole,addTransaksi,setActiveView,visibleTransaksi}=useApp();
 const {value:pejabat,ready:pejabatReady,error:pejabatError}=usePejabatSettings();
 const frame=useRef<HTMLIFrameElement>(null);
 const pending=useRef<{nonce:string;file:File}|null>(null);
 const ready=useRef(false);
 const [fileName,setFileName]=useState('');
 const [dragging,setDragging]=useState(false);
 const [isBusy,setIsBusy]=useState(false);
 const [status,setStatus]=useState('Siap menerima gambar/PDF. Proses OCR hanya berjalan setelah Anda memilih file.');
 const [error,setError]=useState('');
 const [text,setText]=useState('');
 const [warnings,setWarnings]=useState<string[]>([]);
 const [rows,setRows]=useState<ImportedRow[]>([]);
 const [date,setDate]=useState('');
 const [source,setSource]=useState<SumberDana>(currentRole==='bpp_pnbp'?'PNBP':'RM');
 const signer=signerForFunding(pejabat,source);
 const [type,setType]=useState<KuitansiType>(fixedType||'jasa_profesi');
 const [account,setAccount]=useState('');
 const [accountName,setAccountName]=useState('');
 const [activity,setActivity]=useState('');
 const [description,setDescription]=useState('');
 const [sourceNumber,setSourceNumber]=useState('');
 const [tanggalSppd,setTanggalSppd]=useState('');
 const [paidBefore,setPaidBefore]=useState<number|undefined>(undefined);
 const [balance,setBalance]=useState<number|undefined>(undefined);
 const [confirmed,setConfirmed]=useState(false);
 const [saving,setSaving]=useState(false);
 const [rawOpen,setRawOpen]=useState(false);
 const [isSptbDocument,setIsSptbDocument]=useState(false);
 const [imported,setImported]=useState(false);
 const [expectedTotals,setExpectedTotals]=useState<{bruto:number|null;netto:number|null}>({bruto:null,netto:null});
 const sum=useMemo(()=>rows.reduce((s,row)=>({
  bruto:s.bruto+Number(row.bruto||0),
  ppn:s.ppn+Number(row.ppnNominal||0),
  pph:s.pph+Number(row.pphNominal||0),
  netto:s.netto+Number(row.netto||0)
 }),{bruto:0,ppn:0,pph:0,netto:0}),[rows]);
 const applyText=(raw:string)=>{
  setText(raw);
  const sptb=/SURAT\s+PERNYATAAN\s+TANGGUNG\s+JAWAB\s+BELANJA/i.test(raw) || (/\bSPTB\s*\/\s*(?:RM|PNBP)\b/i.test(raw)&&/Kode\s+Satuan\s+Kerja/i.test(raw));
  setIsSptbDocument(sptb);
  if(sptb){
    setRows([]);setWarnings(['Dokumen ini adalah Surat Pernyataan Tanggung Jawab Belanja (SPTB), bukan kuitansi sumber. Rekap SPTB tidak boleh otomatis dijadikan transaksi kuitansi baru karena berisiko mencatat pembayaran ganda.','Gunakan kuitansi atau daftar tanda terima asli pada Ekstraktor Kuitansi; untuk SPTB gunakan menu SPTB.']);
    setDate('');setAccount('');setActivity('');setDescription('');setSourceNumber('');setExpectedTotals({bruto:null,netto:null});
    setConfirmed(false);setImported(true);setRawOpen(true);return;
  }
  const parsed=(fixedType==='jasa_profesi'?parseProfessionReceipt(raw):fixedType==='perjadin_luar_kota'?parseOutsideTravelReceipt(raw):fixedType==='perjadin_dalam_kota'?parseInsideTravelReceipt(raw):null)||parseReceiptText(raw);
  setRows(parsed.rows);
  setWarnings(parsed.warnings);
  setDate(parsed.tanggalKuitansi);
  setAccount(parsed.kodeAkun);
  setActivity(parsed.kegiatan||parsed.rows.map(r=>r.uraianItem).filter(Boolean).join('; '));
  setSourceNumber(parsed.nomorAsal);
  setTanggalSppd(parsed.tanggalSppd||'');
  setPaidBefore(parsed.telahDibayarSemula);
  setBalance(parsed.sisaKurangLebih);
  setExpectedTotals({bruto:parsed.totalBruto,netto:parsed.totalNetto});
  setDescription(parsed.rows[0]?.uraianItem||'');
  setConfirmed(false);
  setImported(true);
 };
 useEffect(()=>{
  const listener=(event:MessageEvent)=>{
   if(!frame.current||event.source!==frame.current.contentWindow||!event.data||event.data.source!=='sipbp-ocr')return;
   const msg=event.data;
   if(msg.type==='ready'){
    ready.current=true;
    const job=pending.current;
    if(job)send(job).catch(e=>{setError(String(e));setIsBusy(false);});
    return;
   }
   if(msg.nonce!==pending.current?.nonce)return;
   if(msg.type==='progress'){setStatus(String(msg.stage||'Memproses')+' · '+String(msg.value||0)+'%');return;}
   if(msg.type==='result'){
    applyText(String(msg.text||''));
    setIsBusy(false);
    setStatus('Selesai membaca '+String(msg.pages||1)+' halaman ('+String(msg.mode||'OCR')+'). Periksa semua hasil sebelum simpan.');
    if(msg.truncated)setWarnings(prev=>['PDF melebihi 5 halaman; hanya lima halaman pertama yang dibaca.',...prev]);
    pending.current=null;
   }
   if(msg.type==='error'){setError(String(msg.message||'Gagal membaca berkas'));setIsBusy(false);pending.current=null;}
  };
  window.addEventListener('message',listener);
  return ()=>window.removeEventListener('message',listener);
 },[]);
 const send=async(job:{nonce:string;file:File})=>{
  if(!frame.current?.contentWindow)return;
  const buffer=await job.file.arrayBuffer();
  frame.current.contentWindow.postMessage({type:'sipbp-ocr-file',nonce:job.nonce,name:job.file.name,mime:job.file.type,buffer},'*',[buffer]);
 };
 const selectFile=(file?:File)=>{
  if(!file)return;
  if(!fileTypes.includes(file.type)&&!/\.pdf$/i.test(file.name)){setError('Jenis berkas harus PNG, JPG, WEBP atau PDF.');return;}
  if(file.size>maxBytes||file.size===0){setError('Berkas kosong atau melebihi 12 MB.');return;}
  setFileName(file.name);setError('');setIsBusy(true);setImported(false);setIsSptbDocument(false);
  setConfirmed(false);setText('');setRows([]);setWarnings([]);
  setStatus('Membaca dokumen di browser...');
  const job={nonce:crypto.randomUUID(),file};
  pending.current=job;
  if(ready.current)send(job).catch(e=>{setError(String(e));setIsBusy(false);});
 };
 useEffect(()=>{
  const handlePaste=(event:ClipboardEvent)=>{
   if(event.defaultPrevented||isBusy||saving)return;
   const target=event.target as HTMLElement|null;
   if(target?.closest('input,textarea,[contenteditable="true"]'))return;
   const file=Array.from(event.clipboardData?.files||[]).find(f=>/^image\/(png|jpeg|webp)$/.test(f.type));
   if(!file)return;
   event.preventDefault();
   selectFile(file);
  };
  window.addEventListener('paste',handlePaste);
  return ()=>window.removeEventListener('paste',handlePaste);
 },[isBusy,saving]);
 const editRow=(index:number,key:keyof ImportedRow,value:string)=>{
  setConfirmed(false);
  const numeric=['volume','tarifSatuan','bruto','ppnNominal','pphNominal','netto'];
  setRows(prev=>prev.map((row,i)=>i!==index?row:{...row,[key]:numeric.includes(key)?Math.max(0,Number(value)||0):value}));
 };
 const recalcRows=()=>{
  setRows(prev=>prev.map(row=>({...row,netto:Math.max(0,Number(row.bruto)-Number(row.ppnNominal)-Number(row.pphNominal))})));
  setConfirmed(false);
 };
 const save=async()=>{
  setError('');
  if(isBusy||saving)return;
  if(isSptbDocument){setError('Dokumen SPTB adalah rekap pembayaran, bukan kuitansi asal. Gunakan menu SPTB.');return;}
  if(!pejabatReady){setError("Konfigurasi pejabat belum tersedia. Buka Administrasi.");return;}
  if(!confirmed){setError('Centang konfirmasi hasil pemeriksaan sebelum menyimpan.');return;}
  if(!/^\d{6}$/.test(account)){setError('Kode akun harus 6 digit sesuai dokumen anggaran.');return;}
  if(!/^20\d{2}-\d{2}-\d{2}$/.test(date)){setError('Tanggal kuitansi wajib valid (YYYY-MM-DD).');return;}
  if(!activity.trim()&&!rows.some(r=>r.uraianItem.trim())){setError('Uraian rincian kuitansi wajib diisi.');return;}
  if(!rows.length){setError('Minimal ada satu baris rincian kuitansi.');return;}
  if(expectedTotals.bruto!==null&&Math.abs(expectedTotals.bruto-sum.bruto)>1){setError('Total bruto berbeda dari dokumen sumber. Periksa kembali.');return;}
  if(rows.some(r=>!r.nama.trim()||!r.uraianItem.trim()||r.bruto<=0||r.volume<=0||r.tarifSatuan<0||r.netto<0)){
   setError('Lengkapi nama, uraian, volume, dan nominal setiap baris.');return;
  }
  if(rows.some(r=>Math.abs(r.bruto-r.ppnNominal-r.pphNominal-r.netto)>1)){
   setError('Bruto harus sama dengan PPN + PPh + netto pada setiap baris.');return;
  }
  if(rows.some(r=>Math.abs(r.volume*r.tarifSatuan-r.bruto)>1)){
   setError('Volume × tarif tidak sama dengan bruto. Koreksi setiap baris sebelum simpan.');return;
  }
  if(sourceNumber && visibleTransaksi.some(t=>t.nomorSPTB===sourceNumber || t.uraian.includes('[Dokumen luar: '+sourceNumber+']'))){
   setError('Nomor SPTB dokumen luar sudah tercatat di SIP-BP. Periksa duplikasi.');return;
  }
  if(!window.confirm('Simpan '+rows.length+' rincian sebagai Draft? SIP-BP akan menerbitkan NOMOR SPTB BARU, bukan memakai nomor dari dokumen luar. Pastikan tidak terjadi pencatatan ganda.'))return;
  setSaving(true);
  try{
   const penerimaList=rows.map(r=>({
    id:r.id,nama:r.nama.trim(),uraianItem:r.uraianItem.trim(),volume:r.volume,
    satuan:r.satuan||'JP',tarifSatuan:r.tarifSatuan,bruto:r.bruto,
    ppnRate:r.bruto?Number((r.ppnNominal/r.bruto*100).toFixed(3)):0,
    ppnNominal:r.ppnNominal,pphRate:r.bruto?Number((r.pphNominal/r.bruto*100).toFixed(3)):0,
    pphNominal:r.pphNominal,netto:r.netto
   }));
   await addTransaksi({
    nomorKuitansi:'',nomorSPTB:'',tanggalKuitansi:date,sumberDana:source,jenisKuitansi:type,
    kegiatan:activity.trim()||penerimaList[0].uraianItem,kodeAkun:account,namaAkun:accountName.trim(),
    uraian:(description.trim()||penerimaList[0].uraianItem)+(sourceNumber?' [Dokumen luar: '+sourceNumber+']':''),
    ringkasanPenerima:penerimaList.length===1?penerimaList[0].nama:penerimaList[0].nama+' dkk.',
    penerimaList,totalBruto:sum.bruto,totalPPN:sum.ppn,totalPPh:sum.pph,totalNetto:sum.netto,
    status:'Draft',sudahSakti:false,
    ppkNama:pejabat.ppkNama.trim(),ppkNip:pejabat.ppkNip.trim(),bendaharaNama:signer.nama.trim(),bendaharaNip:signer.nip.trim()
   });
   setActiveView('transaksi');
  }catch(e){setError(e instanceof Error?e.message:'Gagal menyimpan Draft. Periksa kembali data.');}
  finally{setSaving(false);}
 };
 const input='mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm bg-white text-slate-900';
 return <div className="max-w-6xl mx-auto space-y-4">
  <iframe ref={frame} sandbox="allow-scripts" src="/ocr-engine.html" title="Mesin OCR kuitansi terisolasi" className="hidden" aria-hidden="true"/>
  <div className="bg-white rounded-xl border border-slate-200 p-5">
   <h2 className="font-bold text-lg flex items-center gap-2"><FileScan className="text-blue-700" size={22}/>{fixedType==='jasa_profesi'?'Ekstraktor Kuitansi Jasa Profesi':fixedType==='perjadin_luar_kota'?'Ekstraktor Kuitansi Perjadin Luar Kota':fixedType==='perjadin_dalam_kota'?'Ekstraktor Kuitansi Perjadin Dalam Kota':'Ekstraktor Kuitansi dari Luar SIP-BP'}</h2>
   <p className="text-sm text-slate-600 mt-1">Unggah kuitansi kolektif/individual yang sudah dibuat di luar SIP-BP. Hasil OCR adalah draf pemeriksaan, bukan bukti transaksi yang telah diverifikasi.</p>
   <div tabIndex={0} aria-label="Area unggah kuitansi: seret berkas ke sini atau tempel screenshot Ctrl+V"
      onDragOver={e=>{e.preventDefault();setDragging(true);}}
      onDragLeave={e=>{e.preventDefault();setDragging(false);}}
      onDrop={e=>{e.preventDefault();setDragging(false);if(!isBusy&&!saving)selectFile(e.dataTransfer.files[0]);}}
      onPaste={e=>{const file=Array.from(e.clipboardData.files).find(f=>f.type.startsWith('image/'));if(file){e.preventDefault();if(!isBusy&&!saving)selectFile(file);}}}
      className={`mt-4 rounded-xl border-2 border-dashed p-4 outline-none focus:ring-2 focus:ring-blue-500 ${dragging?'border-blue-600 bg-blue-50':'border-slate-300 bg-slate-50'}`}>
   <p className="text-sm text-slate-700 font-medium">Seret PDF/gambar ke sini, klik pilih berkas, atau fokuskan area ini lalu tekan Ctrl+V untuk screenshot.</p>
   <div className="mt-4 flex flex-col md:flex-row md:items-center gap-3">
    <label className="inline-flex items-center gap-2 rounded-lg bg-blue-700 text-white px-4 py-2.5 font-semibold text-sm cursor-pointer hover:bg-blue-800">
     <Upload size={17}/>Pilih Gambar atau PDF
     <input type="file" accept=".pdf,image/png,image/jpeg,image/webp" className="sr-only" disabled={isBusy||saving} onChange={e=>{selectFile(e.target.files?.[0]);e.currentTarget.value='';}}/>
    </label>
    <span className="text-sm text-slate-700">{fileName||'Belum ada berkas'} · maksimum 12 MB dan 5 halaman</span>
   </div>
   </div>
   <p role="status" className="mt-2 text-xs text-slate-600">{status}{isBusy?' (pemrosesan lokal sedang berjalan)':''}</p>
   <p className="mt-1 text-xs text-slate-500">Tidak membutuhkan API AI berbayar. Mesin OCR/PDF diunduh dari CDN publik saat digunakan. Berkas asli diproses di browser dan tidak diunggah ke Supabase; hanya data yang Anda setujui disimpan sebagai transaksi.</p>
  </div>
  {!pejabatReady&&<p role="alert" className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-900">Konfigurasi pejabat belum tersedia. {pejabatError}</p>}
  {error&&<p role="alert" className="bg-red-50 border border-red-300 rounded-lg p-3 text-sm text-red-800">{error}</p>}
   {isSptbDocument&&<p role="alert" className="bg-amber-50 border border-amber-300 rounded-lg p-4 text-sm text-amber-950 font-medium">Dokumen SPTB terdeteksi. Fitur ini hanya untuk kuitansi atau tanda terima sumber. Dokumen SPTB tidak dapat disimpan sebagai kuitansi baru; gunakan menu SPTB.</p>}
  {imported&&<div className="space-y-4">
   {onApplyToForm&&<button type="button" disabled={isBusy||saving||!rows.length||isSptbDocument} onClick={()=>{
      if(!rows.length)return;
      if(expectedTotals.bruto!==null&&Math.abs(expectedTotals.bruto-sum.bruto)>1){setError('Total rincian tidak sesuai dokumen sumber. Koreksi sebelum menerapkan.');return;}
      if(!window.confirm('Terapkan '+rows.length+' rincian ke formulir manual? Periksa kembali seluruh kolom dan jangan langsung finalisasi.'))return;
      onApplyToForm({rows,date,account,activity,description,sourceNumber,tanggalSppd,telahDibayarSemula:paidBefore,sisaKurangLebih:balance});
     }} className="w-full bg-blue-700 text-white font-semibold px-4 py-3 rounded-lg disabled:opacity-50">
       Terapkan Hasil Ekstraksi ke Formulir Kuitansi
     </button>}
   {warnings.length>0&&<section className="bg-amber-50 border border-amber-200 rounded-xl p-4">
    <h3 className="font-bold text-sm flex items-center gap-2 text-amber-900"><AlertTriangle size={16}/>Hal yang harus diperiksa</h3>
    <ul className="mt-2 list-disc pl-5 text-xs text-amber-900 space-y-1">{warnings.map((w,i)=><li key={i}>{w}</li>)}</ul>
   </section>}
   <section className="bg-white border rounded-xl p-5 space-y-4">
    <h3 className="font-bold text-base flex items-center gap-2"><FileText size={18}/>Identitas Kuitansi</h3>
    {sourceNumber&&<p className="text-xs text-slate-600">Nomor dokumen luar yang terdeteksi: <strong>{sourceNumber}</strong>. Nomor ini tidak digunakan sebagai nomor SPTB baru.</p>}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
     <label className="text-xs font-semibold">Tanggal Kuitansi<input type="date" value={date} onChange={e=>{setDate(e.target.value);setConfirmed(false);}} className={input}/></label>
     <label className="text-xs font-semibold">Sumber Dana
      <select value={source} disabled={currentRole!=='bendahara'} onChange={e=>{setSource(e.target.value as SumberDana);setConfirmed(false);}} className={input}>
       {currentRole!=='bpp_pnbp'&&<option value="RM">RM</option>}{currentRole!=='bpp_rm'&&<option value="PNBP">PNBP</option>}
      </select>
     </label>
     <label className="text-xs font-semibold">Jenis Kuitansi
      <select className={input} value={type} disabled={Boolean(fixedType)} onChange={e=>{setType(e.target.value as KuitansiType);setConfirmed(false);}}>
       <option value="jasa_profesi">Jasa Profesi / Honorarium</option>
       <option value="perjadin_luar_kota">Perjadin Luar Kota</option>
       <option value="perjadin_dalam_kota">Perjadin Dalam Kota</option>
      </select>
     </label>
     <label className="text-xs font-semibold">Kode Akun (6 digit)<input className={input} inputMode="numeric" maxLength={6} value={account} onChange={e=>{setAccount(e.target.value.replace(/\D/g,''));setConfirmed(false);}}/></label>
     <label className="text-xs font-semibold">Nama Akun<input className={input} value={accountName} onChange={e=>{setAccountName(e.target.value);setConfirmed(false);}}/></label>
     <label className="text-xs font-semibold">Kegiatan<input className={input} value={activity} onChange={e=>{setActivity(e.target.value);setConfirmed(false);}} placeholder="Nama kegiatan sesuai kuitansi"/></label>
     <label className="text-xs font-semibold md:col-span-3">Uraian Dokumen<input className={input} value={description} onChange={e=>{setDescription(e.target.value);setConfirmed(false);}}/></label>
     <label className="text-xs font-semibold">Nama PPK (Administrasi)<input className={input} readOnly value={pejabat.ppkNama}/></label>
     <label className="text-xs font-semibold">NIP PPK (Administrasi)<input className={input} readOnly value={pejabat.ppkNip}/></label>
     <label className="text-xs font-semibold">Nama BPP (Administrasi)<input className={input} readOnly value={signer.nama}/></label>
     <label className="text-xs font-semibold">NIP BPP (Administrasi)<input className={input} readOnly value={signer.nip}/></label>
    </div>
   </section>
   <section className="bg-white border rounded-xl p-4">
    <div className="flex justify-between flex-wrap gap-3 items-center mb-3">
     <h3 className="font-bold">Rincian Penerima ({rows.length} baris)</h3>
     <div className="flex gap-2">
      <button type="button" onClick={recalcRows} className="border border-blue-200 text-blue-700 px-3 py-2 rounded-lg text-xs flex items-center gap-1"><RefreshCw size={13}/>Hitung Netto</button>
      <button type="button" onClick={()=>{setRows(v=>[...v,freshRow()]);setConfirmed(false);}} className="bg-blue-700 text-white px-3 py-2 rounded-lg text-xs flex items-center gap-1"><Plus size={14}/>Tambah Baris</button>
     </div>
    </div>
    <div className="overflow-x-auto">
     <table className="min-w-[1120px] w-full text-xs border-collapse">
      <thead><tr className="bg-slate-100">{['No','Nama Penerima','Uraian Pembayaran','Volume','Satuan','Tarif','Bruto','PPN','PPh','Netto',''].map(h=><th key={h} className="p-2 border">{h}</th>)}</tr></thead>
      <tbody>{rows.map((r,i)=><tr key={r.id}>
       <td className="border p-1 text-center">{i+1}</td>
       {(['nama','uraianItem','volume','satuan','tarifSatuan','bruto','ppnNominal','pphNominal','netto'] as const).map(key=><td className="border p-1" key={key}>
        <input aria-label={key+' baris '+(i+1)} className="w-full min-w-[65px] border rounded p-1.5" type={['volume','tarifSatuan','bruto','ppnNominal','pphNominal','netto'].includes(key)?'number':'text'} min={0} step="any" value={r[key]} onChange={e=>editRow(i,key,e.target.value)}/>
       </td>)}
       <td className="border p-1"><button type="button" aria-label={'Hapus baris '+(i+1)} onClick={()=>{setRows(v=>v.filter((_,idx)=>idx!==i));setConfirmed(false);}} className="p-1 text-red-700"><Trash2 size={16}/></button></td>
      </tr>)}</tbody>
     </table>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
     {([['Bruto',sum.bruto],['PPN',sum.ppn],['PPh',sum.pph],['Netto',sum.netto]] as const).map(([label,value])=><div key={label} className="bg-slate-50 rounded-lg p-3 text-sm"><span className="block text-xs text-slate-600">{label}</span><strong>Rp {money(value)}</strong></div>)}
    </div>
   </section>
   <section className="bg-white border rounded-xl p-4 space-y-2">
    <button type="button" onClick={()=>setRawOpen(v=>!v)} className="text-xs text-blue-700 underline">{rawOpen?'Tutup teks OCR':'Periksa / koreksi teks OCR asli'}</button>
    {rawOpen&&<>
     <textarea value={text} onChange={e=>setText(e.target.value)} rows={9} className="w-full border rounded p-3 text-xs font-mono" aria-label="Teks OCR"/>
     <button type="button" onClick={()=>applyText(text)} className="bg-slate-800 text-white px-3 py-2 rounded text-xs">Ekstrak ulang dari teks yang dikoreksi</button>
    </>}
    <label className="flex gap-2 items-start text-sm mt-3">
     <input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} className="mt-1"/>
     <span>Saya telah mencocokkan seluruh rincian, tanggal, sumber dana, kode akun, pajak dan nominal dengan dokumen asli, serta memastikan transaksi belum pernah dicatat dalam SIP-BP.</span>
    </label>
    {error&&<p role="alert" className="bg-red-50 border border-red-300 rounded p-3 text-sm text-red-800">{error}</p>}
     {(!pejabatReady||!rows.length||isSptbDocument)&&<p className="text-xs text-amber-800">{isSptbDocument?'Simpan dinonaktifkan untuk dokumen SPTB.':!pejabatReady?'Isi konfigurasi pejabat pada menu Administrasi terlebih dahulu.':'Belum ada rincian kuitansi yang valid untuk disimpan.'}</p>}
     <button type="button" disabled={!confirmed||saving||isBusy||!rows.length||!pejabatReady||isSptbDocument} onClick={save} className="w-full mt-3 rounded-lg bg-emerald-700 text-white px-5 py-3 font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
     <ShieldCheck size={18}/>{saving?'Menyimpan Draft...':'Simpan ke SIP-BP sebagai Draft'}
    </button>
    <p className="text-xs text-slate-500">Simpan akan menambah transaksi dan menerbitkan nomor SPTB baru. Tindakan ini tidak dapat dibatalkan hanya dengan menutup halaman.</p>
   </section>
  </div>}
 </div>;
};
