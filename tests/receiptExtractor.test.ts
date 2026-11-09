import {describe,it,expect} from "bun:test";
import {parseIdr,parseReceiptText} from "../src/utils/receiptExtractor";
import {readFileSync} from "node:fs";

describe("Ekstraktor kuitansi luar SIP-BP",()=>{
 it("membaca nominal Indonesia dengan ribuan dan koma",()=>{
  expect(parseIdr("Rp 400.000")).toBe(400000);
  expect(parseIdr("1.000.000")).toBe(1000000);
  expect(parseIdr("950.000,50")).toBe(950000.5);
 });
 it("mengurai tiga baris kuitansi kolektif sesuai contoh tanpa memasukkan data permanen",()=>{
  const sample=`TANDA TERIMA
Sudah terima dari Pejabat Pembuat Komitmen Satker BBPK APDN IV:
No Nama Untuk Pembayaran JP @Rp Bruto Pph Netto Tanda Tangan
1 Ryan Novryanto, S. Tr.IP Honor Pembinaan Sikap Perilaku 20 April 2026 pada Latsar CPNS Angkatan XXXIX 2 200.000 400.000 20.000 380.000
2 Ryan Novryanto, S. Tr.IP Honor Pembinaan Sikap Perilaku 5 Mei 2026 pada Latsar CPNS Angkatan XXXIX 1 200.000 200.000 10.000 190.000
3 Ryan Novryanto, S. Tr.IP Honor Pembinaan Sikap Perilaku 16 Mei 2026 pada Latsar CPNS Angkatan XXXIX 2 200.000 400.000 20.000 380.000
JUMLAH 1.000.000 50.000 950.000
Makassar, 6 November 2026
`;
  const found=parseReceiptText(sample);
  expect(found.rows).toHaveLength(3);
  expect(found.rows.map(r=>r.bruto)).toEqual([400000,200000,400000]);
  expect(found.rows.map(r=>r.pphNominal)).toEqual([20000,10000,20000]);
  expect(found.rows.map(r=>r.netto)).toEqual([380000,190000,380000]);
  expect(found.tanggalKuitansi).toBe("2026-11-06");
  expect(found.totalBruto).toBe(1000000);
  expect(found.totalPPh).toBe(50000);
  expect(found.totalNetto).toBe(950000);
 });
 it("memperingatkan saat rincian tidak terbaca dan tidak mengarang kode akun",()=>{
  const parsed=parseReceiptText("TANDA TERIMA\nJumlah Rp 750.000");
  expect(parsed.rows).toHaveLength(0);
  expect(parsed.kodeAkun).toBe("");
  expect(parsed.warnings.some(s=>s.includes("tidak terbaca"))).toBe(true);
 });
 it("mengurai PDF kuitansi jasa profesi individual Hamzah (3 JP, Rp 200,000)",()=>{
  const sample=[
"BALAI BESAR PENGEMBANGAN KOMPETENSI",
"APARATUR PEMERINTAHAN DALAM NEGERI IV",
"TANDA TERIMA",
"Sudah terima dari : Pejabat Pembuat Komitmen Satker Balai Besar Pengembangan Kompetensi Aparatur",
"Pemerintahan Dalam Negeri IV",
"Banyaknya Uang : Enam Ratus Ribu Rupiah",
"Untuk Pembayaran : Honor pemateri pembekalan STULA 6 Agustus pada PKA Akt. III sesuai realisasi",
"mengajar terlampir dengan rincian:",
"Jumlah honor : 3 JP x @Rp. 200,000 Rp 600,000",
"Potong PPH. 15% Rp 90,000",
"Bersih diterima Rp 510,000",
"Makassar, 1 September 2026",
"Yang menerima,",
"Jumlah : Rp. 600,000",
"Hamzah, S.Sos., MM.",
"Setuju Dibayar :",
"a.n. Kuasa Pengguna Anggaran",
"Pejabat Pembuat Komitmen Bendahara Pengeluaran Pembantu",
"BBPK APDN IV PNBP"
  ].join("\n");
  const found=parseReceiptText(sample);
  expect(found.documentKind).toBe("individual");
  expect(found.rows).toHaveLength(1);
  expect(found.rows[0].nama).toContain("Hamzah");
  expect(found.rows[0].uraianItem).toContain("Honor pemateri pembekalan STULA");
  expect(found.rows[0].volume).toBe(3);
  expect(found.rows[0].satuan).toBe("JP");
  expect(found.rows[0].tarifSatuan).toBe(200000);
  expect(found.rows[0].bruto).toBe(600000);
  expect(found.rows[0].pphNominal).toBe(90000);
  expect(found.rows[0].netto).toBe(510000);
  expect(found.tanggalKuitansi).toBe("2026-09-01");
  expect(found.suggestedSource).toBe("PNBP");
  expect(found.kodeAkun).toBe("");
  expect(found.warnings.some(w=>w.includes("Kode akun"))).toBe(true);
 });
 it("tidak mengarang nilai bila jumlah honor atau netto tidak terbaca",()=>{
  const incomplete=["TANDA TERIMA","Banyaknya Uang : Enam Ratus Ribu Rupiah",
   "Untuk Pembayaran : Honor pemateri","Yang menerima,","PENERIMA UJI"].join("\n");
  const found=parseReceiptText(incomplete);
  expect(found.documentKind).toBe("unknown");
  expect(found.rows).toHaveLength(0);
 });
 it("mendukung pemisah ribuan koma tanpa mengubah desimal Indonesia",()=>{
  expect(parseIdr("200,000")).toBe(200000);
  expect(parseIdr("Rp. 600,000")).toBe(600000);
  expect(parseIdr("950.000,50")).toBe(950000.5);
  expect(parseIdr("1,000,000")).toBe(1000000);
 });
 it("PDF gambar diproses terisolasi dan tidak mengunggah berkas ke server keuangan",()=>{
  const ocr=readFileSync("public/ocr-engine.html","utf8");
  const view=readFileSync("src/components/kuitansi/KuitansiExtractorView.tsx","utf8");
  expect(ocr).toContain('event.source!==parent');
  expect(view).toContain('sandbox="allow-scripts"');
  expect(view).toContain("status:'Draft'");
  expect(view).toContain("await addTransaksi(");
  expect(view).toContain("window.confirm(");
  expect(view).toContain("maxBytes=12*1024*1024");
  expect(view).not.toContain("service_role");
 });
});
