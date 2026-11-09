/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatRupiah, formatTanggalIndo, terbilang } from '../../utils/formatters';
import { TandaTerimaIndividual } from '../kuitansi/templates/TandaTerimaIndividual';
import { PerincianBiayaSppdRampung } from '../kuitansi/templates/PerincianBiayaSppdRampung';
import { TandaTerimaKolektif, PenerimaKolektifRow } from '../kuitansi/templates/TandaTerimaKolektif';
import { Printer, X, Receipt, FileText, Download, Loader2, ExternalLink } from 'lucide-react';
import { exportElementToPdf } from '../../utils/pdfGenerator';

export const KuitansiPrintModal: React.FC = () => {
  const { previewKuitansi, setPreviewKuitansi, showToast } = useApp();
  const printAreaRef = React.useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState<boolean>(false);

  if (!previewKuitansi) return null;

  const trx = previewKuitansi;
  const isJasaProfesi = trx.jenisKuitansi === 'jasa_profesi';
  const isKolektif = trx.penerimaList.length > 1 && new Set(trx.penerimaList.map(p => p.nama)).size > 1;

  const preparePrintData = () => {
    const payload = {
      mode: isKolektif ? 'KOLEKTIF' : 'INDIVIDUAL',
      namaSatkerPanjang: 'Balai Besar Pengembangan Kompetensi Aparatur Pemerintahan Dalam Negeri IV',
      namaSatkerPendek: 'BBPK APDN IV',
      namaPenerima: trx.ringkasanPenerima || trx.penerimaList[0]?.nama || 'Penerima',
      nipPenerima: trx.penerimaList[0]?.nip,
      golonganPenerima: trx.penerimaList[0]?.golongan,
      uraianUmum: trx.uraian,
      sumberDana: trx.sumberDana,
      kotaTandaTerima: 'Makassar',
      tanggalKuitansi: trx.tanggalKuitansi,
      tanggalIndo: formatTanggalIndo(trx.tanggalKuitansi),
      ppkNama: trx.ppkNama || 'Saptono Gunason L, S.STP., M.Tr.AP.',
      ppkNip: trx.ppkNip || '199811072020081001',
      bppNama: trx.bendaharaNama || 'Muh. Anugrah Al-Giffary, S.M.',
      bppNip: trx.bendaharaNip || '199906052019121001',
      ...trx,
      penerimaList: trx.penerimaList,
      totalBruto: trx.totalBruto,
      totalPPh: trx.totalPPh,
      totalNetto: trx.totalNetto,
    };
    try {
      sessionStorage.setItem('sip_bp_print_payload_v1', JSON.stringify(payload));
    } catch (e) {
      console.warn('Gagal menyimpan print payload ke sessionStorage:', e);
    }
  };

  // 1. Simpan sebagai PDF (Fitur terpisah dari Cetak Dokumen)
  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    try {
      setIsGeneratingPdf(true);
      showToast('Sedang memproses berkas PDF resmi...', 'info');
      const cleanNomor = (trx.nomorSPPD || trx.nomorSPTB).replace(/[^a-zA-Z0-9]/g, '_');
      const cleanReceiver = (trx.ringkasanPenerima || 'Penerima').split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
      const fileName = isJasaProfesi
        ? isKolektif
          ? `TANDA_TERIMA_Kolektif_${cleanNomor}`
          : `TANDA_TERIMA_${cleanReceiver}_${cleanNomor}`
        : `KUITANSI_${cleanNomor}`;

      await exportElementToPdf(printAreaRef.current, {
        fileName,
        orientation: isKolektif ? 'landscape' : 'portrait',
      });
      showToast('Berkas PDF resmi berhasil dibuat dan diunduh!', 'success');
    } catch (err: any) {
      console.error('Error saat pembuatan PDF client-side:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      showToast(
        `Gagal memproses berkas PDF (${errMsg}). Anda dapat membuka di Tab Baru lalu gunakan menu "Save as PDF".`,
        'error'
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 2. Cetak Dokumen (Murni HTML & @media print, tanpa memanggil generator PDF)
  const handlePrint = () => {
    try {
      window.print();
    } catch (err: any) {
      console.warn('Cetak browser langsung terbatasi lingkungan iframe:', err);
      showToast(
        'Dialog cetak browser dibatasi oleh iframe sandbox. Silakan klik tombol "Buka di Tab Baru" di atas untuk mencetak.',
        'warning'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className={`bg-white rounded-xl shadow-2xl ${isKolektif ? 'max-w-5xl' : isJasaProfesi ? 'max-w-4xl' : 'max-w-3xl'} w-full my-auto overflow-hidden border border-slate-200`}>
        {/* Modal Controls (hidden during print) */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2.5">
            {isJasaProfesi ? (
              <FileText className="w-5 h-5 text-blue-400 shrink-0" />
            ) : (
              <Receipt className="w-5 h-5 text-blue-400 shrink-0" />
            )}
            <div>
              <span className="font-semibold text-sm block">
                {isJasaProfesi ? (isKolektif ? 'Pratinjau Tanda Terima Kolektif' : 'Pratinjau Tanda Terima Individual') : 'Pratinjau Perincian Biaya SPPD Rampung'}
              </span>
              <span className="text-[10px] text-slate-400 block">
                Format resmi A4 · Buka di Tab Baru untuk cetak bebas sandbox iframe
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Buka di Tab Baru untuk Cetak Bebas Iframe */}
            <a
              href={`?print=true&mode=print&id=${trx.id}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={preparePrintData}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Buka dokumen di tab browser baru untuk mencetak langsung tanpa batasan iframe sandbox"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
              <span>Buka di Tab Baru</span>
            </a>
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Unduh dan simpan berkas PDF resmi ke perangkat Anda"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isGeneratingPdf ? 'Membuat PDF...' : 'Simpan / Unduh PDF'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Cetak langsung menggunakan dialog peramban"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Dokumen</span>
            </button>
            <button
              onClick={() => setPreviewKuitansi(null)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Sheet */}
        <div className="max-h-[85vh] overflow-y-auto bg-slate-100 p-4 sm:p-6 print:p-0 print:m-0 print:bg-white print:max-h-none print:overflow-visible">
          <div
            ref={printAreaRef}
            className={`bg-white shadow-md print:shadow-none mx-auto border border-slate-300 print:border-none ${isKolektif ? 'print-landscape' : 'print-portrait'}`}
          >
            {isJasaProfesi ? (
              isKolektif ? (
                // Template 2 Kolektif
                <TandaTerimaKolektif
                  sumberDana={trx.sumberDana}
                  kota="Makassar"
                  tanggalIndo={formatTanggalIndo(trx.tanggalKuitansi)}
                  ppkNama={trx.ppkNama || 'Saptono Gunason L, S.STP., M.Tr.AP.'}
                  ppkNip={trx.ppkNip || '199811072020081001'}
                  bppNama={trx.bendaharaNama || 'Muh. Anugrah Al-Giffary, S.M.'}
                  bppNip={trx.bendaharaNip || '199906052019121001'}
                  rows={trx.penerimaList.map((p, idx) => ({
                    id: p.id || `row-${idx}`,
                    nama: p.nama,
                    untukPembayaran: p.uraianItem || trx.uraian,
                    jp: p.volume,
                    tarifSatuan: p.tarifSatuan,
                    bruto: p.bruto,
                    pph: p.pphNominal,
                    netto: p.netto,
                  }))}
                  totalBruto={trx.totalBruto}
                  totalPPh={trx.totalPPh}
                  totalNetto={trx.totalNetto}
                />
              ) : (
                // Template 1 Individual
                <TandaTerimaIndividual
                  namaPenerima={trx.ringkasanPenerima || trx.penerimaList[0]?.nama || 'Penerima'}
                  nipPenerima={trx.penerimaList[0]?.nip}
                  golonganPenerima={trx.penerimaList[0]?.golongan}
                  uraianKegiatan={trx.uraian}
                  sumberDana={trx.sumberDana}
                  kota="Makassar"
                  tanggalIndo={formatTanggalIndo(trx.tanggalKuitansi)}
                  ppkNama={trx.ppkNama || 'Saptono Gunason L, S.STP., M.Tr.AP.'}
                  ppkNip={trx.ppkNip || '199811072020081001'}
                  bppNama={trx.bendaharaNama || 'Muh. Anugrah Al-Giffary, S.M.'}
                  bppNip={trx.bendaharaNip || '199906052019121001'}
                  sesiList={trx.penerimaList.map(p => ({
                    id: p.id,
                    uraianSesi: p.uraianItem || trx.uraian,
                    volume: p.volume,
                    satuan: p.satuan || 'JP',
                    tarifSatuan: p.tarifSatuan,
                    subtotal: p.bruto,
                  }))}
                  totalBruto={trx.totalBruto}
                  pphRate={trx.totalBruto > 0 ? Math.round((trx.totalPPh / trx.totalBruto) * 100) : 15}
                  pphNominal={trx.totalPPh}
                  totalNetto={trx.totalNetto}
                />
              )
            ) : trx.jenisKuitansi === 'perjadin_luar_kota' ? (
              <PerincianBiayaSppdRampung transaksi={trx} />
            ) : (
              <div className="p-10 text-center text-sm text-slate-600">Template cetak perjalanan dinas dalam kota belum direvisi.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
