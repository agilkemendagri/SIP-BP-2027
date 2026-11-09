/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { formatNumberCommas, terbilang } from '../../../utils/formatters';

export interface SesiItemIndividual {
  id: string;
  uraianSesi: string;
  volume: number;
  satuan: string;
  tarifSatuan: number;
  subtotal: number;
}

export interface TandaTerimaIndividualProps {
  namaInstansiPanjang?: string;
  namaInstansiPendek?: string;
  namaPenerima: string;
  nipPenerima?: string;
  golonganPenerima?: string;
  uraianKegiatan: string;
  sumberDana: 'RM' | 'PNBP';
  kota: string;
  tanggalIndo: string;
  ppkNama: string;
  ppkNip: string;
  bppNama: string;
  bppNip: string;
  sesiList: SesiItemIndividual[];
  totalBruto: number;
  pphRate: number;
  pphNominal: number;
  totalNetto: number;
}

export const TandaTerimaIndividual: React.FC<TandaTerimaIndividualProps> = ({
  namaInstansiPanjang = 'Balai Besar Pengembangan Kompetensi Aparatur Pemerintahan Dalam Negeri IV',
  namaInstansiPendek = 'BBPK APDN IV',
  namaPenerima,
  uraianKegiatan,
  sumberDana,
  kota = 'Makassar',
  tanggalIndo,
  ppkNama,
  ppkNip,
  bppNama,
  bppNip,
  sesiList,
  totalBruto,
  pphRate,
  pphNominal,
  totalNetto,
}) => {
  const isMultiSession = sesiList.length > 1;
  const singleSession = sesiList[0] || {
    volume: 3,
    satuan: 'JP',
    tarifSatuan: 200000,
    subtotal: 600000,
  };

  return (
    <div className="w-full bg-white text-black font-sans text-[12px] leading-relaxed p-6 sm:p-10 max-w-[210mm] mx-auto box-border print:p-0 print:m-0 print:max-w-none print:w-full">
      {/* 1. KOP INSTANSI & DIBUKUKAN BOX */}
      <div className="flex justify-between items-start mb-6">
        {/* Kop Kiri Atas */}
        <div className="font-bold text-[12px] uppercase leading-tight tracking-tight text-black max-w-sm">
          BALAI BESAR PENGEMBANGAN KOMPETENSI<br />
          APARATUR PEMERINTAHAN DALAM NEGERI IV
        </div>

        {/* Box Kanan Atas: Dibukukan No. & Tanggal (Empty as in reference PDF) */}
        <div className="border border-black w-48 text-[11px] leading-tight">
          <div className="px-2.5 py-1 border-b border-black">
            Dibukukan No. :
          </div>
          <div className="px-2.5 py-1">
            Tanggal &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:
          </div>
        </div>
      </div>

      {/* 2. JUDUL TANDA TERIMA */}
      <div className="text-center my-6">
        <h1 className="text-[16px] font-bold underline uppercase tracking-wider text-black">
          TANDA TERIMA
        </h1>
      </div>

      {/* 3. FIELD UTAMA */}
      <div className="space-y-3.5 mb-6 text-[12px]">
        {/* Sudah terima dari */}
        <div className="flex items-start">
          <span className="w-36 shrink-0 text-black">Sudah terima dari</span>
          <span className="mr-2">:</span>
          <span className="flex-1 text-black font-normal">
            Pejabat Pembuat Komitmen Satker {namaInstansiPanjang}
          </span>
        </div>

        {/* Banyaknya Uang (TERBILANG NILAI BRUTO SESUAI PDF REFERENSI) */}
        <div className="flex items-start">
          <span className="w-36 shrink-0 text-black">Banyaknya Uang</span>
          <span className="mr-2">:</span>
          <span className="flex-1 font-bold capitalize text-black">
            {terbilang(totalBruto).replace(/\s+rupiah/i, '')} Rupiah
          </span>
        </div>

        {/* Untuk Pembayaran */}
        <div className="flex items-start">
          <span className="w-36 shrink-0 text-black">Untuk Pembayaran</span>
          <span className="mr-2">:</span>
          <span className="flex-1 text-black">
            {uraianKegiatan} sesuai realisasi mengajar terlampir dengan rincian:
          </span>
        </div>
      </div>

      {/* 4. RINCIAN HONORARIUM */}
      <div className="pl-36 mb-6 text-[12px]">
        {!isMultiSession ? (
          // Single Session Layout (PERSIS REFERENSI PDF 1)
          <div className="space-y-1.5 max-w-md">
            <div className="flex justify-between items-center">
              <span className="w-28 text-black">Jumlah honor :</span>
              <span className="w-32 text-center text-black">
                {singleSession.volume} {singleSession.satuan} x @Rp. {formatNumberCommas(singleSession.tarifSatuan)}
              </span>
              <span className="w-8 text-right text-black">Rp</span>
              <span className="w-24 text-right font-mono font-medium tabular-nums text-black">
                {formatNumberCommas(singleSession.subtotal)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="w-28 text-black">Potong PPH.</span>
              <span className="w-32 text-left pl-3 text-black">
                {pphRate}%
              </span>
              <span className="w-8 text-right text-black">Rp</span>
              <span className="w-24 text-right font-mono font-medium tabular-nums text-black">
                {formatNumberCommas(pphNominal)}
              </span>
            </div>

            <div className="flex justify-between items-center pt-0.5">
              <span className="w-28 text-black font-medium">Bersih diterima</span>
              <span className="w-32"></span>
              <span className="w-8 text-right font-bold text-black">Rp</span>
              <span className="w-24 text-right font-mono font-bold tabular-nums text-black">
                {formatNumberCommas(totalNetto)}
              </span>
            </div>
          </div>
        ) : (
          // Multi-session Layout (Mendukung beberapa sesi pada penerima yang sama)
          <div className="space-y-1.5 max-w-lg">
            <div className="font-semibold text-black mb-1">Jumlah honor :</div>
            {sesiList.map((s, idx) => (
              <div key={s.id || idx} className="flex justify-between items-center pl-2 text-[11px]">
                <span className="flex-1 truncate mr-2 text-black">
                  • {s.uraianSesi}
                </span>
                <span className="w-28 text-right text-black">
                  {s.volume} {s.satuan} x @Rp. {formatNumberCommas(s.tarifSatuan)}
                </span>
                <span className="w-6 text-right text-black">Rp</span>
                <span className="w-20 text-right font-mono tabular-nums text-black">
                  {formatNumberCommas(s.subtotal)}
                </span>
              </div>
            ))}

            <div className="border-t border-black/40 pt-1 mt-1 flex justify-between items-center">
              <span className="w-36 text-black font-semibold">Total Honor (Bruto)</span>
              <span className="flex-1"></span>
              <span className="w-8 text-right font-semibold text-black">Rp</span>
              <span className="w-24 text-right font-mono font-semibold tabular-nums text-black">
                {formatNumberCommas(totalBruto)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="w-36 text-black">Potong PPH. ({pphRate}%)</span>
              <span className="flex-1"></span>
              <span className="w-8 text-right text-black">Rp</span>
              <span className="w-24 text-right font-mono tabular-nums text-black">
                {formatNumberCommas(pphNominal)}
              </span>
            </div>

            <div className="flex justify-between items-center font-bold">
              <span className="w-36 text-black">Bersih diterima</span>
              <span className="flex-1"></span>
              <span className="w-8 text-right text-black">Rp</span>
              <span className="w-24 text-right font-mono font-bold tabular-nums text-black">
                {formatNumberCommas(totalNetto)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 5. BOX JUMLAH (NILAI BRUTO) & TANDA TANGAN PENERIMA */}
      <div className="flex justify-between items-start mb-6">
        {/* Box Jumlah Bruto (PERSIS REFERENSI PDF 1: BORDER KOTAK DAN NILAI BRUTO) */}
        <div className="border-2 border-black px-4 py-1.5 flex items-center gap-4 text-[13px] font-bold">
          <span className="text-black">Jumlah :</span>
          <span className="font-mono text-black tabular-nums">
            Rp. {formatNumberCommas(totalBruto)}
          </span>
        </div>

        {/* Tanggal & Penerima (Kanan) */}
        <div className="text-center w-64 pr-2">
          <div className="text-black text-[12px] mb-1">
            {kota}, {tanggalIndo}
          </div>
          <div className="text-black text-[12px] mb-16">
            Yang menerima,
          </div>
          <div className="font-bold underline text-black text-[12px]">
            {namaPenerima}
          </div>
        </div>
      </div>

      {/* 6. GARIS PEMISAH TEBAL HITAM */}
      <div className="border-t-2 border-black w-full my-6"></div>

      {/* 7. BLOK TANDA TANGAN PEJABAT (SETUJU DIBAYAR PPK & BPP) */}
      <div className="flex justify-between items-start pt-1 text-[12px]">
        {/* Kolom Kiri: PPK */}
        <div className="text-center w-64">
          <div className="text-black leading-tight mb-16">
            <div>Setuju Dibayar :</div>
            <div>a.n. Kuasa Pengguna Anggaran</div>
            <div>Pejabat Pembuat Komitmen</div>
            <div className="font-bold">{namaInstansiPendek}</div>
          </div>
          <div className="font-bold underline text-black text-[12px]">
            {ppkNama}
          </div>
          <div className="text-[11px] font-mono text-black">
            NIP. {ppkNip}
          </div>
        </div>

        {/* Kolom Kanan: BPP */}
        <div className="text-center w-64">
          <div className="text-black leading-tight mb-16">
            <div>Bendahara Pengeluaran Pembantu</div>
            <div className="font-bold">{sumberDana === 'PNBP' ? 'PNBP' : 'Rupiah Murni'}</div>
            <div className="invisible">&nbsp;</div>
            <div className="invisible">&nbsp;</div>
          </div>
          <div className="font-bold underline text-black text-[12px]">
            {bppNama}
          </div>
          <div className="text-[11px] font-mono text-black">
            NIP. {bppNip}
          </div>
        </div>
      </div>
    </div>
  );
};
