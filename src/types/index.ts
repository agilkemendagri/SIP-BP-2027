/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'bendahara' | 'bpp_rm' | 'bpp_pnbp';

export type SumberDana = 'RM' | 'PNBP';

export type StatusTransaksi = 'Draft' | 'Final';

export type StatusSakti = 'Belum' | 'Sudah';

export type KuitansiType = 'jasa_profesi' | 'perjadin_luar_kota' | 'perjadin_dalam_kota';

export interface PenerimaItem {
  id: string;
  nama: string;
  nip?: string;
  golongan?: string;
  jabatan?: string;
  uraianItem: string;
  volume: number;
  satuan: string; // e.g. 'OJ', 'OK', 'Hari', 'Org/Hari', 'Paket'
  tarifSatuan: number;
  bruto: number;
  ppnRate: number; // in percentage e.g. 0, 11
  ppnNominal: number;
  pphRate: number; // in percentage e.g. 0, 5, 15, 2
  pphNominal: number;
  netto: number;
  npwp?: string;
  rekening?: string;
  bank?: string;
}

export interface Transaksi {
  id: string;
  nomorKuitansi: string; // format: KUI/RM/2026/03/001
  nomorSPTB: string; // format: SPTB/RM/BBPKAIV/03/001 atau SPTB/PNBP/BBPKAIV/03/002
  tanggalKuitansi: string; // YYYY-MM-DD
  sumberDana: SumberDana; // 'RM' | 'PNBP'
  jenisKuitansi: KuitansiType;
  kegiatan: string;
  kodeAkun: string; // 6 digit
  namaAkun: string;
  uraian: string;
  ringkasanPenerima: string;
  penerimaList: PenerimaItem[];
  totalBruto: number;
  totalPPN: number;
  totalPPh: number;
  totalNetto: number;
  status: StatusTransaksi;
  sudahSakti: boolean;
  tanggalSakti?: string;
  ppkNama: string;
  ppkNip: string;
  bendaharaNama: string;
  bendaharaNip: string;
  // Metadata tambahan perjadin jika ada
  suratTugasNomor?: string;
  tanggalTugas?: string;
  kotaAsal?: string;
  kotaTujuan?: string;
  nomorSPPD?: string;
  tanggalSPPD?: string;
  sudahDibayarSemula?: number;
  keteranganBiaya?: string[];
  kotaTandaTangan?: string;
  tanggalTandaTangan?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSimulasi {
  id: string;
  nama: string;
  nip: string;
  jabatan: string;
  peran: Role;
  sumberDanaAkses: 'SEMUA' | 'RM' | 'PNBP';
  statusAktif: boolean;
  email: string;
}

export interface AkunBelanja {
  kode: string;
  nama: string;
  kategori: string;
}
