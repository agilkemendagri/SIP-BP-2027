/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Transaksi } from '../../types';
import { formatRupiah, formatTanggalIndo, downloadCSV } from '../../utils/formatters';
import { DAFTAR_AKUN } from '../../data/mockData';
import {
  Search,
  Filter,
  Download,
  ArrowUpDown,
  Lock,
  Unlock,
  CheckCircle2,
  Clock,
  Eye,
  Trash2,
  Edit3,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

type SortField = 'tanggalKuitansi' | 'nomorSPTB' | 'totalBruto' | 'ringkasanPenerima';
type SortOrder = 'asc' | 'desc';

export const DaftarTransaksiView: React.FC = () => {
  const {
    visibleTransaksi,
    currentRole,
    setPreviewKuitansi,
    setPreviewSptb,
    deleteTransaksi,
    finalizeTransaksi,
    returnToDraft,
    toggleSaktiSingle,
    setEditingTransaksi,
    setActiveView,
    selectedForSaktiIds,
    setSelectedForSaktiIds,
    setIsBulkSaktiModalOpen,
    showToast,
  } = useApp();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAkun, setFilterAkun] = useState<string>('SEMUA');
  const [filterSumberDana, setFilterSumberDana] = useState<string>('SEMUA');
  const [filterStatus, setFilterStatus] = useState<string>('SEMUA');
  const [filterSakti, setFilterSakti] = useState<string>('SEMUA');

  // Sorting State - default newest date first
  const [sortField, setSortField] = useState<SortField>('tanggalKuitansi');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Pagination State - default 25
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Filtered and Searched data
  const filteredData = useMemo(() => {
    return visibleTransaksi.filter(trx => {
      // 1. Search term check: No. SPTB, Kegiatan, Ringkasan Penerima, or any individual recipient in collective list!
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchSptb = trx.nomorSPTB.toLowerCase().includes(query);
        const matchKegiatan = trx.kegiatan.toLowerCase().includes(query);
        const matchUraian = trx.uraian.toLowerCase().includes(query);
        const matchRingkasan = trx.ringkasanPenerima.toLowerCase().includes(query);
        const matchIndividualRecipient = trx.penerimaList.some(
          p => p.nama.toLowerCase().includes(query) || p.uraianItem.toLowerCase().includes(query)
        );

        if (!matchSptb && !matchKegiatan && !matchUraian && !matchRingkasan && !matchIndividualRecipient) {
          return false;
        }
      }

      // 2. Akun filter
      if (filterAkun !== 'SEMUA' && trx.kodeAkun !== filterAkun) {
        return false;
      }

      // 3. Sumber Dana filter
      if (filterSumberDana !== 'SEMUA' && trx.sumberDana !== filterSumberDana) {
        return false;
      }

      // 4. Status filter (Draft / Final)
      if (filterStatus !== 'SEMUA' && trx.status !== filterStatus) {
        return false;
      }

      // 5. Sakti filter
      if (filterSakti === 'SUDAH' && !trx.sudahSakti) return false;
      if (filterSakti === 'BELUM' && trx.sudahSakti) return false;

      return true;
    });
  }, [visibleTransaksi, searchTerm, filterAkun, filterSumberDana, filterStatus, filterSakti]);

  // Sorted Data
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'tanggalKuitansi') {
        comparison = new Date(a.tanggalKuitansi).getTime() - new Date(b.tanggalKuitansi).getTime();
      } else if (sortField === 'nomorSPTB') {
        comparison = a.nomorSPTB.localeCompare(b.nomorSPTB);
      } else if (sortField === 'totalBruto') {
        comparison = a.totalBruto - b.totalBruto;
      } else if (sortField === 'ringkasanPenerima') {
        comparison = a.ringkasanPenerima.localeCompare(b.ringkasanPenerima);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortField, sortOrder]);

  // Paginated Data
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // Selection handlers
  const handleToggleSelectAll = () => {
    const eligiblePageIds = paginatedData
      .filter(t => t.status === 'Final' && !t.sudahSakti)
      .map(t => t.id);

    const allSelected = eligiblePageIds.every(id => selectedForSaktiIds.includes(id));
    if (allSelected) {
      setSelectedForSaktiIds(prev => prev.filter(id => !eligiblePageIds.includes(id)));
    } else {
      setSelectedForSaktiIds(prev => Array.from(new Set([...prev, ...eligiblePageIds])));
    }
  };

  const handleToggleRow = (trx: Transaksi) => {
    if (trx.status !== 'Final' || trx.sudahSakti) {
      showToast('Hanya transaksi Final yang belum digunakan di SAKTI yang dapat dipilih untuk penandaan massal.', 'info');
      return;
    }
    setSelectedForSaktiIds(prev =>
      prev.includes(trx.id) ? prev.filter(id => id !== trx.id) : [...prev, trx.id]
    );
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Each recipient/detail is a separate export row; applied filters are respected.
  const handleExportExcel = () => {
    const headers = [
      "Nomor SPTB","Tanggal Bukti","Sumber Dana","Kode Akun","Nama Akun","Kegiatan",
      "Penerima","NIP / NIK","Uraian Rincian","Volume","Satuan","Tarif Satuan",
      "Bruto (Rp)","PPN (Rp)","PPh (Rp)","Netto (Rp)","Status","Sudah SAKTI","Tanggal SAKTI"
    ];
    const rows = sortedData.flatMap(t => t.penerimaList.map(p => [
      t.nomorSPTB,t.tanggalKuitansi,t.sumberDana,t.kodeAkun,t.namaAkun,t.kegiatan,
      p.nama,p.nip||"",p.uraianItem,p.volume,p.satuan,p.tarifSatuan,
      p.bruto,p.ppnNominal,p.pphNominal,p.netto,t.status,
      t.sudahSakti?"Ya":"Tidak",t.tanggalSakti||""
    ]));
    downloadCSV("Daftar_Transaksi_SIP_BP_"+new Date().toISOString().slice(0,10)+".csv",headers,rows);
    showToast("Sebanyak "+rows.length+" rincian berhasil diekspor (CSV dapat dibuka Excel).","success");
  };

  const eligibleSelectedCount = selectedForSaktiIds.filter(id => {
    const item = visibleTransaksi.find(t => t.id === id);
    return item && item.status === 'Final' && !item.sudahSakti;
  }).length;

  return (
    <div className="space-y-4">
      {/* Search & Filter Header Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari nomor SPTB, nama penerima (termasuk tim kolektif), atau kegiatan..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                Reset
              </button>
            )}
          </div>

          {/* Export and Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Ekspor Excel</span>
            </button>
          </div>
        </div>

        {/* Filter Pills / Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          {/* Filter Akun */}
          <select
            value={filterAkun}
            onChange={e => {
              setFilterAkun(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 text-xs focus:outline-none"
          >
            <option value="SEMUA">Semua Akun</option>
            {DAFTAR_AKUN.map(acc => (
              <option key={acc.kode} value={acc.kode}>
                {acc.kode} - {acc.nama}
              </option>
            ))}
          </select>

          {/* Filter Sumber Dana (only toggleable if Bendahara) */}
          {currentRole === 'bendahara' && (
            <select
              value={filterSumberDana}
              onChange={e => {
                setFilterSumberDana(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 text-xs focus:outline-none"
            >
              <option value="SEMUA">Semua Sumber Dana</option>
              <option value="RM">Rupiah Murni (RM)</option>
              <option value="PNBP">PNBP</option>
            </select>
          )}

          {/* Filter Status (Draft / Final) */}
          <select
            value={filterStatus}
            onChange={e => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 text-xs focus:outline-none"
          >
            <option value="SEMUA">Semua Status (Draft / Final)</option>
            <option value="Final">Hanya Final</option>
            <option value="Draft">Hanya Draft</option>
          </select>

          {/* Filter SAKTI */}
          <select
            value={filterSakti}
            onChange={e => {
              setFilterSakti(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 text-xs focus:outline-none"
          >
            <option value="SEMUA">Semua Status SAKTI</option>
            <option value="BELUM">Belum Digunakan di SAKTI</option>
            <option value="SUDAH">Sudah Digunakan di SAKTI</option>
          </select>

          {(filterAkun !== 'SEMUA' || filterSumberDana !== 'SEMUA' || filterStatus !== 'SEMUA' || filterSakti !== 'SEMUA' || searchTerm) && (
            <button
              onClick={() => {
                setFilterAkun('SEMUA');
                setFilterSumberDana('SEMUA');
                setFilterStatus('SEMUA');
                setFilterSakti('SEMUA');
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className="text-xs text-blue-600 hover:text-blue-800 underline ml-auto font-medium"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Bulk Action Bar (when rows selected) */}
      {selectedForSaktiIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-blue-900 font-medium">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>
              <strong>{selectedForSaktiIds.length}</strong> transaksi dipilih ({eligibleSelectedCount} memenuhi syarat Final & Belum SAKTI).
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedForSaktiIds([])}
              className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-md"
            >
              Batal Pilih
            </button>
            <button
              disabled={eligibleSelectedCount === 0 || eligibleSelectedCount > 100}
              onClick={() => setIsBulkSaktiModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-md text-xs font-semibold shadow-xs transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Tandai Digunakan di SAKTI ({eligibleSelectedCount} berkas)</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold select-none">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    onChange={handleToggleSelectAll}
                    title="Pilih semua transaksi final yang belum SAKTI pada halaman ini"
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th
                  onClick={() => handleSort('nomorSPTB')}
                  className="py-3 px-3 whitespace-nowrap cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>No. SPTB</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('tanggalKuitansi')}
                  className="py-3 px-3 whitespace-nowrap cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Tgl Kuitansi</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 whitespace-nowrap">Sumber Dana</th>
                <th className="py-3 px-3 min-w-[200px]">Kegiatan & Uraian</th>
                <th
                  onClick={() => handleSort('ringkasanPenerima')}
                  className="py-3 px-3 whitespace-nowrap cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Penerima</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 whitespace-nowrap">Akun</th>
                <th
                  onClick={() => handleSort('totalBruto')}
                  className="py-3 px-3 text-right whitespace-nowrap cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Bruto (Rp)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Status</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Penanda SAKTI</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    Tidak ada transaksi yang cocok dengan kriteria pencarian dan filter aktif.
                  </td>
                </tr>
              ) : (
                paginatedData.map(trx => {
                  const isSelected = selectedForSaktiIds.includes(trx.id);
                  const isLocked = trx.sudahSakti;

                  return (
                    <tr
                      key={trx.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isSelected ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={trx.status !== 'Final' || trx.sudahSakti}
                          onChange={() => handleToggleRow(trx)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                        />
                      </td>

                      {/* No. SPTB */}
                      <td className="py-3 px-3 font-mono font-medium text-slate-900 whitespace-nowrap">
                        <button
                          onClick={() => setPreviewSptb(trx)}
                          className="hover:text-blue-600 underline font-semibold text-left"
                          title="Pratinjau dokumen SPTB"
                        >
                          {trx.nomorSPTB}
                        </button>
                      </td>

                      {/* Tanggal Kuitansi */}
                      <td className="py-3 px-3 whitespace-nowrap text-slate-600">
                        {formatTanggalIndo(trx.tanggalKuitansi)}
                      </td>

                      {/* Sumber Dana */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`font-semibold text-[11px] ${
                            trx.sumberDana === 'RM' ? 'text-slate-700' : 'text-blue-700'
                          }`}
                        >
                          {trx.sumberDana}
                        </span>
                      </td>

                      {/* Kegiatan & Uraian */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 line-clamp-1">
                          {trx.kegiatan}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {trx.uraian}
                        </div>
                      </td>

                      {/* Penerima */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-medium text-slate-800">
                          {trx.ringkasanPenerima}
                        </div>
                        {trx.penerimaList.length > 1 && (
                          <span className="text-[10px] text-slate-500">
                            ({trx.penerimaList.length} orang penerima)
                          </span>
                        )}
                      </td>

                      {/* Akun */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-mono text-slate-800 font-medium block">
                          {trx.kodeAkun}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate max-w-[130px] block">
                          {trx.namaAkun}
                        </span>
                      </td>

                      {/* Bruto */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap">
                        {formatRupiah(trx.totalBruto)}
                      </td>

                      {/* Status (Draft / Final) */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {trx.status === 'Final' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <Check className="w-3 h-3" /> Final
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                            <Clock className="w-3 h-3" /> Draft
                          </span>
                        )}
                      </td>

                      {/* Penanda SAKTI */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {trx.sudahSakti ? (
                          <div className="inline-flex items-center gap-1 text-[11px] text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-medium">
                            <Lock className="w-3 h-3 text-blue-600" />
                            <span>Digunakan di SAKTI</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            Belum Digunakan
                          </span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {/* Tombol Lihat Kuitansi */}
                          <button
                            onClick={() => setPreviewKuitansi(trx)}
                            title="Pratinjau Kuitansi"
                            className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Tombol Buka / Ubah jika belum dikunci di SAKTI */}
                          {!isLocked && trx.status === 'Draft' && trx.jenisKuitansi === 'jasa_profesi' && (
                            <button
                              onClick={() => {
                                setEditingTransaksi(trx);
                                if (trx.jenisKuitansi === 'jasa_profesi') {
                                  setActiveView('kuitansi_profesi');
                                } else if (trx.jenisKuitansi === 'perjadin_luar_kota') {
                                  setActiveView('kuitansi_luar_kota');
                                } else if (trx.jenisKuitansi === 'perjadin_dalam_kota') {
                                  setActiveView('kuitansi_dalam_kota');
                                }
                              }}
                              title="Ubah Draft Jasa Profesi"
                              className="p-1 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Tombol Finalisasi jika masih Draft */}
                          {trx.status === 'Draft' && (
                            <button
                              onClick={() => finalizeTransaksi(trx.id)}
                              title="Finalisasi Transaksi"
                              className="px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[10px] font-semibold"
                            >
                              Finalkan
                            </button>
                          )}

                          {trx.status === "Final" && !isLocked && (
                            <button title="Kembali ke Draft untuk koreksi" onClick={()=>{
                              if(window.confirm("Kembalikan SPTB "+trx.nomorSPTB+" ke Draft?"))returnToDraft(trx.id).catch(()=>{});
                            }} className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">Ke Draft</button>
                          )}
                          {trx.status === "Final" && (
                            <button title={isLocked?"Buka kunci SAKTI (wajib alasan)":"Tandai digunakan di SAKTI"} onClick={()=>{
                              if(isLocked || window.confirm("Tandai "+trx.nomorSPTB+" digunakan di SAKTI?"))toggleSaktiSingle(trx.id).catch(()=>{});
                            }} className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded">
                              {isLocked?"Buka SAKTI":"Tandai SAKTI"}
                            </button>
                          )}
                          {/* Tombol Hapus jika belum SAKTI */}
                          {!isLocked && trx.status === 'Draft' ? (
                            <button
                              onClick={() => {
                                if (window.confirm(`Hapus transaksi ${trx.nomorSPTB}?`)) {
                                  deleteTransaksi(trx.id);
                                }
                              }}
                              title="Hapus Transaksi"
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span title="Transaksi terkunci di SAKTI" className="p-1 text-slate-300">
                              <Lock className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Counter Bar */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span>
              Menampilkan{' '}
              <strong className="text-slate-900 font-mono">
                {sortedData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
              </strong>{' '}
              –{' '}
              <strong className="text-slate-900 font-mono">
                {Math.min(currentPage * pageSize, sortedData.length)}
              </strong>{' '}
              dari{' '}
              <strong className="text-slate-900 font-mono">{sortedData.length}</strong>{' '}
              transaksi
            </span>

            {/* Page Size Selector: 10, 25, 50, 100 */}
            <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 pl-3">
              <span className="text-[11px] text-slate-500">Tampilkan:</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-semibold focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Page numbers navigation */}
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Halaman sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono font-medium">
              Hal {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Halaman berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
