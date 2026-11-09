/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { TandaTerimaIndividual } from './templates/TandaTerimaIndividual';
import { TandaTerimaKolektif } from './templates/TandaTerimaKolektif';
import { Printer, Download, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { exportElementToPdf } from '../../utils/pdfGenerator';
import { formatTanggalIndo } from '../../utils/formatters';
import {fetchFinancialTransactions} from '../../lib/sipBpFinance';

export const STORAGE_KEY_PRINT_PAYLOAD = 'sip_bp_print_payload_v1';

export const PrintStandaloneView: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const printAreaRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    // The same-origin opener enables initial sessionStorage cloning for auth.
    // Drop the opener once mounted to prevent later reverse-tab navigation.
    if (window.opener) window.opener = null;
    let active = true;
    const run = async () => {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY_PRINT_PAYLOAD);
        const trxId = new URLSearchParams(window.location.search).get("id");
        if (trxId) {
          // Backend/RLS is the source of truth for saved receipts.
          const rows = await fetchFinancialTransactions();
          const trx = rows.find(t=>t.id===trxId);
          if(!trx) throw new Error("Dokumen tidak ditemukan atau akses ditolak.");
          if(active)setData({...trx,mode:trx.penerimaList.length>1 && new Set(trx.penerimaList.map(p=>p.nama)).size>1?"KOLEKTIF":"INDIVIDUAL"});
        }else if(stored) {
          if(active)setData(JSON.parse(stored));
        }else throw new Error("Data cetak tidak ditemukan. Kembali ke daftar transaksi.");
      }catch(e) {
        if(active)setError(e instanceof Error?e.message:"Gagal memuat dokumen cetak");
      }
    };
    run();
    return ()=>{active=false;};
  },[]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printAreaRef.current || !data) return;
    try {
      setIsExportingPdf(true);
      const isKolektif = data.mode === 'KOLEKTIF';
      const cleanReceiver = (data.namaPenerima || data.ringkasanPenerima || 'Penerima').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = isKolektif
        ? `TANDA_TERIMA_Kolektif_${data.tanggalKuitansi || 'Dokumen'}`
        : `TANDA_TERIMA_${cleanReceiver}_${data.tanggalKuitansi || 'Dokumen'}`;

      await exportElementToPdf(printAreaRef.current, {
        fileName,
        orientation: isKolektif ? 'landscape' : 'portrait',
      });
    } catch (err: any) {
      console.error('Download PDF error in standalone print view:', err);
      alert(`Gagal memproses file PDF: ${err?.message || String(err)}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">Dokumen Cetak Tidak Ditemukan</h2>
          <p className="text-xs text-slate-600">{error}</p>
          <button
            onClick={() => {
              window.location.href = window.location.origin + window.location.pathname;
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke SIP-BP</span>
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-xs text-slate-500">
        Memuat dokumen cetak...
      </div>
    );
  }

  const isKolektif = data.mode === 'KOLEKTIF';

  return (
    <div className="min-h-screen bg-slate-200 print:bg-white text-slate-900 font-sans antialiased">
      {/* Floating Toolbar (Hidden during print) */}
      <div className="sticky top-0 z-50 bg-slate-900 text-white border-b border-slate-800 shadow-md px-4 py-3 no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              window.location.href = window.location.origin + window.location.pathname;
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Aplikasi</span>
          </button>
          <div>
            <h1 className="font-bold text-xs sm:text-sm text-white flex items-center gap-2">
              <span>Halaman Khusus Cetak Tanda Terima Resmi</span>
              <span className="text-[10px] bg-blue-500/30 text-blue-300 border border-blue-400/40 px-1.5 py-0.5 rounded font-mono">
                {isKolektif ? 'A4 Landscape (Kolektif)' : 'A4 Portrait (Individual)'}
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Bebas batasan iframe sandbox · Gunakan menu Destination: "Save as PDF" di dialog cetak browser
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tombol Simpan PDF Client-Side */}
          <button
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Unduh file PDF resmi ke perangkat"
          >
            <Download className="w-4 h-4" />
            <span>{isExportingPdf ? 'Membuat PDF...' : 'Unduh PDF'}</span>
          </button>

          {/* Tombol Cetak Dokumen Browser Langsung */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Buka dialog cetak browser (Ctrl+P)"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Dokumen (Ctrl+P)</span>
          </button>
        </div>
      </div>

      {/* Main Sheet Container */}
      <div className="p-4 sm:p-8 print:p-0 flex justify-center">
        <div
          ref={printAreaRef}
          className={`bg-white shadow-xl print:shadow-none border border-slate-300 print:border-none ${
            isKolektif ? 'print-landscape w-[297mm]' : 'print-portrait w-[210mm]'
          }`}
        >
          {isKolektif ? (
            <TandaTerimaKolektif
              namaInstansiPanjang={data.namaSatkerPanjang}
              namaInstansiPendek={data.namaSatkerPendek}
              sumberDana={data.sumberDana || 'PNBP'}
              kota={data.kotaTandaTerima || data.kota || 'Makassar'}
              tanggalIndo={data.tanggalIndo || (data.tanggalKuitansi ? formatTanggalIndo(data.tanggalKuitansi) : '')}
              ppkNama={data.ppkNama || ''}
              ppkNip={data.ppkNip || ''}
              bppNama={data.bppNama || data.bendaharaNama || ''}
              bppNip={data.bppNip || data.bendaharaNip || ''}
              rows={data.calculatedRowsKolektif || data.rows || (data.penerimaList ? data.penerimaList.map((p: any, idx: number) => ({
                id: p.id || `row-${idx}`,
                nama: p.nama,
                untukPembayaran: p.uraianItem || data.uraian,
                jp: p.volume,
                tarifSatuan: p.tarifSatuan,
                bruto: p.bruto,
                pph: p.pphNominal,
                netto: p.netto,
              })) : [])}
              totalBruto={data.totalBrutoKolektif ?? data.totalBruto ?? 0}
              totalPPh={data.totalPPhKolektif ?? data.totalPPh ?? 0}
              totalNetto={data.totalNettoKolektif ?? data.totalNetto ?? 0}
            />
          ) : (
            <TandaTerimaIndividual
              namaInstansiPanjang={data.namaSatkerPanjang}
              namaInstansiPendek={data.namaSatkerPendek}
              namaPenerima={data.namaPenerima || data.ringkasanPenerima || 'Penerima'}
              nipPenerima={data.nipPenerima || data.penerimaList?.[0]?.nip}
              golonganPenerima={data.golonganPenerima || data.penerimaList?.[0]?.golongan}
              uraianKegiatan={data.uraianUmum || data.uraian || 'Honorarium Jasa Profesi'}
              sumberDana={data.sumberDana || 'PNBP'}
              kota={data.kotaTandaTerima || data.kota || 'Makassar'}
              tanggalIndo={data.tanggalIndo || (data.tanggalKuitansi ? formatTanggalIndo(data.tanggalKuitansi) : '')}
              ppkNama={data.ppkNama || ''}
              ppkNip={data.ppkNip || ''}
              bppNama={data.bppNama || data.bendaharaNama || ''}
              bppNip={data.bppNip || data.bendaharaNip || ''}
              sesiList={data.individualSessionCalculated || data.sesiList || (data.penerimaList ? data.penerimaList.map((p: any, idx: number) => ({
                id: p.id || `sesi-${idx}`,
                uraianSesi: p.uraianItem || data.uraian,
                volume: p.volume,
                satuan: p.satuan || 'JP',
                tarifSatuan: p.tarifSatuan,
                subtotal: p.bruto,
              })) : [])}
              totalBruto={data.totalBrutoIndiv ?? data.totalBruto ?? 0}
              pphRate={data.pphRateIndiv ?? data.penerimaList?.[0]?.pphRate ?? 15}
              pphNominal={data.pphNominalIndiv ?? data.totalPPh ?? 0}
              totalNetto={data.totalNettoIndiv ?? data.totalNetto ?? 0}
            />
          )}
        </div>
      </div>
    </div>
  );
};
