import React from 'react';
import {X,Printer} from 'lucide-react';
import type {SumberDana} from '../../types';
import {usePejabatSettings,signerForFunding} from '../../context/PejabatSettingsContext';
export type TravelDetail={nama:string;uraian:string;volume:number;satuan:string;tarif:number;bruto:number;pph:number;netto:number;tanggalPelaksanaan?:string;keterangan?:string;tarifDasar?:number;persentase?:number};
type Props={open:boolean;onClose:()=>void;title:string;date:string;source:SumberDana;account:string;details:TravelDetail[];ppn?:number;pph?:number;purpose?:string;sppdNomor?:string;tanggalSppd?:string;telahDibayarSemula?:number;sisaKurangLebih?:number};
const amount=(v:number)=>new Intl.NumberFormat('id-ID',{maximumFractionDigits:0}).format(v||0);
const dateLabel=(v:string)=>v?new Date(v+'T12:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}):'—';
export const PerjadinReceiptPreview:React.FC<Props>=({open,onClose,title,date,source,details,ppn=0,pph=0,purpose,sppdNomor,tanggalSppd,telahDibayarSemula,sisaKurangLebih})=>{
 const {value:p}=usePejabatSettings();
 if(!open)return null;
 const outside=title.toLowerCase().includes('luar');
 const gross=details.reduce((n,r)=>n+r.bruto,0);
 const totalPph=pph||details.reduce((n,r)=>n+r.pph,0);
 const net=gross-totalPph-ppn;
 const signer=signerForFunding(p,source);
 const cell='border border-black px-2 py-1.5 align-top';
 const rows=details.map((r,i)=>{
  const tax=pph===0?r.pph:i===details.length-1?pph-details.slice(0,i).reduce((n,x)=>n+Math.round(pph*x.bruto/(gross||1)),0):Math.round(pph*r.bruto/(gross||1));
  return {...r,pph:tax};
 });
 return <div role="dialog" aria-modal="true" aria-label={'Pratinjau '+title} className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 p-3 sm:p-8">
 <div className="mx-auto max-w-[1100px] bg-white rounded-lg shadow-xl">
 <header className="flex justify-between items-center gap-2 bg-slate-900 text-white p-3 print:hidden"><strong>Pratinjau {title}</strong><div className="flex gap-2"><button type="button" onClick={()=>window.print()} className="inline-flex items-center gap-2 rounded bg-blue-600 px-3 py-1.5 text-xs"><Printer size={15}/>Cetak / Simpan PDF</button><button type="button" onClick={onClose} aria-label="Tutup"><X/></button></div></header>
 <div id="pratinjau-perjadin" className="bg-white text-black p-6 sm:p-10 text-[12px]">
 {outside?<React.Fragment>
 <div className="mb-6 text-[11px]"><div>Lampiran SPPD Nomor : {sppdNomor||'—'}</div><div>Tanggal : {dateLabel(tanggalSppd||'')}</div></div>
 <table className="w-full border-collapse text-[11px]"><thead><tr><th className={cell}>NO</th><th className={cell}>PERINCIAN BIAYA</th><th className={cell}>JUMLAH</th><th className={cell}>KETERANGAN</th></tr></thead>
 <tbody>{rows.map((r,i)=><tr key={i}><td className={cell+' text-center'}>{i+1}</td><td className={cell}><div>{r.uraian}</div><div className="mt-1 text-right">{r.persentase&&r.tarifDasar?r.volume+' '+r.satuan+' x @Rp '+amount(r.tarifDasar)+' × '+r.persentase+'%':r.volume!==1||r.satuan==='Hari'?r.volume+' '+r.satuan+' x @Rp '+amount(r.tarif):''}</div></td><td className={cell+' text-right whitespace-nowrap'}>Rp {amount(r.bruto)}</td><td className={cell}>{r.keterangan||''}</td></tr>)}
 <tr className="font-bold"><td colSpan={2} className={cell+' text-center'}>JUMLAH</td><td className={cell+' text-right'}>Rp {amount(gross)}</td><td className={cell}></td></tr></tbody></table>
 <div className="text-right mt-5">{p.kota}, {dateLabel(date)}</div>
 <div className="grid grid-cols-2 gap-8 mt-4 text-[11px]"><div><div>Telah dibayar sejumlah</div><strong>Rp {amount(net)}</strong><div className="mt-2">Bendahara Pengeluaran</div><div className="mt-14 font-semibold underline">{signer.nama||'______________________'}</div><div>NIP. {signer.nip||'—'}</div></div><div className="text-right"><div>Telah menerima jumlah uang sebesar</div><strong>Rp {amount(net)}</strong><div className="mt-2">Yang Menerima</div><div className="mt-14 font-semibold underline">{rows[0]?.nama||'______________________'}</div></div></div>
 <h3 className="text-center font-bold my-6">PERHITUNGAN SPPD RAMPUNG</h3>
 <div className="max-w-md mx-auto text-[11px]"><div className="flex justify-between"><span>Ditetapkan sejumlah</span><span>Rp {amount(gross)}</span></div><div className="flex justify-between"><span>Yang telah dibayar semula</span><span>{telahDibayarSemula===undefined?'—':'Rp '+amount(telahDibayarSemula)}</span></div><div className="flex justify-between"><span>Sisa Kurang/Lebih</span><span>{sisaKurangLebih===undefined?'—':sisaKurangLebih===0?'-':'Rp '+amount(sisaKurangLebih)}</span></div></div>
 <div className="max-w-xs mt-9 text-center text-[11px]"><div>Setuju Dibayar</div><div>a.n. Kuasa Pengguna Anggaran</div><div>PEJABAT PEMBUAT KOMITMEN</div><div className="mt-14 font-semibold underline">{p.ppkNama||'______________________'}</div><div>NIP. {p.ppkNip||'—'}</div></div>
 </React.Fragment>:<React.Fragment>
 <h2 className="text-center text-[15px] font-bold">DAFTAR PENERIMAAN</h2>
 <p className="text-center mt-1 mb-5 text-[12px]">{purpose||'Perjalanan dinas dalam kota sesuai rincian penerima berikut.'}</p>
 <table className="w-full border-collapse text-[11px]"><thead><tr>{['NO','NAMA','TANGGAL PELAKSANAAN','OH','Hari','Jumlah','TANDA TANGAN'].map(h=><th key={h} className={cell}>{h}</th>)}</tr></thead>
 <tbody>{rows.map((r,i)=><tr key={i}><td className={cell+' text-center'}>{i+1}</td><td className={cell}>{r.nama}</td><td className={cell+' text-center'}>{dateLabel(r.tanggalPelaksanaan||'')}</td><td className={cell+' text-right'}>{amount(r.tarif)}</td><td className={cell+' text-center'}>{r.volume}</td><td className={cell+' text-right'}>{amount(r.bruto)}</td><td className={cell}></td></tr>)}<tr className="font-bold"><td colSpan={5} className={cell+' text-center'}>JUMLAH</td><td className={cell+' text-right'}>{amount(gross)}</td><td className={cell}></td></tr></tbody></table>
 <div className="text-right mt-5">{p.kota}, {dateLabel(date)}</div>
 <div className="grid grid-cols-2 gap-8 mt-9 text-[11px]"><div className="text-center"><div>Setuju Dibayar</div><div>a.n. Kuasa Pengguna Anggaran</div><div>Pejabat Pembuat Komitmen</div><div>{p.satkerPendek}</div><div className="mt-14 font-semibold underline">{p.ppkNama||'______________________'}</div><div>NIP. {p.ppkNip||'—'}</div></div><div className="text-center"><div>Bendahara Pengeluaran Pembantu</div><div>{source}</div><div className="mt-[72px] font-semibold underline">{signer.nama||'______________________'}</div><div>NIP. {signer.nip||'—'}</div></div></div>
 </React.Fragment>}
 {(totalPph>0||ppn>0)&&<p className="mt-5 text-xs">Potongan: PPh Rp {amount(totalPph)}, PPN Rp {amount(ppn)}; bersih dibayarkan Rp {amount(net)}.</p>}
 </div></div>
 <style>{'@media print {body *{visibility:hidden!important} #pratinjau-perjadin,#pratinjau-perjadin *{visibility:visible!important} #pratinjau-perjadin{position:absolute;top:0;left:0;width:100%;padding:12mm!important;font-size:11px!important} @page{size:A4;margin:10mm}}'}</style>
 </div>;
};