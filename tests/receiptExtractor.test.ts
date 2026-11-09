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
