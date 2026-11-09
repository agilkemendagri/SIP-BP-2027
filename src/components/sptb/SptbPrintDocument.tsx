import React from 'react';
import type {Transaksi} from '../../types';
import {formatTanggalIndo} from '../../utils/formatters';

export interface SptbPrintMetadata {
  kodeSatker:string;
  tanggalNomorDipa:string;
  klasifikasiAnggaran:string;
  kota:string;
  tanggalTtd:string;
  ppkNama:string;
  ppkNip:string;
  bendaharaNama:string;
  bendaharaNip:string;
}
const SATKER='Balai Besar Pengembangan Kompetensi Aparatur Pemerintahan Dalam Negeri IV';
const rupiah=(value:number)=>'Rp '+new Intl.NumberFormat('id-ID',{maximumFractionDigits:0}).format(value||0);
const money=(value:number)=>value ? rupiah(value) : '–';

/** Layout SPTB sesuai referensi pengguna: 9 kolom, dua tingkat header, a-i,
 * rincian jumlah bruto serta PPN dan PPh (tidak memunculkan netto di tabel).
 * Nilai DIPA/klasifikasi diisi manual pada pratinjau agar tidak mengarang data DIPA.
 */
export const SptbPrintDocument:React.FC<{trx:Transaksi;metadata:SptbPrintMetadata}>=({trx,metadata})=>{
 const cell='border border-black px-1 py-1 align-top';
 return <article className="sptb-reference-sheet bg-white text-black mx-auto box-border font-[Arial,sans-serif] text-[10px] leading-[1.38] w-[190mm] max-w-full px-[4mm] py-[5mm] print:mx-auto print:w-[190mm] print:max-w-none print:px-0 print:py-0">
  <header className="text-center font-bold mb-4">
   <h1 className="underline text-[14px] leading-tight">SURAT PERNYATAAN TANGGUNG JAWAB BELANJA</h1>
   <p className="text-[13px] mt-1">Nomor : {trx.nomorSPTB}</p>
  </header>
  <dl className="mb-3 space-y-[3px] font-semibold">
   {[
    ['Kode Satuan Kerja',metadata.kodeSatker],
    ['Nama Satuan Kerja',SATKER],
    ['Tanggal/No. DIPA',metadata.tanggalNomorDipa||'—'],
    ['Klasifikasi Anggaran',metadata.klasifikasiAnggaran||'—']
   ].map(([label,value],idx)=><div key={label} className="grid grid-cols-[15px_170px_minmax(0,1fr)] gap-x-1">
    <dt>{idx+1}.</dt><dt>{label}</dt><dd>: {value}</dd>
   </div>)}
  </dl>
  <p className="font-semibold text-justify mb-2">
   Yang bertandatangan di bawah ini atas Nama Kuasa Pengguna Anggaran Satuan Kerja {SATKER} menyatakan bahwa saya bertanggungjawab secara formal dan material atas segala pengeluaran yang telah dibayar lunas oleh Bendahara Pengeluaran kepada yang berhak menerima serta kebenaran perhitungan dan setoran pajak yang telah dipungut atas pembayaran tersebut dengan perincian sebagai berikut :
  </p>
  <table className="w-full border-collapse border border-black text-[9px] leading-[1.35] table-fixed">
   <colgroup>
    <col style={{width:'3.5%'}}/><col style={{width:'8%'}}/><col style={{width:'16%'}}/><col style={{width:'36%'}}/>
    <col style={{width:'5.5%'}}/><col style={{width:'5.5%'}}/><col style={{width:'11%'}}/><col style={{width:'7.5%'}}/><col style={{width:'7%'}}/>
   </colgroup>
   <thead className="print:table-header-group">
    <tr className="bg-[#e3e3e3] text-center font-bold">
     <th className={cell} rowSpan={2}>No</th>
     <th className={cell} rowSpan={2}>Akun</th>
     <th className={cell} rowSpan={2}>Penerima</th>
     <th className={cell} rowSpan={2}>Uraian</th>
     <th className={cell} colSpan={2}>Bukti</th>
     <th className={cell} rowSpan={2}>Jumlah</th>
     <th className={cell} colSpan={2}>Pajak yg dipungut Bend. Pengeluaran</th>
    </tr>
    <tr className="bg-[#e3e3e3] text-center font-bold">
     <th className={cell}>Tgl.</th><th className={cell}>No.</th>
     <th className={cell}>PPN</th><th className={cell}>PPh</th>
    </tr>
    <tr className="text-center font-bold">
     {['a','b','c','d','e','f','g','h','i'].map(c=><th key={c} className="border border-black py-[2px]">{c}</th>)}
    </tr>
   </thead>
   <tbody>
    {trx.penerimaList.map((item,idx)=><tr key={item.id||idx} className="break-inside-avoid">
     <td className={cell+' text-center'}>{idx+1}</td>
     <td className={cell+' text-center break-all'}>{trx.kodeAkun}</td>
     <td className={cell+' break-words'}>{item.nama}{item.jabatan?', '+item.jabatan:''}</td>
     <td className={cell+' break-words'}>{item.uraianItem||trx.uraian||trx.kegiatan}</td>
     <td className={cell+' text-center'}> </td><td className={cell+' text-center'}> </td>
     <td className={cell+' text-right whitespace-nowrap'}>{money(item.bruto)}</td>
     <td className={cell+' text-right whitespace-nowrap'}>{money(item.ppnNominal)}</td>
     <td className={cell+' text-right whitespace-nowrap'}>{money(item.pphNominal)}</td>
    </tr>)}
   </tbody>
   <tfoot className="font-bold">
    <tr>
     <td colSpan={6} className="border border-black py-1 text-center tracking-[2px]">JUMLAH</td>
     <td className="border border-black px-1 text-right whitespace-nowrap">{money(trx.totalBruto)}</td>
     <td className="border border-black px-1 text-right whitespace-nowrap">{money(trx.totalPPN)}</td>
     <td className="border border-black px-1 text-right whitespace-nowrap">{money(trx.totalPPh)}</td>
    </tr>
   </tfoot>
  </table>
  <p className="text-justify font-semibold mt-3">
   Bukti-bukti pengeluaran anggaran dan asli setoran pajak (SSP/BPN) tersebut diatas disimpan oleh Pengguna Anggaran / Kuasa Pengguna Anggaran untuk kelengkapan administrasi dan pemeriksa aparat pengawasan fungsional.
  </p>
  <p className="font-semibold mt-3">Demikian Surat Pernyataan ini dibuat dengan sebenarnya.</p>
  <footer className="mt-5 grid grid-cols-2 gap-8 text-center font-semibold break-inside-avoid">
   <section>
    <div className="mt-4">Pejabat Pembuat Komitmen</div>
    <div>BBPK-APDN IV</div>
    <div className="h-[65px]"/>
    <div className="font-bold underline">{metadata.ppkNama||'—'}</div>
    <div>NIP. {metadata.ppkNip||'—'}</div>
   </section>
   <section>
    <div>{metadata.kota||'Makassar'}, {formatTanggalIndo(metadata.tanggalTtd||trx.tanggalKuitansi)}</div>
    <div>Bendahara Pengeluaran</div>
    <div>BBPK-APDN IV</div>
    <div className="h-[65px]"/>
    <div className="font-bold underline">{metadata.bendaharaNama||'—'}</div>
    <div>NIP. {metadata.bendaharaNip||'—'}</div>
   </section>
  </footer>
 </article>;
};
