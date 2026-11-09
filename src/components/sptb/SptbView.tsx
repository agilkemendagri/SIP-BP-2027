/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { formatRupiah, formatTanggalIndo } from '../../utils/formatters';
import {
  FileCheck2,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  Lock,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const SptbView: React.FC = () => {
  const { visibleTransaksi, currentRole, setPreviewSptb, setPreviewKuitansi } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterSumberDana, setFilterSumberDana] = useState<string>('SEMUA');
  const [filterStatus, setFilterStatus] = useState<string>('SEMUA');

  const filteredSptbList = useMemo(() => {
    return visibleTransaksi.filter(trx => {
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchSptb = trx.nomorSPTB.toLowerCase().includes(query);
        const matchKegiatan = trx.kegiatan.toLowerCase().includes(query);
        const matchPenerima = trx.ringkasanPenerima.toLowerCase().includes(query);
        const matchDetail = trx.penerimaList.some(p => p.nama.toLowerCase().includes(query));
        if (!matchSptb && !matchKegiatan && !matchPenerima && !matchDetail) return false;
      }
      if (filterSumberDana !== 'SEMUA' && trx.sumberDana !== filterSumberDana) {
        return false;
      }
      if (filterStatus !== 'SEMUA' && trx.status !== filterStatus) {
        return false;
      }
      return true;
    });
  }, [visibleTransaksi, searchTerm, filterSumberDana, filterStatus]);

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-emerald-600" />
            Surat Pernyataan Tanggung Jawab Belanja (SPTB)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Setiap dokumen SPTB terhubung langsung dengan satu berkas kuitansi pengeluaran BBPKA PDN IV
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
          <span>Pola Nomor:</span>
          <span className="font-mono font-semibold text-slate-900">
            SPTB/[RM|PNBP]/BBPKAIV/MM/Urutan
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Cari nomor SPTB, kegiatan, atau penerima..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-2">
          {currentRole === 'bendahara' && (
            <select
              value={filterSumberDana}
              onChange={e => setFilterSumberDana(e.target.value)}
              className="px-2.5 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 text-xs focus:outline-none"
            >
              <option value="SEMUA">Semua Sumber Dana</option>
              <option value="RM">Rupiah Murni (RM)</option>
              <option value="PNBP">PNBP</option>
            </select>
          )}

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-2.5 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 text-xs focus:outline-none"
          >
            <option value="SEMUA">Semua Status</option>
            <option value="Final">Final</option>
            <option value="Draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Table of SPTBs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4 whitespace-nowrap">Nomor SPTB</th>
                <th className="py-3 px-4 whitespace-nowrap">Tanggal SPTB</th>
                <th className="py-3 px-4 whitespace-nowrap">Sumber Dana</th>
                <th className="py-3 px-4 min-w-[220px]">Kegiatan / Klasifikasi</th>
                <th className="py-3 px-4 whitespace-nowrap">Rincian Penerima</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Total Bruto</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Total Netto</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Status Kuitansi</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSptbList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    Tidak ada dokumen SPTB ditemukan.
                  </td>
                </tr>
              ) : (
                filteredSptbList.map(trx => (
                  <tr key={trx.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Nomor SPTB */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {trx.nomorSPTB}
                    </td>

                    {/* Tanggal */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                      {formatTanggalIndo(trx.tanggalKuitansi)}
                    </td>

                    {/* Sumber Dana */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`text-[11px] font-semibold ${
                          trx.sumberDana === 'RM' ? 'text-slate-700' : 'text-blue-700'
                        }`}
                      >
                        {trx.sumberDana}
                      </span>
                    </td>

                    {/* Kegiatan */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 line-clamp-1">{trx.kegiatan}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        Akun: {trx.kodeAkun} · {trx.namaAkun}
                      </div>
                    </td>

                    {/* Penerima */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-800">{trx.ringkasanPenerima}</div>
                      <div className="text-[10px] text-slate-500">
                        {trx.penerimaList.length > 1
                          ? `${trx.penerimaList.length} baris rincian kolektif`
                          : '1 penerima individual'}
                      </div>
                    </td>

                    {/* Total Bruto */}
                    <td className="py-3 px-4 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                      {formatRupiah(trx.totalBruto)}
                    </td>

                    {/* Total Netto */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-950 tabular-nums whitespace-nowrap">
                      {formatRupiah(trx.totalNetto)}
                    </td>

                    {/* Status Kuitansi */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`text-[11px] font-semibold ${
                          trx.status === 'Final' ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {trx.status}
                      </span>
                    </td>

                    {/* Aksi */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setPreviewSptb(trx)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                          title="Buka pratinjau dokumen SPTB"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Pratinjau SPTB</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
