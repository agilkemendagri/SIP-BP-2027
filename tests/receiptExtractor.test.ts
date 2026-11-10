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

 it("mengurai enam rincian SPPD, 30% penginapan, dan mendeteksi selisih tahun tanggal",()=>{
  // Data contoh dianonimkan agar identitas pegawai tidak masuk repositori publik.
  const sample=[
   "Lampiran SPPD Nomor : 0741/SPD/BBPKAPDN-IV/2026",
   "Tanggal : 14 Oktober 2026",
   "NO PERINCIAN BIAYA JUMLAH KETERANGAN",
   "1 Uang harian 3 Hari x @.Rp. 530,000 Rp 1,590,000",
   "2 Biaya Penginapan 1 Hari x @.Rp. 1,380,363 Rp 1,380,363",
   "3 Biaya Penginapan 1 Hari x @.Rp. 2,084,000 30% Rp 625,200",
   "4 Biaya Tiket Pesawat CGK-UPG Rp 2,851,120",
   "5 Uang Representatif 3 Hari x @.Rp. 150,000 Rp 450,000",
   "6 Biaya Transport Lumpsum Rp 431,000 CGK-UPG",
   "JUMLAH Rp. 7,327,683",
   "Makassar, 21 Oktober 2025",
   "Telah dibayar sejumlah Telah menerima jumlah uang sebesar",
   "Rp 7,327,683 Rp7,327,683",
   "Bendahara Pengeluaran Yang Menerima",
   "Bendahara Uji, S.E.                         Pegawai Penerima, S.Sos., M.AP.",
   "NIP. 111111111111111111                      NIP.222222222222222222",
   "PERHITUNGAN SPPD RAMPUNG",
   "Ditetapkan sejumlah Rp. 7,327,683",
   "Yang telah dibayar semula Rp. 7,327,683",
   "Sisa Kurang/Lebih Rp. -"
  ].join("\n");
  const parsed=parseReceiptText(sample);
  expect(parsed.documentKind).toBe("travel");
  expect(parsed.suggestedType).toBe("perjadin_luar_kota");
  expect(parsed.rows).toHaveLength(6);
  expect(parsed.rows.map(r=>r.bruto)).toEqual([1590000,1380363,625200,2851120,450000,431000]);
  expect(parsed.rows.reduce((n,r)=>n+r.bruto,0)).toBe(7327683);
  expect(parsed.rows[2].uraianItem).toContain("30% dari tarif 2.084.000");
  expect(parsed.rows[2].tarifSatuan).toBe(625200); // actual paid amount, not 2,084,000
  expect(parsed.rows[0].volume).toBe(3);
  expect(parsed.rows[0].tarifSatuan).toBe(530000);
  expect(parsed.rows[0].satuan.toLowerCase()).toBe("hari");
  expect(parsed.rows[0].nama).toContain("Pegawai Penerima");
  expect(parsed.recipientNip).toBe("222222222222222222");
  expect(parsed.rows[0].nip).toBe(parsed.recipientNip);
  expect(parsed.nomorAsal).toBe("0741/SPD/BBPKAPDN-IV/2026");
  expect(parsed.documentDate).toBe("2026-10-14");
  expect(parsed.signatureDate).toBe("2025-10-21");
  expect(parsed.tanggalKuitansi).toBe(""); // do not silently choose conflicting year
  expect(parsed.totalBruto).toBe(7327683);
  expect(parsed.totalNetto).toBe(7327683);
  expect(parsed.warnings.some(s=>s.includes("PERBEDAAN TAHUN"))).toBe(true);
  expect(parsed.kodeAkun).toBe("");
 });
 it("menolak klaim jumlah SPPD yang tidak sesuai dan menampilkan warning",()=>{
  const sample=[
   "Lampiran SPPD Nomor : 111/SPD/UJI/2026",
   "Tanggal : 14 Oktober 2026",
   "NO PERINCIAN BIAYA JUMLAH KETERANGAN",
   "1 Uang harian 3 Hari x @.Rp. 530,000 Rp 1,590,000",
   "JUMLAH Rp. 1,000,000",
   "Makassar, 21 Oktober 2026",
   "Bendahara Pengeluaran Yang Menerima",
   "Bendahara Uji                    Pegawai Uji"
  ].join("\n");
  const parsed=parseReceiptText(sample);
  expect(parsed.documentKind).toBe("travel");
  expect(parsed.rows).toHaveLength(1);
  expect(parsed.warnings.some(s=>s.includes("berbeda dengan penjumlahan"))).toBe(true);
 });
 it("tidak menyamakan SPPD dengan kolektif honorarium",()=>{
  const found=parseReceiptText("NO PERINCIAN BIAYA\n1 Uang harian Rp 1,000,000\nJUMLAH Rp 1,000,000");
  expect(found.documentKind).not.toBe("travel"); // missing SPPD identifier
 });

 it("mengurai Daftar Penerimaan perjadin dalam kota 3 pegawai tanpa mengubah ke luar kota",()=>{
  const input=[
   "DAFTAR PENERIMAAN",
   "Perjalanan dinas dalam kota dalam rangka koordinasi proses permohonan penambahan pagu anggaran PNBP selama",
   "1 hari pada tanggal 15 Oktober 2026 di Kanwil DJPb Sulsel, GKN, Makassar",
   "TANGGAL",
   "NO NAMA PELAKSANAAN OH Hari Jumlah TANDA TANGAN",
   "1 Pegawai Contoh Satu, S.Sos.,          15 Oktober",
   "                                           170,000     1      170,000",
   "   M.M.                                    2026",
   "2 Pegawai Contoh Dua,                  15 Oktober",
   "                                           170,000     1      170,000",
   "   S.STP., M.Si.                           2026",
   "3 Pegawai Contoh Tiga, S.IP., M.Si.     170,000     1      170,000",
   "                                        15 Oktober",
   "                                           2026",
   "JUMLAH                               510,000",
   "Makassar, 18 Oktober 2026",
   "Setuju Dibayar",
   "Pejabat Pembuat Komitmen         Bendahara Pengeluaran Pembantu",
   "PPSDM Kemendagri Regional Makassar     PNBP"
  ].join("\n");
  const parsed=parseReceiptText(input);
  expect(parsed.documentKind).toBe("travel");
  expect(parsed.suggestedType).toBe("perjadin_dalam_kota");
  expect(parsed.suggestedSource).toBe("PNBP");
  expect(parsed.rows).toHaveLength(3);
  expect(parsed.rows.map(x=>x.nama)).toEqual([
   "Pegawai Contoh Satu, S.Sos., M.M.",
   "Pegawai Contoh Dua, S.STP., M.Si.",
   "Pegawai Contoh Tiga, S.IP., M.Si."
  ]);
  expect(parsed.rows.map(x=>x.bruto)).toEqual([170000,170000,170000]);
  expect(parsed.rows.map(x=>x.volume)).toEqual([1,1,1]);
  expect(parsed.rows.map(x=>x.tarifSatuan)).toEqual([170000,170000,170000]);
  expect(parsed.rows.every(x=>x.satuan==="Hari")).toBe(true);
  expect(parsed.documentDate).toBe("2026-10-15");
  expect(parsed.signatureDate).toBe("2026-10-18");
  expect(parsed.tanggalKuitansi).toBe("2026-10-18");
  expect(parsed.totalBruto).toBe(510000);
  expect(parsed.totalNetto).toBe(510000);
  expect(parsed.kodeAkun).toBe("");
  expect(parsed.warnings.some(x=>x.includes("Pajak tidak dirinci"))).toBe(true);
  expect(parsed.kegiatan).toContain("koordinasi proses permohonan penambahan pagu anggaran");
 });
 it("memperingatkan ketidaksesuaian total daftar penerimaan dalam kota",()=>{
  const input=[
    "DAFTAR PENERIMAAN",
    "Perjalanan dinas dalam kota dalam rangka rapat pada tanggal 15 Oktober 2026",
    "TANGGAL",
    "NO NAMA PELAKSANAAN OH Hari Jumlah",
    "1 Pegawai Uji Satu 15 Oktober 2026 170,000 1 170,000",
    "JUMLAH 200,000",
    "Makassar, 18 Oktober 2026"
  ].join("\n");
  const p=parseReceiptText(input);
  expect(p.suggestedType).toBe("perjadin_dalam_kota");
  expect(p.warnings.some(x=>x.includes("berbeda dari jumlah rincian"))).toBe(true);
 });
 it("tidak mengklasifikasi daftar honorarium non-perjadin sebagai perjalanan dalam kota",()=>{
  const input="DAFTAR PENERIMAAN\nHonorarium pegawai\n1 Penerima Uji 170,000 1 170,000\nJUMLAH 170,000";
  expect(parseReceiptText(input).suggestedType).not.toBe("perjadin_dalam_kota");
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
