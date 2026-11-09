import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";

const sptb = readFileSync("src/components/modals/SptbPrintModal.tsx", "utf8");
const kuitansi = readFileSync("src/components/modals/KuitansiPrintModal.tsx", "utf8");
const standalone = readFileSync("src/components/kuitansi/PrintStandaloneView.tsx", "utf8");

describe("Identitas surat keuangan BBPKA PDN IV", () => {
  it("menggunakan Kementerian Dalam Negeri dan identitas satker yang konsisten", () => {
    expect(sptb).toContain("KEMENTERIAN DALAM NEGERI REPUBLIK INDONESIA");
    expect(sptb).toContain("BALAI BESAR PENGEMBANGAN KOMPETENSI APARATUR PEMERINTAHAN DALAM NEGERI IV");
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
    expect(sptb).toContain("Makassar, {formatTanggalIndo");
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
