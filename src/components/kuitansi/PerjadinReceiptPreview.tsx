import React from 'react';
import {X,Printer} from 'lucide-react';
import type {SumberDana} from '../../types';
import {usePejabatSettings,signerForFunding} from '../../context/PejabatSettingsContext';
type Detail={nama:string;uraian:string;volume:number;satuan:string;tarif:number;bruto:number;pph:number;netto:number};
type Props={open:boolean;onClose:()=>void;title:string;date:string;source:SumberDana;account:string;details:Detail[];ppn?:number;pph?:number};
const money=(v:number)=>'Rp '+new Intl.NumberFormat('id-ID').format(v||0);
export const PerjadinReceiptPreview:React.FC<Props>=({open,onClose,title,date,source,account,details,ppn=0,pph=0})=>{
 const {value:p}=usePejabatSettings();if(!open)return null;
 const bruto=details.reduce((n,r)=>n+r.bruto,0),netto=bruto-ppn-pph,bpp=signerForFunding(p,source);
 return <div className="fixed inset-0 z-50 bg-slate-950/70 overflow-y-auto p-3 sm:p-8" role="dialog" aria-modal="true" aria-label="Pratinjau Kuitansi Perjalanan Dinas">
  <div className="max-w-5xl mx-auto bg-white shadow-xl rounded-xl overflow-hidden">
   <div className="flex items-center justify-between gap-2 bg-slate-900 text-white p-3 print:hidden">
    <strong>Pratinjau {title}</strong>
    <div className="flex gap-2"><button type="button" onClick={()=>window.print()} className="bg-blue-600 rounded px-3 py-1.5 text-sm inline-flex gap-1 items-center"><Printer size={15}/>Cetak / PDF</button><button type="button" onClick={onClose} aria-label="Tutup pratinjau"><X/></button></div>
   </div>
   <div id="pratinjau-perjadin" className="p-6 sm:p-10 bg-white text-slate-900">
    <h2 className="text-center font-bold text-lg uppercase">{p.satkerPanjang}</h2>
    <h3 className="text-center font-semibold mt-4 uppercase">TANDA TERIMA — {title}</h3>
    <p className="mt-6 text-sm">Tanggal: {date||'—'} · Sumber Dana: {source} · Akun: {account}</p>
    <table className="w-full text-xs border-collapse mt-4"><thead><tr>{['No','Penerima','Uraian','Volume','Satuan','Tarif','Bruto','PPh','Netto'].map(h=><th key={h} className="border p-2 text-left">{h}</th>)}</tr></thead><tbody>{details.map((r,i)=><tr key={i}><td className="border p-2">{i+1}</td><td className="border p-2">{r.nama}</td><td className="border p-2">{r.uraian}</td><td className="border p-2">{r.volume}</td><td className="border p-2">{r.satuan}</td><td className="border p-2">{money(r.tarif)}</td><td className="border p-2">{money(r.bruto)}</td><td className="border p-2">{money(r.pph)}</td><td className="border p-2">{money(r.netto)}</td></tr>)}</tbody></table>
    <div className="mt-4 text-right text-sm">Bruto: <b>{money(bruto)}</b> · PPN: <b>{money(ppn)}</b> · PPh: <b>{money(pph)}</b> · Netto: <b>{money(netto)}</b></div>
    <div className="grid grid-cols-2 gap-8 mt-12 text-sm text-center"><div>Pejabat Pembuat Komitmen<div className="mt-14 font-semibold">{p.ppkNama||'(belum dikonfigurasi)'}</div><div>NIP {p.ppkNip||'—'}</div></div><div>{p.kota}, {date||'—'}<div className="mt-2">Bendahara Pengeluaran Pembantu</div><div className="mt-12 font-semibold">{bpp.nama||'(belum dikonfigurasi)'}</div><div>NIP {bpp.nip||'—'}</div></div></div>
   </div>
  </div>
  <style>{`@media print {body * {visibility:hidden!important} #pratinjau-perjadin, #pratinjau-perjadin * {visibility:visible!important} #pratinjau-perjadin{position:absolute;left:0;top:0;width:100%;padding:12mm!important} }`}</style>
 </div>;
};