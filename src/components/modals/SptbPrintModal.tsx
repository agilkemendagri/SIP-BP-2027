import React from 'react';
import {useApp} from '../../context/AppContext';
import {Printer,X,FileCheck2,Download,Loader2} from 'lucide-react';
import {exportElementToPdf} from '../../utils/pdfGenerator';
import {SptbPrintDocument,type SptbPrintMetadata} from '../sptb/SptbPrintDocument';

/** Printer-friendly SPTB. Metadata edits here affect this print preview only;
 * no transaction, SPTB counter, or Supabase data is changed.
 */
export const SptbPrintModal:React.FC=()=>{
 const {previewSptb,setPreviewSptb,showToast,currentUser,currentRole}=useApp();
 const printAreaRef=React.useRef<HTMLDivElement>(null);
 const [isGeneratingPdf,setIsGeneratingPdf]=React.useState(false);
 const [metadata,setMetadata]=React.useState<SptbPrintMetadata>({
  kodeSatker:'027177',tanggalNomorDipa:'',klasifikasiAnggaran:'',
  kota:'Makassar',tanggalTtd:'',ppkNama:'',ppkNip:'',bendaharaNama:'',bendaharaNip:''
 });
 React.useEffect(()=>{
  if(!previewSptb)return;
  setMetadata({
   kodeSatker:'027177',
   // DIPA and full budget classification are not recorded in Transaksi.
   // Do not hardcode the sample DIPA from the user's reference image.
   tanggalNomorDipa:'',
   klasifikasiAnggaran:previewSptb.kodeAkun||'',
   kota:'Makassar',tanggalTtd:previewSptb.tanggalKuitansi||'',
   ppkNama:previewSptb.ppkNama||'',ppkNip:previewSptb.ppkNip||'',
   bendaharaNama:currentRole==='bendahara' ? currentUser.nama : (previewSptb.bendaharaNama||''),
   bendaharaNip:currentRole==='bendahara' ? currentUser.nip : (previewSptb.bendaharaNip||'')
  });
 },[previewSptb?.id]);
 if(!previewSptb)return null;
 const trx=previewSptb;
 const update=(key:keyof SptbPrintMetadata,value:string)=>setMetadata(prev=>({...prev,[key]:value}));
 const handleDownloadPdf=async()=>{
  if(!printAreaRef.current)return;
  try{
   setIsGeneratingPdf(true);
   await exportElementToPdf(printAreaRef.current,{
    fileName:'SPTB_'+trx.nomorSPTB.replace(/[^a-zA-Z0-9]/g,'_'),
    orientation:'portrait'
   });
   showToast('PDF SPTB berhasil dibuat. Periksa kesesuaian dengan dokumen resmi.','success');
  }catch(err){
   showToast('Gagal membuat PDF SPTB: '+(err instanceof Error?err.message:'Kesalahan tidak diketahui'),'error');
  }finally{setIsGeneratingPdf(false);}
 };
 const fields:Array<{key:keyof SptbPrintMetadata;label:string;placeholder:string}>=[
  {key:'kodeSatker',label:'Kode Satuan Kerja',placeholder:'027177'},
  {key:'tanggalNomorDipa',label:'Tanggal/No. DIPA',placeholder:'Isi sesuai DIPA tahun berjalan'},
  {key:'klasifikasiAnggaran',label:'Klasifikasi Anggaran',placeholder:'Kode lengkap sesuai DIPA/POK'},
  {key:'kota',label:'Kota tanda tangan',placeholder:'Makassar'},
  {key:'tanggalTtd',label:'Tanggal tanda tangan',placeholder:'YYYY-MM-DD'},
  {key:'ppkNama',label:'Nama PPK',placeholder:'Nama lengkap PPK'},
  {key:'ppkNip',label:'NIP PPK',placeholder:'18 digit'},
  {key:'bendaharaNama',label:'Nama Bendahara',placeholder:'Nama Bendahara Pengeluaran'},
  {key:'bendaharaNip',label:'NIP Bendahara',placeholder:'18 digit'}
 ];
 return <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-start justify-center overflow-y-auto p-3 sm:p-5 print:static print:block print:p-0 print:bg-white">
  <div className="bg-white w-full max-w-[1000px] rounded-xl shadow-2xl my-auto print:my-0 print:max-w-none print:shadow-none">
   <div className="flex items-center justify-between gap-2 flex-wrap bg-slate-900 p-3 text-white no-print">
    <span className="text-sm font-bold flex items-center gap-2"><FileCheck2 size={17}/>Pratinjau SPTB · {trx.nomorSPTB}</span>
    <div className="flex items-center gap-2 flex-wrap">
     <button type="button" onClick={handleDownloadPdf} disabled={isGeneratingPdf} className="bg-emerald-600 rounded px-3 py-2 text-xs font-semibold disabled:opacity-50 flex gap-1 items-center">{isGeneratingPdf?<Loader2 size={14}/>:<Download size={14}/>} Unduh PDF</button>
     <button type="button" onClick={()=>window.print()} className="bg-blue-600 rounded px-3 py-2 text-xs font-semibold flex gap-1 items-center"><Printer size={14}/> Cetak</button>
     <button type="button" onClick={()=>setPreviewSptb(null)} aria-label="Tutup pratinjau" className="p-2 rounded hover:bg-slate-700"><X size={18}/></button>
    </div>
   </div>
   <div className="bg-blue-50 border-b border-blue-100 px-4 py-3 no-print">
    <p className="font-bold text-slate-800 text-xs mb-2">Identitas dokumen untuk cetak (tidak mengubah transaksi)</p>
    <p className="text-xs text-slate-600 mb-3">Sesuaikan DIPA, klasifikasi anggaran, kode satker, dan pejabat dengan dokumen resmi. Contoh tanggal/nomor DIPA pada gambar tidak disalin otomatis karena dapat berbeda setiap tahun.</p>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
     {fields.map(field=><label key={field.key} className="text-[11px] font-semibold text-slate-600">
      {field.label}
      <input type={field.key==='tanggalTtd'?'date':'text'} value={metadata[field.key]} onChange={e=>update(field.key,e.target.value)} placeholder={field.placeholder} className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-xs font-normal text-slate-900"/>
     </label>)}
    </div>
   </div>
   <div className="bg-slate-100 p-3 sm:p-5 print:p-0 print:bg-white">
    <div ref={printAreaRef} className="mx-auto bg-white max-w-full w-fit print:w-full">
     <SptbPrintDocument trx={trx} metadata={metadata}/>
    </div>
   </div>
  </div>
 </div>;
};
