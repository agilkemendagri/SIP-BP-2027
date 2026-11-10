/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {PerjadinReceiptPreview} from './PerjadinReceiptPreview';
import type {ExtractedReceiptData} from './KuitansiWithExtractor';
import {usePejabatSettings,signerForFunding} from '../../context/PejabatSettingsContext';
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

export const KuitansiPerjadinLuarKotaForm: React.FC<{extracted?:ExtractedReceiptData}> = ({extracted}) => {
  const { currentRole, addTransaksi, setActiveView, showToast } = useApp();
  const [previewOpen,setPreviewOpen]=useState(false);
  const {value:pejabat,ready:pejabatReady}=usePejabatSettings();

  const defaultSumberDana: SumberDana = currentRole === 'bpp_pnbp' ? 'PNBP' : 'RM';
  const [sumberDana, setSumberDana] = useState<SumberDana>(defaultSumberDana);
  const [tanggalKuitansi, setTanggalKuitansi] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [kodeAkun, setKodeAkun] = useState<string>('524111'); // Belanja Perjalanan Dinas Biasa (Luar Kota)
  const [kegiatan, setKegiatan] = useState<string>(
    ''
  );
  const [uraian, setUraian] = useState<string>(
    ''
  );

  // Data Surat Tugas & Wilayah
  const [suratTugasNomor, setSuratTugasNomor] = useState<string>('');
  const [tanggalTugas, setTanggalTugas] = useState<string>('');
  const [kotaAsal, setKotaAsal] = useState<string>('');
  const [kotaTujuan, setKotaTujuan] = useState<string>('');

  // Identitas Pelaksana
  const [namaPelaksana, setNamaPelaksana] = useState<string>('');
  const [nipPelaksana, setNipPelaksana] = useState<string>('');
  const [golonganPelaksana, setGolonganPelaksana] = useState<string>('');
  const [jabatanPelaksana, setJabatanPelaksana] = useState<string>('');
  const [rekening, setRekening] = useState<string>('');
  const [bank, setBank] = useState<string>('');

  // Rincian Komponen Biaya Perjalanan Dinas
  const [biayaItems, setBiayaItems] = useState<BiayaItem[]>([
    {id:"1",kategori:"Uang Harian",uraian:"",volume:1,satuan:"Hari",tarifSatuan:0}
  ]);

  useEffect(()=>{
   if(!extracted?.rows.length)return;
   const r=extracted.rows;
   if(extracted.date)setTanggalKuitansi(extracted.date);
   if(extracted.account)setKodeAkun(extracted.account);
   setNamaPelaksana(r[0].nama);
   setBiayaItems(r.map((x,i)=>({id:x.id||'ext-'+i,kategori:'Lainnya',uraian:x.uraianItem,volume:x.volume,satuan:x.satuan||'Hari',tarifSatuan:x.tarifSatuan})));
   setPphNominal(r.reduce((n,x)=>n+x.pphNominal,0));
   setPpnNominal(r.reduce((n,x)=>n+x.ppnNominal,0));
   showToast('Data ekstraktor dimasukkan ke formulir Perjadin Luar Kota. Periksa seluruh rincian.','info');
  },[extracted]);
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

  const handleSubmit = async (targetStatus: 'Draft' | 'Final') => {
    if(!pejabatReady){showToast('Konfigurasi pejabat belum tersedia. Buka Administrasi.','warning');return;}
    if (!namaPelaksana.trim() || totalBruto <= 0) {
      showToast('Harap lengkapi nama pelaksana dan rincian biaya!', 'warning');
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

    try {
    await addTransaksi({
      nomorKuitansi: generateNomorKuitansi(sumberDana, tanggalKuitansi),
      nomorSPTB: generateNomorSptb(sumberDana, tanggalKuitansi),
      tanggalKuitansi,
      sumberDana,
      jenisKuitansi: 'perjadin_luar_kota',
      kegiatan: biayaItems.map(x=>x.uraian.trim()).filter(Boolean).join('; ') || 'Perjalanan Dinas Luar Kota',
      kodeAkun,
      namaAkun: 'Belanja Perjalanan Dinas Biasa (Luar Kota)',
      uraian: biayaItems.map(x=>x.uraian.trim()).filter(Boolean).join('; ') || 'Biaya Perjalanan Dinas Luar Kota',
      ringkasanPenerima: namaPelaksana,
      penerimaList,
      totalBruto,
      totalPPN: ppnNominal,
      totalPPh: pphNominal,
      totalNetto,
      status: targetStatus,
      sudahSakti: false,
      ppkNama: pejabat.ppkNama,
      ppkNip: pejabat.ppkNip,
      bendaharaNama: signerForFunding(pejabat,sumberDana).nama,
      bendaharaNip: signerForFunding(pejabat,sumberDana).nip,
      suratTugasNomor: '',
      tanggalTugas: '',
      kotaAsal: '',
      kotaTujuan: '',
    });

    setActiveView('transaksi');
    } catch (error) {
      // Error already surfaced by AppContext; keep the form open so users can correct it.
    }
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
                Pangkat / Golongan (opsional)
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
                Jabatan Pelaksana (opsional)
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
                Rekening Penyaluran (opsional)
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
                Bank (opsional)
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
        <button type="button" onClick={()=>setPreviewOpen(true)} className="rounded-lg border border-blue-300 text-blue-700 px-4 py-2 text-sm font-semibold">Pratinjau Kuitansi</button>
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
      <PerjadinReceiptPreview open={previewOpen} onClose={()=>setPreviewOpen(false)} title="Perjadin Luar Kota" date={tanggalKuitansi} source={sumberDana} account={kodeAkun} ppn={ppnNominal} pph={pphNominal} details={biayaItems.map(x=>({nama:namaPelaksana,uraian:x.uraian||x.kategori,volume:x.volume,satuan:x.satuan,tarif:x.tarifSatuan,bruto:x.volume*x.tarifSatuan,pph:0,netto:x.volume*x.tarifSatuan}))}/>
    </div>
  );
};
