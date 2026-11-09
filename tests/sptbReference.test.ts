import {describe,it,expect} from "bun:test";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {SptbPrintDocument,type SptbPrintMetadata} from "../src/components/sptb/SptbPrintDocument";
import type {Transaksi} from "../src/types";

const trx:Transaksi={
 id:"test",nomorKuitansi:"KUI-TEST",nomorSPTB:"SPTB/PNBP/BBPKAIV/11/84",
 tanggalKuitansi:"2026-11-06",sumberDana:"PNBP",jenisKuitansi:"jasa_profesi",
 kegiatan:"Latsar CPNS",kodeAkun:"522151",namaAkun:"Belanja Jasa",uraian:"Pembinaan Sikap Perilaku",
 ringkasanPenerima:"Penerima Uji",penerimaList:[
  {id:"a",nama:"Penerima A",uraianItem:"Pembinaan pada 20 April 2026",volume:1,satuan:"OJ",tarifSatuan:400000,bruto:400000,ppnRate:0,ppnNominal:0,pphRate:5,pphNominal:20000,netto:380000},
  {id:"b",nama:"Penerima B",uraianItem:"Pembinaan pada 5 Mei 2026",volume:1,satuan:"OJ",tarifSatuan:200000,bruto:200000,ppnRate:0,ppnNominal:0,pphRate:5,pphNominal:10000,netto:190000},
  {id:"c",nama:"Penerima C",uraianItem:"Pembinaan pada 16 Mei 2026",volume:1,satuan:"OJ",tarifSatuan:400000,bruto:400000,ppnRate:0,ppnNominal:0,pphRate:5,pphNominal:20000,netto:380000}
 ],totalBruto:1000000,totalPPN:0,totalPPh:50000,totalNetto:950000,
 status:"Final",sudahSakti:false,ppkNama:"PPK Uji",ppkNip:"123",bendaharaNama:"Bendahara Uji",bendaharaNip:"456",
 createdAt:"",updatedAt:""
};
const metadata:SptbPrintMetadata={
 kodeSatker:"027177",tanggalNomorDipa:"1 Desember 2025 No. 010.12.2.027177/2026",
 klasifikasiAnggaran:"6144.FAC.009.052.0W.522151",kota:"Makassar",tanggalTtd:"2026-11-06",
 ppkNama:"PPK Uji",ppkNip:"123",bendaharaNama:"Bendahara Uji",bendaharaNip:"456"
};
describe("Format SPTB sesuai gambar referensi",()=>{
 it("menampilkan empat identitas satker, nomor dan paragraf pertanggungjawaban",()=>{
  const html=renderToStaticMarkup(React.createElement(SptbPrintDocument,{trx,metadata}));
  for(const part of ["SURAT PERNYATAAN TANGGUNG JAWAB BELANJA","SPTB/PNBP/BBPKAIV/11/84",
   "Kode Satuan Kerja","027177","Nama Satuan Kerja","Tanggal/No. DIPA",
   "Klasifikasi Anggaran","6144.FAC.009.052.0W.522151","Kuasa Pengguna Anggaran",
   "Bukti-bukti pengeluaran anggaran","Demikian Surat Pernyataan ini dibuat dengan sebenarnya."]){
    expect(html).toContain(part);
   }
  expect(html).not.toContain("KEMENTERIAN PERDAGANGAN");
 });
 it("membentuk grup tabel Bukti dan PPN/PPh dengan jumlah bruto, bukan netto",()=>{
  const html=renderToStaticMarkup(React.createElement(SptbPrintDocument,{trx,metadata}));
  expect(html).toContain('colSpan="2"');expect(html).toContain("Bukti");
  expect(html).toContain("PPN");expect(html).toContain("PPh");
  expect(html).toContain("Rp 1.000.000");expect(html).toContain("Rp 50.000");
  expect(html).toContain("Penerima A");expect(html).toContain("Penerima B");expect(html).toContain("Penerima C");
  expect(html).not.toContain("Rp 950.000");
 });
 it("menggunakan nama PPK dan Bendahara dari dokumen, tanpa contoh yang di-hardcode",()=>{
  const html=renderToStaticMarkup(React.createElement(SptbPrintDocument,{trx,metadata}));
  expect(html).toContain("PPK Uji");expect(html).toContain("Bendahara Uji");
  expect(html).toContain("Makassar, 6 November 2026");
  const blank={...metadata,tanggalNomorDipa:"",klasifikasiAnggaran:""};
  const other=renderToStaticMarkup(React.createElement(SptbPrintDocument,{trx,metadata:blank}));
  expect(other).not.toContain("010.12.2.027177/2026");
 });
});
