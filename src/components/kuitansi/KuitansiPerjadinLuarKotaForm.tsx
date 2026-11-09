/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SumberDana, PenerimaItem } from '../../types';
import { formatRupiah } from '../../utils/formatters';
import { Plane, Save, CheckCircle2, ArrowLeft, Plus, Trash2, MapPin } from 'lucide-react';

interface BiayaItem {
  id: string;
  kategori: string;
  uraian: string;
  volume: number;
  satuan: string;
  tarifSatuan: number;
}

export const KuitansiPerjadinLuarKotaForm: React.FC = () => {
  const { currentRole, addTransaksi, setActiveView, showToast } = useApp();

  const defaultSumberDana: SumberDana = currentRole === 'bpp_pnbp' ? 'PNBP' : 'RM';
  const [sumberDana, setSumberDana] = useState<SumberDana>(defaultSumberDana);
  const [tanggalKuitansi, setTanggalKuitansi] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [kodeAkun, setKodeAkun] = useState<string>('524111'); // Belanja Perjalanan Dinas Biasa (Luar Kota)
  const [kegiatan, setKegiatan] = useState<string>(
    'Pengawasan dan Pemantauan Stok Bahan Pokok Menjelang Hari Besar Keagamaan'
  );
  const [uraian, setUraian] = useState<string>(
    'Pembayaran Biaya Perjalanan Dinas Pengawasan Pasar Luar Kota ke Surabaya'
  );

  // Data Surat Tugas & Wilayah
  const [suratTugasNomor, setSuratTugasNomor] = useState<string>('ST-088/BBPKAIV/03/2026');
  const [tanggalTugas, setTanggalTugas] = useState<string>('2026-03-24 s.d. 2026-03-26');
  const [kotaAsal, setKotaAsal] = useState<string>('Jakarta');
  const [kotaTujuan, setKotaTujuan] = useState<string>('Surabaya, Jawa Timur');

  // Identitas Pelaksana
  const [namaPelaksana, setNamaPelaksana] = useState<string>('Drs. Agus Setiawan, M.Si.');
  const [nipPelaksana, setNipPelaksana] = useState<string>('19750918 199903 1 002');
  const [golonganPelaksana, setGolonganPelaksana] = useState<string>('IV/a - Pembina');
  const [jabatanPelaksana, setJabatanPelaksana] = useState<string>('Analis Perdagangan Ahli Madya');
  const [rekening, setRekening] = useState<string>('00281928371');
  const [bank, setBank] = useState<string>('Bank BNI');

  // Rincian Komponen Biaya Perjalanan Dinas
  const [biayaItems, setBiayaItems] = useState<BiayaItem[]>([
    {
      id: '1',
      kategori: 'Uang Harian',
      uraian: 'Uang Harian Perjalanan Dinas Surabaya (3 Hari)',
      volume: 3,
      satuan: 'Hari',
      tarifSatuan: 410000,
    },
    {
      id: '2',
      kategori: 'Penginapan',
      uraian: 'Biaya Penginapan Hotel Bintang 3 (2 Malam)',
      volume: 2,
      satuan: 'Kamar/Malam',
      tarifSatuan: 650000,
    },
    {
      id: '3',
      kategori: 'Transportasi',
      uraian: 'Tiket Pesawat PP Jakarta - Surabaya (CGK - SUB)',
      volume: 1,
      satuan: 'Paket PP',
      tarifSatuan: 2450000,
    },
    {
      id: '4',
      kategori: 'Taksi / Lokal',
      uraian: 'Transportasi Taksi Bandara CGK dan SUB (PP)',
      volume: 1,
      satuan: 'Paket',
      tarifSatuan: 340000,
    },
  ]);

  // Pajak (Bisa disimulasikan jika dipungut pajak hotel/tiket)
  const [pphNominal, setPphNominal] = useState<number>(0);
  const [ppnNominal, setPpnNominal] = useState<number>(0);

  // Perhitungan Bruto
  const totalBruto = biayaItems.reduce(
    (acc, item) => acc + item.volume * item.tarifSatuan,
    0
  );
  const totalNetto = totalBruto - pphNominal - ppnNominal;

  const handleUpdateItem = (id: string, updates: Partial<BiayaItem>) => {
    setBiayaItems(prev =>
      prev.map(item => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleAddItem = () => {
    const newItem: BiayaItem = {
      id: Date.now().toString(),
      kategori: 'Lainnya',
      uraian: 'Biaya Tambahan / Uang Representasi',
      volume: 1,
      satuan: 'Paket',
      tarifSatuan: 150000,
    };
    setBiayaItems(prev => [...prev, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    if (biayaItems.length <= 1) {
      showToast('Minimal harus ada 1 rincian biaya!', 'warning');
      return;
    }
    setBiayaItems(prev => prev.filter(item => item.id !== id));
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

  const handleSubmit = (targetStatus: 'Draft' | 'Final') => {
    if (!namaPelaksana.trim() || !kegiatan.trim() || totalBruto <= 0) {
      showToast('Harap lengkapi nama pelaksana, kegiatan, dan rincian biaya!', 'warning');
      return;
    }

    // Convert biayaItems to PenerimaItem list
    const penerimaList: PenerimaItem[] = biayaItems.map((item, idx) => {
      const itemBruto = item.volume * item.tarifSatuan;
      return {
        id: `RCP-PDL-${idx + 1}-${Date.now().toString().slice(-3)}`,
        nama: `${namaPelaksana} (${item.kategori})`,
        nip: nipPelaksana,
        golongan: golonganPelaksana,
        jabatan: jabatanPelaksana,
        uraianItem: item.uraian,
        volume: item.volume,
        satuan: item.satuan,
        tarifSatuan: item.tarifSatuan,
        bruto: itemBruto,
        ppnRate: 0,
        ppnNominal: 0,
        pphRate: 0,
        pphNominal: 0,
        netto: itemBruto,
        rekening,
        bank,
      };
    });

    addTransaksi({
      nomorKuitansi: generateNomorKuitansi(sumberDana, tanggalKuitansi),
      nomorSPTB: generateNomorSptb(sumberDana, tanggalKuitansi),
      tanggalKuitansi,
      sumberDana,
      jenisKuitansi: 'perjadin_luar_kota',
      kegiatan,
      kodeAkun,
      namaAkun: 'Belanja Perjalanan Dinas Biasa (Luar Kota)',
      uraian,
      ringkasanPenerima: namaPelaksana,
      penerimaList,
      totalBruto,
      totalPPN: ppnNominal,
      totalPPh: pphNominal,
      totalNetto,
      status: targetStatus,
      sudahSakti: false,
      ppkNama: 'Ir. Bambang Hermanto, M.M.',
      ppkNip: '19780512 200312 1 002',
      bendaharaNama: 'Siti Aminah, S.E., M.Ak.',
      bendaharaNip: '19850410 200901 2 004',
      suratTugasNomor,
      tanggalTugas,
      kotaAsal,
      kotaTujuan,
    });

    setActiveView('transaksi');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
              <Plane className="w-5 h-5 text-blue-600" />
              Form Kuitansi Perjalanan Dinas Luar Kota (Individual)
            </h2>
            <p className="text-xs text-slate-500">
              Pencatatan rincian biaya perjalanan dinas biasa pegawai BBPKA PDN IV
            </p>
          </div>
        </div>
        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
          Individual
        </span>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
        {/* Section 1: Klasifikasi & Surat Tugas */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
            1. Dasar Penugasan & Klasifikasi Belanja
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
                <option value="524111">524111 - Belanja Perjadin Biasa (Luar Kota)</option>
                <option value="524119">524119 - Belanja Perjadin Paket Meeting Luar Kota</option>
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
                Nomor Surat Tugas (ST)
              </label>
              <input
                type="text"
                value={suratTugasNomor}
                onChange={e => setSuratTugasNomor(e.target.value)}
                placeholder="Contoh: ST-088/BBPKAIV/03/2026"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jadwal / Tanggal Pelaksanaan Tugas
              </label>
              <input
                type="text"
                value={tanggalTugas}
                onChange={e => setTanggalTugas(e.target.value)}
                placeholder="Contoh: 24 s.d. 26 Maret 2026"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kota Asal
              </label>
              <input
                type="text"
                value={kotaAsal}
                onChange={e => setKotaAsal(e.target.value)}
                placeholder="Jakarta"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kota Tujuan
              </label>
              <input
                type="text"
                value={kotaTujuan}
                onChange={e => setKotaTujuan(e.target.value)}
                placeholder="Contoh: Surabaya, Jawa Timur"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 mt-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Kegiatan / DIPA
              </label>
              <input
                type="text"
                value={kegiatan}
                onChange={e => setKegiatan(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Uraian Kuitansi
              </label>
              <input
                type="text"
                value={uraian}
                onChange={e => setUraian(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Identitas Pelaksana */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
            2. Identitas Pelaksana Tugas (Penerima)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Pelaksana Tugas
              </label>
              <input
                type="text"
                value={namaPelaksana}
                onChange={e => setNamaPelaksana(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NIP Pelaksana
              </label>
              <input
                type="text"
                value={nipPelaksana}
                onChange={e => setNipPelaksana(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pangkat / Golongan
              </label>
              <input
                type="text"
                value={golonganPelaksana}
                onChange={e => setGolonganPelaksana(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jabatan Pelaksana
              </label>
              <input
                type="text"
                value={jabatanPelaksana}
                onChange={e => setJabatanPelaksana(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rekening Penyaluran
              </label>
              <input
                type="text"
                value={rekening}
                onChange={e => setRekening(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bank
              </label>
              <input
                type="text"
                value={bank}
                onChange={e => setBank(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Rincian Komponen Biaya SBM */}
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                3. Rincian Komponen Pembayaran Perjalanan Dinas
              </h3>
              <p className="text-[11px] text-slate-600">
                Uang harian, hotel, transportasi riil, dan uang representasi
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Baris
            </button>
          </div>

          <div className="space-y-3 mt-3">
            {biayaItems.map((item, idx) => (
              <div
                key={item.id}
                className="p-3 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-1 sm:grid-cols-12 gap-3 items-center text-xs"
              >
                <div className="sm:col-span-2">
                  <span className="text-[10px] text-slate-600 block">Kategori</span>
                  <input
                    type="text"
                    value={item.kategori}
                    onChange={e => handleUpdateItem(item.id, { kategori: e.target.value })}
                    className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white"
                  />
                </div>

                <div className="sm:col-span-4">
                  <span className="text-[10px] text-slate-600 block">Uraian Komponen</span>
                  <input
                    type="text"
                    value={item.uraian}
                    onChange={e => handleUpdateItem(item.id, { uraian: e.target.value })}
                    className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <span className="text-[10px] text-slate-600 block">Volume & Satuan</span>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      min="1"
                      value={item.volume}
                      onChange={e => handleUpdateItem(item.id, { volume: Number(e.target.value) })}
                      className="w-14 px-1.5 py-1.5 rounded border border-slate-300 text-center font-mono bg-white"
                    />
                    <input
                      type="text"
                      value={item.satuan}
                      onChange={e => handleUpdateItem(item.id, { satuan: e.target.value })}
                      className="w-16 px-1.5 py-1.5 rounded border border-slate-300 text-center bg-white"
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <span className="text-[10px] text-slate-600 block">Tarif Satuan (Rp)</span>
                  <input
                    type="number"
                    step="10000"
                    value={item.tarifSatuan}
                    onChange={e => handleUpdateItem(item.id, { tarifSatuan: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 rounded border border-slate-300 font-mono text-right bg-white"
                  />
                </div>

                <div className="sm:col-span-1 flex justify-end pt-3 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded"
                    title="Hapus baris"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pengaturan Pajak Opsional */}
          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center gap-4 text-xs">
            <span className="font-semibold text-slate-700">Simulasi Pajak (jika ada):</span>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">PPh (Rp):</span>
              <input
                type="number"
                value={pphNominal}
                onChange={e => setPphNominal(Number(e.target.value))}
                className="w-28 px-2 py-1 rounded border border-slate-300 font-mono text-right bg-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">PPN (Rp):</span>
              <input
                type="number"
                value={ppnNominal}
                onChange={e => setPpnNominal(Number(e.target.value))}
                className="w-28 px-2 py-1 rounded border border-slate-300 font-mono text-right bg-white"
              />
            </div>
          </div>
        </div>

        {/* Realtime Calculation Summary Banner */}
        <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3">
          <div className="font-bold text-xs text-blue-900 uppercase tracking-wider flex items-center justify-between">
            <span>Perhitungan Total Kuitansi Perjalanan Dinas</span>
            <span className="text-[11px] font-normal text-blue-700">Real-time</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 bg-white rounded-lg border border-blue-100">
              <span className="text-slate-500 text-[11px] block">Total Bruto:</span>
              <span className="text-base font-bold font-mono text-slate-900 tabular-nums">
                {formatRupiah(totalBruto)}
              </span>
            </div>
            <div className="p-2.5 bg-white rounded-lg border border-blue-100">
              <span className="text-slate-500 text-[11px] block">Potongan PPh:</span>
              <span className="text-base font-bold font-mono text-slate-800 tabular-nums">
                {formatRupiah(pphNominal)}
              </span>
            </div>
            <div className="p-2.5 bg-white rounded-lg border border-blue-100">
              <span className="text-slate-500 text-[11px] block">Potongan PPN:</span>
              <span className="text-base font-bold font-mono text-slate-800 tabular-nums">
                {formatRupiah(ppnNominal)}
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
