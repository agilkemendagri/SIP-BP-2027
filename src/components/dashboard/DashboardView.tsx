/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { formatRupiah, formatTanggalIndo, getDaftarBulan } from '../../utils/formatters';
import {
  TrendingUp,
  FileText,
  FileCheck2,
  Calendar,
  Layers,
  FileClock,
  ArrowRight,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    visibleTransaksi,
    currentRole,
    filterTahun,
    setFilterTahun,
    filterBulan,
    setFilterBulan,
    setActiveView,
    setPreviewKuitansi,
    setPreviewSptb,
  } = useApp();

  const daftarBulan = getDaftarBulan();

  // Filter transactions based on selected Year and Month (based on tanggalKuitansi)
  const filteredList = useMemo(() => {
    return visibleTransaksi.filter(t => {
      if (!t.tanggalKuitansi) return false;
      const [year, month] = t.tanggalKuitansi.split('-');
      if (filterTahun !== 'SEMUA' && year !== filterTahun) return false;
      if (filterBulan !== 'SEMUA' && month !== filterBulan) return false;
      return true;
    });
  }, [visibleTransaksi, filterTahun, filterBulan]);

  // Separate Draft and Final transactions
  const finalTrx = useMemo(() => filteredList.filter(t => t.status === 'Final'), [filteredList]);
  const draftTrx = useMemo(() => filteredList.filter(t => t.status === 'Draft'), [filteredList]);

  // Final Financial Totals (strictly separated from Draft)
  const totalBrutoFinal = useMemo(() => finalTrx.reduce((acc, t) => acc + t.totalBruto, 0), [finalTrx]);
  const totalPPNFinal = useMemo(() => finalTrx.reduce((acc, t) => acc + t.totalPPN, 0), [finalTrx]);
  const totalPPhFinal = useMemo(() => finalTrx.reduce((acc, t) => acc + t.totalPPh, 0), [finalTrx]);
  const totalNettoFinal = useMemo(() => finalTrx.reduce((acc, t) => acc + t.totalNetto, 0), [finalTrx]);

  // Draft Totals (displayed separately)
  const totalBrutoDraft = useMemo(() => draftTrx.reduce((acc, t) => acc + t.totalBruto, 0), [draftTrx]);
  const totalNettoDraft = useMemo(() => draftTrx.reduce((acc, t) => acc + t.totalNetto, 0), [draftTrx]);

  // Quantities
  const totalKuitansiCount = filteredList.length;
  const totalSptbCount = filteredList.length; // 1 SPTB terhubung dengan 1 kuitansi
  const finalCount = finalTrx.length;
  const draftCount = draftTrx.length;

  // Breakdown by Funding Source (RM vs PNBP) based on active role
  const rmFinalTrx = useMemo(() => finalTrx.filter(t => t.sumberDana === 'RM'), [finalTrx]);
  const pnbpFinalTrx = useMemo(() => finalTrx.filter(t => t.sumberDana === 'PNBP'), [finalTrx]);

  const rmBrutoFinal = useMemo(() => rmFinalTrx.reduce((acc, t) => acc + t.totalBruto, 0), [rmFinalTrx]);
  const rmNettoFinal = useMemo(() => rmFinalTrx.reduce((acc, t) => acc + t.totalNetto, 0), [rmFinalTrx]);

  const pnbpBrutoFinal = useMemo(() => pnbpFinalTrx.reduce((acc, t) => acc + t.totalBruto, 0), [pnbpFinalTrx]);
  const pnbpNettoFinal = useMemo(() => pnbpFinalTrx.reduce((acc, t) => acc + t.totalNetto, 0), [pnbpFinalTrx]);

  // Recent 5 transactions
  const recentTrx = useMemo(() => {
    return [...filteredList]
      .sort((a, b) => new Date(b.tanggalKuitansi).getTime() - new Date(a.tanggalKuitansi).getTime())
      .slice(0, 5);
  }, [filteredList]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Ringkasan Realisasi Pengeluaran BBPKA PDN IV
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Menampilkan data belanja{' '}
            <strong className="text-slate-900">
              {currentRole === 'bendahara'
                ? 'Rupiah Murni (RM) & PNBP'
                : currentRole === 'bpp_rm'
                ? 'Rupiah Murni (RM)'
                : 'PNBP'}
            </strong>{' '}
            berdasarkan tanggal kuitansi.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600 font-medium">Tahun:</span>
            <select
              value={filterTahun}
              onChange={e => setFilterTahun(e.target.value)}
              className="bg-transparent font-semibold text-slate-900 focus:outline-none cursor-pointer"
            >
              {Array.from(new Set([new Date().getFullYear(),...visibleTransaksi.map(t=>Number(t.tanggalKuitansi.slice(0,4)))]))
                .sort((a,b)=>b-a).map(year=><option key={year} value={String(year)}>{year}</option>)}
              <option value="SEMUA">Semua Tahun</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
            <span className="text-slate-600 font-medium">Bulan:</span>
            <select
              value={filterBulan}
              onChange={e => setFilterBulan(e.target.value)}
              className="bg-transparent font-semibold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="SEMUA">Semua Bulan</option>
              {daftarBulan.map(b => (
                <option key={b.nomor} value={b.nomor}>
                  {b.nomor} - {b.nama}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Primary Financial Summary Cards (STATUS FINAL ONLY) */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Realisasi Belanja Sah (Transaksi Final)
            </span>
            <span className="text-[11px] text-slate-600">· {finalCount} Kuitansi</span>
          </div>
          <span className="text-xs text-slate-600">Angka netto adalah nilai riil yang dibayarkan</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Bruto Final */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-medium">Total Bruto (Final)</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
                Rp
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {formatRupiah(totalBrutoFinal)}
            </div>
            <p className="text-[11px] text-slate-600 mt-1.5">
              Nilai kotor sebelum pemotongan pajak
            </p>
          </div>

          {/* Total PPN Final */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-medium">Total PPN (Final)</span>
              <span className="text-[11px] font-mono font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                PPN
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-800 tabular-nums">
              {formatRupiah(totalPPNFinal)}
            </div>
            <p className="text-[11px] text-slate-600 mt-1.5">
              Pajak Pertambahan Nilai
            </p>
          </div>

          {/* Total PPh Final */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-medium">Total PPh (Final)</span>
              <span className="text-[11px] font-mono font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                PPh
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-amber-700 tabular-nums">
              {formatRupiah(totalPPhFinal)}
            </div>
            <p className="text-[11px] text-slate-600 mt-1.5">
              Pajak Penghasilan (PPh 21 / 23 / Final)
            </p>
          </div>

          {/* Total Netto Final */}
          <div className="bg-white rounded-xl border border-blue-200 bg-blue-50/20 p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-blue-900 mb-2">
              <span className="font-bold">Total Netto Dibayarkan</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-blue-900 tabular-nums">
              {formatRupiah(totalNettoFinal)}
            </div>
            <p className="text-[11px] text-blue-900 mt-1.5 font-medium">
              Bruto dikurangi potongan PPh & PPN
            </p>
          </div>
        </div>
      </div>

      {/* Secondary Row: Quantities & Draft Totals (DRAFT SEPARATED) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: Quantities Summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">
              Ringkasan Dokumen & Status
            </h3>
            <span className="text-xs text-slate-600">Volume</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-slate-600 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                Jumlah Kuitansi Terbit
              </span>
              <span className="font-bold font-mono text-slate-900 text-sm">
                {totalKuitansiCount} berkas
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-slate-600 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-500" />
                Jumlah SPTB Diterbitkan
              </span>
              <span className="font-bold font-mono text-slate-900 text-sm">
                {totalSptbCount} berkas
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-slate-600">Final:</span>
                  <span className="font-bold font-mono text-slate-900">{finalCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span className="text-slate-600">Draft:</span>
                  <span className="font-bold font-mono text-slate-900">{draftCount}</span>
                </div>
              </div>
              <button
                onClick={() => setActiveView('transaksi')}
                className="text-blue-600 hover:text-blue-700 font-medium text-xs flex items-center gap-1"
              >
                Lihat Semua <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Draft Values Card (EXPLICITLY SEPARATED FROM FINAL AS REQUIRED) */}
        <div className="bg-white rounded-xl border border-amber-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900">
                Nilai Transaksi Draft (Belum Final)
              </h3>
            </div>
            <span className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-medium">
              {draftCount} Draft
            </span>
          </div>

          <p className="text-xs text-slate-600 mb-3 leading-relaxed">
            Data transaksi draft belum sah dan tidak diperhitungkan dalam total belanja realisasi final.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <span className="text-[11px] text-slate-600 block">Estimasi Bruto Draft</span>
              <span className="text-base font-bold font-mono text-amber-900 tabular-nums">
                {formatRupiah(totalBrutoDraft)}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-600 block">Estimasi Netto Draft</span>
              <span className="text-base font-bold font-mono text-slate-800 tabular-nums">
                {formatRupiah(totalNettoDraft)}
              </span>
            </div>
          </div>

          {draftCount > 0 && (
            <div className="mt-3 pt-2 text-[11px] text-slate-600">
              Silakan finalisasi kuitansi draft di menu{' '}
              <button
                onClick={() => setActiveView('transaksi')}
                className="text-blue-600 underline font-medium"
              >
                Daftar Transaksi
              </button>
              .
            </div>
          )}
        </div>

        {/* Card 3: Funding Source Allocation (RM & PNBP based on role) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900">
              Alokasi Sumber Dana (Final)
            </h3>
            <span className="text-xs text-slate-600">BBPKA IV</span>
          </div>

          <div className="space-y-3 text-xs">
            {(currentRole === 'bendahara' || currentRole === 'bpp_rm') && (
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-800">Rupiah Murni (RM)</span>
                  <span className="text-[10px] text-slate-500 font-mono">{rmFinalTrx.length} Final</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Bruto / Netto:</span>
                  <span className="font-bold font-mono text-slate-900 tabular-nums">
                    {formatRupiah(rmNettoFinal)}
                  </span>
                </div>
              </div>
            )}

            {(currentRole === 'bendahara' || currentRole === 'bpp_pnbp') && (
              <div className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-blue-900">PNBP Layanan Teknis</span>
                  <span className="text-[10px] text-blue-600 font-mono">{pnbpFinalTrx.length} Final</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Bruto / Netto:</span>
                  <span className="font-bold font-mono text-blue-950 tabular-nums">
                    {formatRupiah(pnbpNettoFinal)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:px-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Daftar Transaksi Terbaru
            </h3>
            <span className="text-xs text-slate-500">
              5 transaksi terakhir tercatat pada sistem
            </span>
          </div>
          <button
            onClick={() => setActiveView('transaksi')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
          >
            Buka Transaksi Lengkap <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTrx.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Tidak ada transaksi ditemukan pada periode filter ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4 whitespace-nowrap">No. SPTB</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Tanggal Bukti</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Sumber Dana</th>
                  <th className="py-2.5 px-4 min-w-[220px]">Uraian & Kegiatan</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Penerima</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">Bruto</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">Netto</th>
                  <th className="py-2.5 px-4 text-center whitespace-nowrap">Status</th>
                  <th className="py-2.5 px-4 text-center whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTrx.map(trx => (
                  <tr key={trx.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                      {trx.nomorSPTB}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                      {formatTanggalIndo(trx.tanggalKuitansi)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`text-[11px] font-semibold ${
                          trx.sumberDana === 'RM' ? 'text-slate-700' : 'text-blue-700'
                        }`}
                      >
                        {trx.sumberDana}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 line-clamp-1">{trx.uraian}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{trx.kegiatan}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-700 font-medium">
                      {trx.ringkasanPenerima}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                      {formatRupiah(trx.totalBruto)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-slate-900 whitespace-nowrap">
                      {formatRupiah(trx.totalNetto)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`text-[11px] font-semibold ${
                          trx.status === 'Final' ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {trx.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setPreviewKuitansi(trx)}
                          title="Lihat Kuitansi"
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium transition-colors"
                        >
                          Kuitansi
                        </button>
                        <button
                          onClick={() => setPreviewSptb(trx)}
                          title="Lihat SPTB"
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-medium transition-colors"
                        >
                          SPTB
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
