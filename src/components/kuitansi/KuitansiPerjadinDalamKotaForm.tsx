/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SumberDana, PenerimaItem } from '../../types';
import { formatRupiah } from '../../utils/formatters';
import { Car, Save, CheckCircle2, ArrowLeft, Plus, Trash2, Users } from 'lucide-react';

interface RecipientRow {
  id: string;
  nama: string;
  nip: string;
  golongan: string;
  jabatan: string;
  uraianItem: string;
  volume: number;
  satuan: string;
  tarifSatuan: number;
  pphRate: number;
  rekening: string;
  bank: string;
}

export const KuitansiPerjadinDalamKotaForm: React.FC = () => {
  const { currentRole, addTransaksi, setActiveView, showToast } = useApp();

  const defaultSumberDana: SumberDana = currentRole === 'bpp_pnbp' ? 'PNBP' : 'RM';
  const [sumberDana, setSumberDana] = useState<SumberDana>(defaultSumberDana);
  const [tanggalKuitansi, setTanggalKuitansi] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [kodeAkun, setKodeAkun] = useState<string>('524113'); // Belanja Perjadin Dalam Kota
  const [kegiatan, setKegiatan] = useState<string>(
    'Pemeriksaan dan Verifikasi Standar Alat Ukur Pasar Tradisional Wilayah Kerja IV'
  );
  const [uraian, setUraian] = useState<string>(
    'Pembayaran Transport Lokal Perjalanan Dinas Dalam Kota Tim Pengawas Pasar (4 Petugas)'
  );

  const [suratTugasNomor, setSuratTugasNomor] = useState<string>('ST-091/BBPKAIV/03/2026');
  const [tanggalTugas, setTanggalTugas] = useState<string>('2026-03-25');
  const [kotaAsal, setKotaAsal] = useState<string>('Jakarta Pusat');
  const [kotaTujuan, setKotaTujuan] = useState<string>('Wilayah Kota Bekasi');

  // Collective recipients table
  const [recipients, setRecipients] = useState<RecipientRow[]>([
    {
      id: '1',
      nama: 'Kurniawan Pratama, S.T.',
      nip: '19880712 201101 1 003',
      golongan: 'III/d',
      jabatan: 'Ketua Tim Pemeriksa Metrologi',
      uraianItem: 'Transport Lokal Pengawasan Pasar Bekasi',
      volume: 1,
      satuan: 'Org/Hari',
      tarifSatuan: 150000,
      pphRate: 0,
      rekening: '1192837401',
      bank: 'Bank Mandiri',
    },
    {
      id: '2',
      nama: 'Dina Kusuma, S.Si.',
      nip: '19900405 201402 2 002',
      golongan: 'III/c',
      jabatan: 'Penera Terampil',
      uraianItem: 'Transport Lokal Pengawasan Pasar Bekasi',
      volume: 1,
      satuan: 'Org/Hari',
      tarifSatuan: 150000,
      pphRate: 0,
      rekening: '0382910293',
      bank: 'BRI',
    },
    {
      id: '3',
      nama: 'Fajar Nugroho, A.Md.',
      nip: '19940118 201801 1 001',
      golongan: 'II/d',
      jabatan: 'Pengawas Teknis Pengukuran',
      uraianItem: 'Transport Lokal Pengawasan Pasar Bekasi',
      volume: 1,
      satuan: 'Org/Hari',
      tarifSatuan: 150000,
      pphRate: 0,
      rekening: '5029102938',
      bank: 'BTN',
    },
    {
      id: '4',
      nama: 'Budi Santoso',
      nip: '19820520 200701 1 005',
      golongan: 'II/c',
      jabatan: 'Petugas Pengambil Sampel',
      uraianItem: 'Transport Lokal Pengawasan Pasar Bekasi',
      volume: 1,
      satuan: 'Org/Hari',
      tarifSatuan: 150000,
      pphRate: 0,
      rekening: '0091827364',
      bank: 'Bank BJB',
    },
  ]);

  // Aggregate Calculations
  const calculatedItems = recipients.map(r => {
    const bruto = r.volume * r.tarifSatuan;
    const pphNominal = (bruto * r.pphRate) / 100;
    const ppnNominal = 0;
    const netto = bruto - pphNominal;
    return {
      ...r,
      bruto,
      ppnNominal,
      pphNominal,
      netto,
    };
  });

  const totalBruto = calculatedItems.reduce((acc, item) => acc + item.bruto, 0);
  const totalPPh = calculatedItems.reduce((acc, item) => acc + item.pphNominal, 0);
  const totalPPN = 0;
  const totalNetto = calculatedItems.reduce((acc, item) => acc + item.netto, 0);

  const handleUpdateRow = (id: string, updates: Partial<RecipientRow>) => {
    setRecipients(prev =>
      prev.map(row => (row.id === id ? { ...row, ...updates } : row))
    );
  };

  const handleAddRow = () => {
    const newRow: RecipientRow = {
      id: Date.now().toString(),
      nama: '',
      nip: '',
      golongan: 'III/a',
      jabatan: 'Anggota Tim Pengawas',
      uraianItem: 'Transport Lokal Pengawasan Pasar',
      volume: 1,
      satuan: 'Org/Hari',
      tarifSatuan: 150000,
      pphRate: 0,
      rekening: '',
      bank: 'Bank Mandiri',
    };
    setRecipients(prev => [...prev, newRow]);
  };

  const handleRemoveRow = (id: string) => {
    if (recipients.length <= 1) {
      showToast('Minimal harus ada 1 nama penerima dalam daftar!', 'warning');
      return;
    }
    setRecipients(prev => prev.filter(row => row.id !== id));
  };

  const generateNomorSptb = (dana: SumberDana, dateStr: string) => {
    const month = dateStr.split('-')[1] || '03';
    const randomSeq = Math.floor(100 + Math.random() * 900);
    return `SPTB/${dana}/BBPKAIV/${month}/${randomSeq}`;
  };

  const generateNomorKuitansi = (dana: SumberDana, dateStr: string) => {
    const [year, month] = dateStr.split('-');
    const randomSeq = Math.floor(10 + Math.random() * 90);
    return `KUI/${dana}/${year}/${month}/0${randomSeq}`;
  };

  const handleSubmit = async (targetStatus: 'Draft' | 'Final') => {
    // Validate rows
    const hasEmptyName = recipients.some(r => !r.nama.trim());
    if (hasEmptyName || !kegiatan.trim() || totalBruto <= 0) {
      showToast('Harap lengkapi semua nama anggota tim dan rincian!', 'warning');
      return;
    }

    const penerimaList: PenerimaItem[] = calculatedItems.map((item, idx) => ({
      id: `RCP-PDK-${idx + 1}-${Date.now().toString().slice(-3)}`,
      nama: item.nama,
      nip: item.nip,
      golongan: item.golongan,
      jabatan: item.jabatan,
      uraianItem: item.uraianItem,
      volume: item.volume,
      satuan: item.satuan,
      tarifSatuan: item.tarifSatuan,
      bruto: item.bruto,
      ppnRate: 0,
      ppnNominal: 0,
      pphRate: item.pphRate,
      pphNominal: item.pphNominal,
      netto: item.netto,
      rekening: item.rekening,
      bank: item.bank,
    }));

    const ringkasanPenerima = `Tim Pengawas (${recipients.length} Orang)`;

    try {
    await addTransaksi({
      nomorKuitansi: generateNomorKuitansi(sumberDana, tanggalKuitansi),
      nomorSPTB: generateNomorSptb(sumberDana, tanggalKuitansi),
      tanggalKuitansi,
      sumberDana,
      jenisKuitansi: 'perjadin_dalam_kota',
      kegiatan,
      kodeAkun,
      namaAkun: 'Belanja Perjalanan Dinas Dalam Kota',
      uraian,
      ringkasanPenerima,
      penerimaList,
      totalBruto,
      totalPPN,
      totalPPh,
      totalNetto,
      status: targetStatus,
      sudahSakti: false,
      ppkNama: '',
      ppkNip: '',
      bendaharaNama: '',
      bendaharaNip: '',
      suratTugasNomor,
      tanggalTugas,
      kotaAsal,
      kotaTujuan,
    });

    setActiveView('transaksi');
    } catch (error) {
      // Error already surfaced by AppContext; keep the form open so users can correct it.
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveView('transaksi')}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            title="Kembali ke Daftar Transaksi"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Car className="w-5 h-5 text-blue-600" />
              Form Kuitansi Perjalanan Dinas Dalam Kota (Kolektif)
            </h2>
            <p className="text-xs text-slate-500">
              Pencatatan kuitansi kolektif untuk rombongan tim pengawasan lapangan BBPKA PDN IV
            </p>
          </div>
        </div>
        <span className="text-[11px] font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded">
          Kolektif Multi-Penerima
        </span>
      </div>

      {/* Main Form Body */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
        {/* Section 1: Data Penugasan */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
            1. Dasar Penugasan Tim & Akun Belanja
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sumber Dana
              </label>
              <select
                value={sumberDana}
                disabled={currentRole !== 'bendahara'}
                onChange={e => setSumberDana(e.target.value as SumberDana)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
              >
                <option value="RM">Rupiah Murni (RM)</option>
                <option value="PNBP">PNBP Layanan</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Akun Belanja
              </label>
              <select
                value={kodeAkun}
                onChange={e => setKodeAkun(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="524113">524113 - Belanja Perjalanan Dinas Dalam Kota</option>
                <option value="521211">521211 - Belanja Bahan Transport</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Kuitansi
              </label>
              <input
                type="date"
                value={tanggalKuitansi}
                onChange={e => setTanggalKuitansi(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-slate-50 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor Surat Tugas Tim
              </label>
              <input
                type="text"
                value={suratTugasNomor}
                onChange={e => setSuratTugasNomor(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Tugas
              </label>
              <input
                type="text"
                value={tanggalTugas}
                onChange={e => setTanggalTugas(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lokasi / Wilayah Tujuan
              </label>
              <input
                type="text"
                value={kotaTujuan}
                onChange={e => setKotaTujuan(e.target.value)}
                placeholder="Pasar Kranji, Kota Bekasi"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Kegiatan DIPA
              </label>
              <input
                type="text"
                value={kegiatan}
                onChange={e => setKegiatan(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Uraian Pembayaran Kuitansi
            </label>
            <input
              type="text"
              value={uraian}
              onChange={e => setUraian(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Section 2: Tabel Daftar Penerima Kolektif */}
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                2. Daftar Rincian Penerima Kolektif ({recipients.length} Orang)
              </h3>
              <p className="text-[11px] text-slate-600">
                Setiap anggota tim dicatat pada baris tersendiri dan akan terhubung pada satu SPTB
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddRow}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Penerima
            </button>
          </div>

          <div className="overflow-x-auto mt-3 border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <th className="py-2.5 px-2.5 w-8 text-center">No</th>
                  <th className="py-2.5 px-3 min-w-[160px]">Nama & NIP</th>
                  <th className="py-2.5 px-3 min-w-[110px]">Pangkat/Jabatan</th>
                  <th className="py-2.5 px-3 min-w-[160px]">Uraian Item</th>
                  <th className="py-2.5 px-3 text-center w-28">Vol / Satuan</th>
                  <th className="py-2.5 px-3 text-right min-w-[120px]">Tarif Satuan (Rp)</th>
                  <th className="py-2.5 px-3 text-right min-w-[120px]">Bruto (Rp)</th>
                  <th className="py-2.5 px-3 text-center w-20">PPh (%)</th>
                  <th className="py-2.5 px-3 text-right min-w-[120px]">Netto (Rp)</th>
                  <th className="py-2.5 px-2.5 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {calculatedItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-2.5 text-center font-mono text-slate-400">
                      {idx + 1}
                    </td>

                    {/* Nama & NIP */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        placeholder="Nama pegawai..."
                        value={item.nama}
                        onChange={e => handleUpdateRow(item.id, { nama: e.target.value })}
                        className="w-full px-2 py-1 rounded border border-slate-300 font-medium"
                      />
                      <input
                        type="text"
                        placeholder="NIP / NIK"
                        value={item.nip}
                        onChange={e => handleUpdateRow(item.id, { nip: e.target.value })}
                        className="w-full px-2 py-0.5 rounded border border-slate-200 font-mono text-[11px] text-slate-500 mt-1"
                      />
                    </td>

                    {/* Golongan / Jabatan */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        placeholder="Golongan (III/c)"
                        value={item.golongan}
                        onChange={e => handleUpdateRow(item.id, { golongan: e.target.value })}
                        className="w-full px-2 py-1 rounded border border-slate-300"
                      />
                    </td>

                    {/* Uraian */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={item.uraianItem}
                        onChange={e => handleUpdateRow(item.id, { uraianItem: e.target.value })}
                        className="w-full px-2 py-1 rounded border border-slate-300"
                      />
                    </td>

                    {/* Volume & Satuan */}
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          value={item.volume}
                          onChange={e => handleUpdateRow(item.id, { volume: Number(e.target.value) })}
                          className="w-10 px-1 py-1 rounded border border-slate-300 text-center font-mono"
                        />
                        <span className="text-[10px] text-slate-500">Org/Hr</span>
                      </div>
                    </td>

                    {/* Tarif */}
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        step="10000"
                        value={item.tarifSatuan}
                        onChange={e => handleUpdateRow(item.id, { tarifSatuan: Number(e.target.value) })}
                        className="w-24 px-2 py-1 rounded border border-slate-300 font-mono text-right"
                      />
                    </td>

                    {/* Bruto */}
                    <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800 tabular-nums">
                      {formatRupiah(item.bruto)}
                    </td>

                    {/* PPh % */}
                    <td className="py-2 px-3 text-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.pphRate}
                        onChange={e => handleUpdateRow(item.id, { pphRate: Number(e.target.value) })}
                        className="w-12 px-1 py-1 rounded border border-slate-300 font-mono text-center"
                      />
                    </td>

                    {/* Netto */}
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {formatRupiah(item.netto)}
                    </td>

                    {/* Delete */}
                    <td className="py-2 px-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(item.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Realtime Calculation Summary Banner */}
        <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3">
          <div className="font-bold text-xs text-blue-900 uppercase tracking-wider flex items-center justify-between">
            <span>Ringkasan Total Pembayaran Kuitansi Kolektif</span>
            <span className="text-[11px] font-normal text-blue-700">{recipients.length} Penerima</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 bg-white rounded-lg border border-blue-100">
              <span className="text-slate-500 text-[11px] block">Total Bruto Tim:</span>
              <span className="text-base font-bold font-mono text-slate-900 tabular-nums">
                {formatRupiah(totalBruto)}
              </span>
            </div>
            <div className="p-2.5 bg-white rounded-lg border border-blue-100">
              <span className="text-slate-500 text-[11px] block">Total PPN:</span>
              <span className="text-base font-bold font-mono text-slate-800 tabular-nums">
                {formatRupiah(totalPPN)}
              </span>
            </div>
            <div className="p-2.5 bg-white rounded-lg border border-blue-100">
              <span className="text-slate-500 text-[11px] block">Total PPh Dipotong:</span>
              <span className="text-base font-bold font-mono text-amber-700 tabular-nums">
                {formatRupiah(totalPPh)}
              </span>
            </div>
            <div className="p-2.5 bg-blue-600 text-white rounded-lg shadow-xs">
              <span className="text-blue-100 text-[11px] block">Total Netto Dibayarkan:</span>
              <span className="text-base font-bold font-mono text-white tabular-nums">
                {formatRupiah(totalNetto)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => handleSubmit('Draft')}
            className="w-full sm:w-auto px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4 text-slate-500" />
            <span>Simpan sebagai Draft</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubmit('Final')}
            className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Finalisasi Transaksi</span>
          </button>
        </div>
      </div>
    </div>
  );
};
