import { describe, it, expect } from "bun:test";
import { csvEscapeCell, terbilang, formatTanggalIndo } from "../src/utils/formatters.ts";

describe("CSV export keamanan dan kompatibilitas Excel", () => {
  it("mencegah formula yang disisipkan lewat nama penerima", () => {
    expect(csvEscapeCell("=HYPERLINK(\"https://example.invalid\")")).toStartWith("\"'=");
    expect(csvEscapeCell("+SUM(1,2)")).toBe("\"'+SUM(1,2)\"");
    expect(csvEscapeCell("-2+3")).toBe("\"'-2+3\"");
    expect(csvEscapeCell("@SUM(1)")).toBe("\"'@SUM(1)\"");
    expect(csvEscapeCell(" \t=1+2")).toStartWith("\"' ");
  });
  it("menjaga nilai numeric dan teks biasa", () => {
    expect(csvEscapeCell(950000)).toBe("\"950000\"");
    expect(csvEscapeCell("Pegawai Uji Coba")).toBe("\"Pegawai Uji Coba\"");
    expect(csvEscapeCell('Nama "Alias"')).toBe('\"Nama ""Alias""\"');
  });
});

describe("format kuitansi", () => {
  it("terbilang bekerja pada nominal contoh", () => {
    expect(terbilang(950000)).toBe("Sembilan Ratus Lima Puluh Ribu Rupiah");
    expect(terbilang(0)).toBe("Nol Rupiah");
  });
  it("mengubah tanggal ISO menjadi format Indonesia", () => {
    expect(formatTanggalIndo("2026-11-10")).toBe("10 November 2026");
  });
});
