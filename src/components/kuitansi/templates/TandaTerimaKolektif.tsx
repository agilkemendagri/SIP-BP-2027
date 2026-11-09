/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { formatNumberCommas } from '../../../utils/formatters';

export interface PenerimaKolektifRow {
  id: string;
  nama: string;
  untukPembayaran: string;
  jp: number;
  tarifSatuan: number;
  bruto: number;
  pph: number;
  netto: number;
}

export interface TandaTerimaKolektifProps {
  namaInstansiPanjang?: string;
  namaInstansiPendek?: string;
  sumberDana: 'RM' | 'PNBP';
  kota: string;
  tanggalIndo: string;
  ppkNama: string;
  ppkNip: string;
  bppNama: string;
  bppNip: string;
  rows: PenerimaKolektifRow[];
  totalBruto: number;
  totalPPh: number;
  totalNetto: number;
}

export const TandaTerimaKolektif: React.FC<TandaTerimaKolektifProps> = ({
  namaInstansiPendek = 'BBPK APDN IV',
  sumberDana,
  kota = 'Makassar',
  tanggalIndo,
  ppkNama,
  ppkNip,
  bppNama,
  bppNip,
  rows,
  totalBruto,
  totalPPh,
  totalNetto,
}) => {
  return (
    <div className="w-full bg-white text-black font-sans text-[11px] leading-tight p-6 sm:p-10 max-w-[297mm] mx-auto box-border print:p-0 print:m-0 print:max-w-none print:w-full">
      {/* 1. KOP TENGAH ATAS */}
      <div className="text-center font-bold text-[12px] uppercase leading-tight tracking-tight text-black mb-4">
        BALAI BESAR PENGEMBANGAN KOMPETENSI<br />
        APARATUR PEMERINTAHAN DALAM NEGERI IV
      </div>

      {/* 2. JUDUL TANDA TERIMA */}
      <div className="text-center my-3">
        <h1 className="text-[15px] font-bold underline uppercase tracking-wider text-black">
          TANDA TERIMA
        </h1>
      </div>

      {/* 3. KALIMAT PEMBUKA */}
      <div className="font-bold text-[12px] text-black mb-3">
        Sudah terima dari Pejabat Pembuat Komitmen Satker {namaInstansiPendek}:
      </div>

      {/* 4. TABEL DENGAN KOLOM PERSIS SESUAI REFERENSI PDF 2:
             No | Nama | Untuk Pembayaran | JP | @Rp | Bruto | Pph | Netto | Tanda Tangan */}
      <div className="w-full mb-6">
        <table className="w-full border-collapse border border-black text-[10px] sm:text-[11px]">
          <thead>
            <tr className="bg-transparent text-black font-bold border-b border-black text-center">
              <th className="border border-black py-2 px-1 w-8">No</th>
              <th className="border border-black py-2 px-2 min-w-[130px]">Nama</th>
              <th className="border border-black py-2 px-2 min-w-[200px]">Untuk Pembayaran</th>
              <th className="border border-black py-2 px-1 w-9">JP</th>
              <th className="border border-black py-2 px-2 w-16 text-center">@Rp</th>
              <th className="border border-black py-2 px-2 w-20 text-center">Bruto</th>
              <th className="border border-black py-2 px-2 w-16 text-center">Pph</th>
              <th className="border border-black py-2 px-2 w-20 text-center">Netto</th>
              <th className="border border-black py-2 px-2 w-28 text-center">Tanda Tangan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const isEven = (idx + 1) % 2 === 0;
              return (
                <tr key={row.id || idx} className="border-b border-black">
                  {/* No */}
                  <td className="border border-black py-2 px-1 text-center font-mono align-middle">
                    {idx + 1}
                  </td>

                  {/* Nama */}
                  <td className="border border-black py-2 px-2 font-bold text-black align-top leading-snug">
                    {row.nama}
                  </td>

                  {/* Untuk Pembayaran */}
                  <td className="border border-black py-2 px-2 text-black align-top leading-snug">
                    {row.untukPembayaran}
                  </td>

                  {/* JP */}
                  <td className="border border-black py-2 px-1 text-center font-mono align-middle">
                    {row.jp}
                  </td>

                  {/* @Rp */}
                  <td className="border border-black py-2 px-2 text-right font-mono tabular-nums align-middle whitespace-nowrap">
                    {formatNumberCommas(row.tarifSatuan)}
                  </td>

                  {/* Bruto */}
                  <td className="border border-black py-2 px-2 text-right font-mono tabular-nums align-middle whitespace-nowrap">
                    {formatNumberCommas(row.bruto)}
                  </td>

                  {/* Pph */}
                  <td className="border border-black py-2 px-2 text-right font-mono tabular-nums align-middle whitespace-nowrap">
                    {formatNumberCommas(row.pph)}
                  </td>

                  {/* Netto */}
                  <td className="border border-black py-2 px-2 text-right font-mono font-bold tabular-nums align-middle whitespace-nowrap">
                    {formatNumberCommas(row.netto)}
                  </td>

                  {/* Tanda Tangan: Pola nomor bergantian seperti pada PDF 2 */}
                  <td className="border border-black py-2 px-2 align-middle text-[10px]">
                    <div className={`font-mono text-black ${isEven ? 'pl-8' : 'pl-1'}`}>
                      {idx + 1}. ..................
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* 5. BARIS JUMLAH TOTAL */}
          <tfoot>
            <tr className="font-bold border-t-2 border-black text-black">
              <td colSpan={5} className="border border-black py-2 px-3 text-center uppercase tracking-wide">
                JUMLAH
              </td>
              <td className="border border-black py-2 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                {formatNumberCommas(totalBruto)}
              </td>
              <td className="border border-black py-2 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                {formatNumberCommas(totalPPh)}
              </td>
              <td className="border border-black py-2 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                {formatNumberCommas(totalNetto)}
              </td>
              <td className="border border-black py-2 px-2"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 6. TANGGAL & TANDA TANGAN DI BAWAH TABEL */}
      <div className="break-inside-avoid print:break-inside-avoid">
        {/* Tanggal di atas blok tanda tangan */}
        <div className="text-left font-bold text-[12px] mb-3 pl-1">
          {kota}, {tanggalIndo}
        </div>

        <div className="flex justify-between items-start pt-1 text-[12px]">
          {/* Kolom Kiri: PPK */}
          <div className="text-left w-72 pl-1">
            <div className="text-black leading-tight mb-20">
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
          <div className="text-left w-72 pr-1">
            <div className="text-black leading-tight mb-20">
              <div className="font-bold">
                {sumberDana === 'PNBP' ? 'BPP PNBP' : 'BPP RM'}
              </div>
              <div className="invisible">&nbsp;</div>
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
    </div>
  );
};
