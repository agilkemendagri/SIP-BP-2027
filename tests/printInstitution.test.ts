import {isCollectiveReceipt} from "../src/utils/receiptKind";
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";

const sptb = readFileSync("src/components/sptb/SptbPrintDocument.tsx", "utf8");
const sptbModal = readFileSync("src/components/modals/SptbPrintModal.tsx", "utf8");
const kuitansi = readFileSync("src/components/modals/KuitansiPrintModal.tsx", "utf8");
const standalone = readFileSync("src/components/kuitansi/PrintStandaloneView.tsx", "utf8");

describe("Identitas surat keuangan BBPKA PDN IV", () => {
  it("menggunakan identitas satker di SPTB dan kuitansi tanpa kop lama", () => {
    expect(sptb).toContain("Balai Besar Pengembangan Kompetensi Aparatur Pemerintahan Dalam Negeri IV");
    expect(sptb).toContain("SURAT PERNYATAAN TANGGUNG JAWAB BELANJA");
    expect(kuitansi).toContain("Balai Besar Pengembangan Kompetensi Aparatur Pemerintahan Dalam Negeri IV");
    for (const source of [sptb,kuitansi]) {
      expect(source).not.toContain("KEMENTERIAN PERDAGANGAN");
      expect(source).not.toContain("Pengawasan Keuangan dan Aset Perdagangan");
      expect(source).not.toContain("Jakarta Pusat 10570");
    }
  });
  it("tidak mencetak nomor satker atau alamat tak terverifikasi", () => {
    expect(sptb).not.toContain("BBPKA PDN IV (411892)");
    expect(sptb).not.toContain("Jakarta, {formatTanggalIndo");
    expect(sptbModal).toContain("kota:'Makassar'");
  });
});

describe("Buka di Tab Baru tanpa kehilangan sesi cetak", () => {
  it("membolehkan clone sessionStorage hanya pada tab cetak same-origin dan melepaskan opener", () => {
    expect(kuitansi).toContain('href={`?print=true&mode=print&id=${trx.id}`}');
    expect(kuitansi).toContain('rel="opener"');
    expect(kuitansi).toContain("onClick={preparePrintData}");
    expect(standalone).toContain("if (window.opener) window.opener = null;");
    expect(standalone).toContain("const rows = await fetchFinancialTransactions()");
  });
});

describe("Klasifikasi cetak individual vs kolektif",()=>{
  it("dua sesi untuk satu nama tetap individual",()=>{
    expect(isCollectiveReceipt([{nama:"Pegawai Uji"},{nama:"Pegawai Uji"}])).toBe(false);
  });
  it("dua penerima berbeda adalah kolektif",()=>{
    expect(isCollectiveReceipt([{nama:"Pegawai Satu"},{nama:"Pegawai Dua"}])).toBe(true);
  });
  it("satu penerima selalu individual",()=>{
    expect(isCollectiveReceipt([{nama:"Pegawai Uji"}])).toBe(false);
  });
});
