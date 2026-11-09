/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, AlertTriangle, Lock, X } from 'lucide-react';
import { formatTanggalIndo, formatRupiah } from '../../utils/formatters';

export const BulkSaktiModal: React.FC = () => {
  const {
    isBulkSaktiModalOpen,
    setIsBulkSaktiModalOpen,
    selectedForSaktiIds,
    allTransaksi,
    markSaktiBulk,
    saktiBatchReport,
  } = useApp();
  const [busy, setBusy] = useState(false);

  if (!isBulkSaktiModalOpen) return null;

  // Filter only eligible: Final & !sudahSakti
  const selectedTransactions = allTransaksi.filter(t => 
    selectedForSaktiIds.includes(t.id) && t.status === 'Final' && !t.sudahSakti
  );

  const totalBruto = selectedTransactions.reduce((acc, t) => acc + t.totalBruto, 0);

  const handleConfirm = async () => {
    if (busy || selectedTransactions.length===0 || selectedTransactions.length>100) return;
    setBusy(true);
    try { await markSaktiBulk(selectedTransactions.map(t => t.id)); }
    catch { /* Error toast is set by AppContext; keep modal open for retry. */ }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs no-print">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Konfirmasi Penandaan Penggunaan di SAKTI
              </h3>
              <p className="text-[11px] text-slate-500">
                Pencatatan Berita Acara / Penguncian Transaksi Terdaftar di SAKTI
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsBulkSaktiModalOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Warning banner */}
          <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-900">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">
                Perhatian: Transaksi akan Terkunci
              </span>
              <p className="text-[11px] leading-relaxed text-amber-800">
                Transaksi yang telah ditandai 'Sudah Digunakan di SAKTI' akan dikunci secara otomatis di database, sehingga tidak dapat diubah atau dihapus untuk menjaga keutuhan pembukuan bendahara.
              </p>
            </div>
          </div>

          {saktiBatchReport?.failed.length ? (
            <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
              <strong>Hasil penandaan SAKTI: {saktiBatchReport.succeeded.length} berhasil, {saktiBatchReport.failed.length} gagal.</strong>
              <p className="mt-1">Berkas yang gagal tetap dipilih untuk diperiksa. Berkas berhasil sudah terkunci.</p>
              <ul className="mt-2 list-disc pl-5 max-h-32 overflow-y-auto space-y-1">
                {saktiBatchReport.failed.map(item=>{
                  const record=allTransaksi.find(t=>t.id===item.id);
                  return <li key={item.id}>{record?.nomorSPTB||item.id}: {item.message}</li>;
                })}
              </ul>
            </div>
          ) : null}
          {/* Summary count */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <span className="text-slate-500 block text-[11px]">Jumlah Transaksi Terpilih:</span>
              <span className="text-base font-bold text-slate-900 font-mono">
                {selectedTransactions.length} berkas
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-[11px]">Total Nilai Bruto:</span>
              <span className="text-base font-bold text-blue-900 font-mono tabular-nums">
                {formatRupiah(totalBruto)}
              </span>
            </div>
          </div>

          {/* List of SPTB numbers as explicitly required */}
          <div>
            <label className="font-semibold text-slate-800 block mb-1.5">
              Daftar Nomor SPTB yang akan ditandai:
            </label>
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-slate-50/50">
              {selectedTransactions.map((trx, idx) => (
                <div key={trx.id} className="p-2.5 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-mono w-5">{idx + 1}.</span>
                    <div>
                      <span className="font-mono font-semibold text-slate-900 block">
                        {trx.nomorSPTB}
                      </span>
                      <span className="text-slate-500">
                        {trx.ringkasanPenerima} · {formatTanggalIndo(trx.tanggalKuitansi)}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono font-medium text-slate-700 tabular-nums">
                    {formatRupiah(trx.totalBruto)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => setIsBulkSaktiModalOpen(false)}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy || selectedTransactions.length===0 || selectedTransactions.length>100}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5" />
            {busy ? 'Memproses...' : 'Tandai SAKTI & Kunci Transaksi'}
          </button>
        </div>
      </div>
    </div>
  );
};
