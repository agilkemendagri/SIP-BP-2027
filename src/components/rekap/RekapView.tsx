/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { formatRupiah, formatTanggalIndo, downloadCSV, getDaftarBulan } from '../../utils/formatters';
import { DAFTAR_AKUN } from '../../data/mockData';
import {
  FileSpreadsheet,
  Download,
  Filter,
  Search,
  Printer,
  Table2,
  Lock,
  Check,
  Clock,
} from 'lucide-react';

interface RekapRowItem {
  id: string;
  nomorSPTB: string;
  tanggalBukti: string;
  sumberDana: string;
  kodeAkun: string;
  namaAkun: string;
  kegiatan: string;
  penerima: string;
  nipPenerima?: string;
  uraian: string;
  bruto: number;
  ppn: number;
  pph: number;
  netto: number;
  status: 'Draft' | 'Final';
  sudahSakti: boolean;
}

export const RekapView: React.FC = () => {
  const { visibleTransaksi, currentRole, showToast } = useApp();

  const daftarBulan = getDaftarBulan();

  // Filters
  const [filterTahun, setFilterTahun] = useState<string>(String(new Date().getFullYear()));
  const [filterBulan, setFilterBulan] = useState<string>('SEMUA');
  const [filterAkun, setFilterAkun] = useState<string>('SEMUA');
  const [filterSumberDana, setFilterSumberDana] = useState<string>('SEMUA');
  const [filterStatus, setFilterStatus] = useState<string>('SEMUA');
  const [filterSakti, setFilterSakti] = useState<string>('SEMUA');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Transform transactions into recipient-level flat rows:
  // For collective receipts, Nomor SPTB is repeated on every row!
  const allRekapRows = useMemo<RekapRowItem[]>(() => {
    const rows: RekapRowItem[] = [];

    visibleTransaksi.forEach(trx => {
      trx.penerimaList.forEach((item, idx) => {
        rows.push({
          id: `${trx.id}-${item.id || idx}`,
          nomorSPTB: trx.nomorSPTB, // Repeated on each recipient line as requested!
          tanggalBukti: trx.tanggalKuitansi,
          sumberDana: trx.sumberDana,
          kodeAkun: trx.kodeAkun,
          namaAkun: trx.namaAkun,
          kegiatan: trx.kegiatan,
          penerima: item.nama,
          nipPenerima: item.nip,
          uraian: item.uraianItem || trx.uraian,
          bruto: item.bruto,
          ppn: item.ppnNominal,
          pph: item.pphNominal,
          netto: item.netto,
          status: trx.status,
          sudahSakti: trx.sudahSakti,
        });
      });
    });

    return rows;
  }, [visibleTransaksi]);

  // Apply active filters
  const filteredRows = useMemo(() => {
    return allRekapRows.filter(row => {
      // Date filter
      if (row.tanggalBukti) {
        const [year, month] = row.tanggalBukti.split('-');
        if (filterTahun !== 'SEMUA' && year !== filterTahun) return false;
        if (filterBulan !== 'SEMUA' && month !== filterBulan) return false;
      }

      // Akun
      if (filterAkun !== 'SEMUA' && row.kodeAkun !== filterAkun) return false;

      // Sumber Dana
      if (filterSumberDana !== 'SEMUA' && row.sumberDana !== filterSumberDana) return false;

      // Status
      if (filterStatus !== 'SEMUA' && row.status !== filterStatus) return false;

      // SAKTI
      if (filterSakti === 'SUDAH' && !row.sudahSakti) return false;
      if (filterSakti === 'BELUM' && row.sudahSakti) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchSptb = row.nomorSPTB.toLowerCase().includes(q);
        const matchPenerima = row.penerima.toLowerCase().includes(q);
        const matchKegiatan = row.kegiatan.toLowerCase().includes(q);
        const matchUraian = row.uraian.toLowerCase().includes(q);
        if (!matchSptb && !matchPenerima && !matchKegiatan && !matchUraian) return false;
      }

      return true;
    });
  }, [allRekapRows, filterTahun, filterBulan, filterAkun, filterSumberDana, filterStatus, filterSakti, searchTerm]);

  // Aggregate totals for the filtered results
  const totalBruto = useMemo(() => filteredRows.reduce((acc, r) => acc + r.bruto, 0), [filteredRows]);
  const totalPPN = useMemo(() => filteredRows.reduce((acc, r) => acc + r.ppn, 0), [filteredRows]);
  const totalPPh = useMemo(() => filteredRows.reduce((acc, r) => acc + r.pph, 0), [filteredRows]);
  const totalNetto = useMemo(() => filteredRows.reduce((acc, r) => acc + r.netto, 0), [filteredRows]);

  // Export to Excel / CSV following active filter
  const handleExportExcel = () => {
    const headers = [
      'Nomor SPTB',
      'Tanggal Bukti',
      'Sumber Dana',
      'Kode Akun',
      'Nama Akun',
      'Kegiatan',
      'Nama Penerima',
      'NIP Penerima',
      'Uraian Pembayaran',
      'Bruto (Rp)',
      'PPN (Rp)',
      'PPh (Rp)',
      'Netto (Rp)',
      'Status (Draft/Final)',
      'Penanda SAKTI',
    ];

    const rows = filteredRows.map(r => [
      r.nomorSPTB,
      r.tanggalBukti,
      r.sumberDana,
      r.kodeAkun,
      r.namaAkun,
      r.kegiatan,
      r.penerima,
      r.nipPenerima || '-',
      r.uraian,
      r.bruto,
      r.ppn,
      r.pph,
      r.netto,
      r.status,
      r.sudahSakti ? 'Sudah Digunakan di SAKTI' : 'Belum Digunakan di SAKTI',
    ]);

    // Add total row at the bottom of export
    rows.push([
      'TOTAL REKAPITULASI',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      `${filteredRows.length} baris rincian`,
      totalBruto,
      totalPPN,
      totalPPh,
      totalNetto,
      '',
      '',
    ]);

    const timestamp = new Date().toISOString().split('T')[0];
    downloadCSV(`Rekapitulasi_Belanja_Penerima_SIP_BP_${timestamp}.csv`, headers, rows);
    showToast(`Rekapitulasi (${filteredRows.length} baris penerima) berhasil diunduh.`, 'success');
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch (err) {
      console.warn('Print dialog failed or blocked:', err);
      showToast('Pencetakan dialog browser dibatasi oleh iframe. Silakan tekan Ctrl+P (Cmd+P) atau gunakan Unduh CSV.', 'warning');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            Rekapitulasi Rincian Pembayaran & Ekspor
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar rincian per penerima pembayaran. Untuk kuitansi kolektif, nomor SPTB diulang pada setiap baris penerima.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Cetak Rekap</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Excel (.CSV)</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar (hidden during print) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3 no-print">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Cari nomor SPTB, nama penerima, atau uraian..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900"
            />
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-3 text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-700 font-mono">
            <span>
              Total Baris: <strong>{filteredRows.length}</strong>
            </span>
            <span>·</span>
            <span>
              Netto: <strong className="text-slate-950 font-bold">{formatRupiah(totalNetto)}</strong>
            </span>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          {/* Filter Tahun */}
          <select
            value={filterTahun}
            onChange={e => setFilterTahun(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 text-xs focus:outline-none"
          >
            <option value="SEMUA">Semua Tahun</option>
            {Array.from(new Set([new Date().getFullYear(),...allRekapRows.map(r=>Number(r.tanggalBukti.slice(0,4)))]))
              .sort((a,b)=>b-a).map(year=><option key={year} value={String(year)}>{year}</option>)}
          </select>

          {/* Filter Bulan */}
          <select
            value={filterBulan}
            onChange={e => setFilterBulan(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 text-xs focus:outline-none"
          >
            <option value="SEMUA">Semua Bulan</option>
            {daftarBulan.map(b => (
              <option key={b.nomor} value={b.nomor}>
                {b.nomor} - {b.nama}
              </option>
            ))}
          </select>

          {/* Filter Akun */}
          <select
            value={filterAkun}
            onChange={e => setFilterAkun(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 text-xs focus:outline-none"
          >
            <option value="SEMUA">Semua Akun</option>
            {DAFTAR_AKUN.map(a => (
              <option key={a.kode} value={a.kode}>
                {a.kode} - {a.nama}
              </option>
            ))}
          </select>

          {/* Filter Sumber Dana (Bendahara only) */}
          {currentRole === 'bendahara' && (
            <select
              value={filterSumberDana}
              onChange={e => setFilterSumberDana(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 text-xs focus:outline-none"
            >
              <option value="SEMUA">Semua Sumber Dana</option>
              <option value="RM">Rupiah Murni (RM)</option>
              <option value="PNBP">PNBP Layanan</option>
            </select>
          )}

          {/* Filter Status (Draft / Final) */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 text-xs focus:outline-none"
          >
            <option value="SEMUA">Semua Status (Draft & Final)</option>
            <option value="Final">Hanya Final</option>
            <option value="Draft">Hanya Draft</option>
          </select>

          {/* Filter SAKTI */}
          <select
            value={filterSakti}
            onChange={e => setFilterSakti(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 text-xs focus:outline-none"
          >
            <option value="SEMUA">Semua Status SAKTI</option>
            <option value="SUDAH">Sudah Digunakan di SAKTI</option>
            <option value="BELUM">Belum Digunakan di SAKTI</option>
          </select>

          {(filterTahun !== 'SEMUA' || filterBulan !== 'SEMUA' || filterAkun !== 'SEMUA' || filterSumberDana !== 'SEMUA' || filterStatus !== 'SEMUA' || filterSakti !== 'SEMUA' || searchTerm) && (
            <button
              onClick={() => {
                setFilterTahun('SEMUA');
                setFilterBulan('SEMUA');
                setFilterAkun('SEMUA');
                setFilterSumberDana('SEMUA');
                setFilterStatus('SEMUA');
                setFilterSakti('SEMUA');
                setSearchTerm('');
              }}
              className="text-xs text-blue-600 hover:text-blue-800 underline ml-auto font-medium"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Recipient-Level Detail Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Printable Letterhead (visible only when printing) */}
        <div className="hidden print-only p-4 border-b-2 border-slate-900 mb-3 text-center">
          <div className="text-xs uppercase font-bold tracking-wider">
            BBPKA PDN IV — KEMENTERIAN DALAM NEGERI
          </div>
          <div className="text-sm font-bold uppercase underline mt-0.5">
            LEMBAR REKAPITULASI RINCIAN PEMBAYARAN BENDAHARA PENGELUARAN
          </div>
          <div className="text-[10px] text-slate-600 mt-0.5">
            Tahun Anggaran {filterTahun === 'SEMUA' ? 'Semua' : filterTahun} · Dicetak: {new Date().toLocaleDateString('id-ID')}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] sm:text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                <th className="py-2.5 px-3 whitespace-nowrap">No. SPTB</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Tanggal Bukti</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Sumber Dana</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Akun</th>
                <th className="py-2.5 px-3 min-w-[170px]">Kegiatan</th>
                <th className="py-2.5 px-3 min-w-[160px]">Nama Penerima</th>
                <th className="py-2.5 px-3 min-w-[180px]">Uraian Pembayaran</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Bruto (Rp)</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">PPN (Rp)</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">PPh (Rp)</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Netto (Rp)</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Status</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">SAKTI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-500">
                    Tidak ada baris rincian pembayaran yang cocok dengan filter aktif.
                  </td>
                </tr>
              ) : (
                filteredRows.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* No. SPTB (repeated on collective rows) */}
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {row.nomorSPTB}
                    </td>

                    {/* Tanggal */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                      {formatTanggalIndo(row.tanggalBukti)}
                    </td>

                    {/* Sumber Dana */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`text-[11px] font-semibold ${
                          row.sumberDana === 'RM' ? 'text-slate-700' : 'text-blue-700'
                        }`}
                      >
                        {row.sumberDana}
                      </span>
                    </td>

                    {/* Akun */}
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-slate-700">
                      {row.kodeAkun}
                    </td>

                    {/* Kegiatan */}
                    <td className="py-2.5 px-3">
                      <div className="line-clamp-1 text-slate-800 font-medium">{row.kegiatan}</div>
                    </td>

                    {/* Penerima */}
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 line-clamp-1">{row.penerima}</div>
                      {row.nipPenerima && row.nipPenerima !== '-' && (
                        <div className="text-[10px] text-slate-500 font-mono">
                          NIP: {row.nipPenerima}
                        </div>
                      )}
                    </td>

                    {/* Uraian */}
                    <td className="py-2.5 px-3 text-slate-700">
                      <div className="line-clamp-2">{row.uraian}</div>
                    </td>

                    {/* Bruto */}
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                      {formatRupiah(row.bruto)}
                    </td>

                    {/* PPN */}
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600 tabular-nums whitespace-nowrap">
                      {formatRupiah(row.ppn)}
                    </td>

                    {/* PPh */}
                    <td className="py-2.5 px-3 text-right font-mono text-amber-900 tabular-nums whitespace-nowrap">
                      {formatRupiah(row.pph)}
                    </td>

                    {/* Netto */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-950 tabular-nums whitespace-nowrap">
                      {formatRupiah(row.netto)}
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`text-[11px] font-semibold ${
                          row.status === 'Final' ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>

                    {/* Penanda SAKTI */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {row.sudahSakti ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                          <Lock className="w-3 h-3" /> SAKTI
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Belum</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Total Footer Row */}
            {filteredRows.length > 0 && (
              <tfoot className="bg-slate-100/90 font-bold border-t-2 border-slate-300">
                <tr>
                  <td colSpan={7} className="py-3 px-3 text-right uppercase text-slate-800">
                    Total Rekapitulasi ({filteredRows.length} Baris):
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-900 tabular-nums whitespace-nowrap">
                    {formatRupiah(totalBruto)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-800 tabular-nums whitespace-nowrap">
                    {formatRupiah(totalPPN)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-amber-900 tabular-nums whitespace-nowrap">
                    {formatRupiah(totalPPh)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-950 tabular-nums whitespace-nowrap text-xs sm:text-sm">
                    {formatRupiah(totalNetto)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
