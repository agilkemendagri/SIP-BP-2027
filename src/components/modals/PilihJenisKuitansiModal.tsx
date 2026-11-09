/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import { Briefcase, Plane, Car, X, PlusCircle, ArrowRight } from 'lucide-react';

export const PilihJenisKuitansiModal: React.FC = () => {
  const {
    isCreateKuitansiModalOpen,
    setIsCreateKuitansiModalOpen,
    startNewKuitansi,
    editingTransaksi,
  } = useApp();

  if (!isCreateKuitansiModalOpen) return null;

  const handleSelect = (type: 'kuitansi_profesi' | 'kuitansi_luar_kota' | 'kuitansi_dalam_kota') => {
    if (editingTransaksi && editingTransaksi.status === 'Draft') {
      const confirmLeave = window.confirm(
        `Anda sedang membuka form ${editingTransaksi.nomorSPTB}. Apakah Anda yakin ingin membuat form transaksi baru?`
      );
      if (!confirmLeave) return;
    }
    startNewKuitansi(type);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs no-print">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Pilih Jenis Kuitansi Pembayaran
              </h3>
              <p className="text-[11px] text-slate-500">
                Buat transaksi pengeluaran baru BBPKA PDN IV
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCreateKuitansiModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options List */}
        <div className="p-5 space-y-3">
          {/* Option 1: Jasa Profesi */}
          <button
            onClick={() => handleSelect('kuitansi_profesi')}
            className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition-all flex items-start gap-3.5 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Briefcase className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-slate-900 text-sm group-hover:text-blue-700 transition-colors">
                  Jasa Profesi & Honorarium
                </span>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors shrink-0" />
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Tanda Terima honor narasumber, pemateri, moderator, pengajar, atau pakar ahli (Format Individual & Kolektif).
              </p>
              <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                <span>Akun 522151 / 521213</span>
                <span>·</span>
                <span>JP / Jam Pelajaran</span>
              </div>
            </div>
          </button>

          {/* Option 2: Perjalanan Dinas Luar Kota */}
          <button
            onClick={() => handleSelect('kuitansi_luar_kota')}
            className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition-all flex items-start gap-3.5 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Plane className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-slate-900 text-sm group-hover:text-indigo-700 transition-colors">
                  Perjalanan Dinas Luar Kota
                </span>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors shrink-0" />
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Kuitansi dinas luar kota individual: uang harian, tiket pesawat/kereta, penginapan hotel, dan taksi bandara.
              </p>
              <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                <span>Akun 524111</span>
                <span>·</span>
                <span>Individual SBM</span>
              </div>
            </div>
          </button>

          {/* Option 3: Perjalanan Dinas Dalam Kota */}
          <button
            onClick={() => handleSelect('kuitansi_dalam_kota')}
            className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition-all flex items-start gap-3.5 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Car className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                  Perjalanan Dinas Dalam Kota
                </span>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors shrink-0" />
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Kuitansi transport lokal kolektif multi-petugas pemeriksaan lapangan & pengawasan pasar.
              </p>
              <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                <span>Akun 524113</span>
                <span>·</span>
                <span>Kolektif Multi-Pegawai</span>
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-right">
          <button
            onClick={() => setIsCreateKuitansiModalOpen(false)}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};
