/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { isCollectiveReceipt } from '../../utils/receiptKind';
import { useApp } from '../../context/AppContext';
import { formatRupiah, formatTanggalIndo, terbilang } from '../../utils/formatters';
import { TandaTerimaIndividual } from '../kuitansi/templates/TandaTerimaIndividual';
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
  const isKolektif = isCollectiveReceipt(trx.penerimaList);

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
      ppkNama: trx.ppkNama || '',
      ppkNip: trx.ppkNip || '',
      bppNama: trx.bendaharaNama || '',
      bppNip: trx.bendaharaNip || '',
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
      const cleanNomor = trx.nomorKuitansi.replace(/[^a-zA-Z0-9]/g, '_');
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
                {isJasaProfesi ? (isKolektif ? 'Pratinjau Tanda Terima Kolektif' : 'Pratinjau Tanda Terima Individual') : `Pratinjau Kuitansi Pembayaran (${trx.nomorKuitansi})`}
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
              rel="opener"
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
                  ppkNama={trx.ppkNama || ''}
                  ppkNip={trx.ppkNip || ''}
                  bppNama={trx.bendaharaNama || ''}
                  bppNip={trx.bendaharaNip || ''}
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
                  ppkNama={trx.ppkNama || ''}
                  ppkNip={trx.ppkNip || ''}
                  bppNama={trx.bendaharaNama || ''}
                  bppNip={trx.bendaharaNip || ''}
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
            ) : (
              // Standard Perjalanan Dinas Receipt
              <div className="p-8 sm:p-12 text-slate-900 bg-white text-xs leading-relaxed font-sans print:p-0 print:m-0">
                {/* Header Kop */}
                <div className="flex justify-between items-start pb-4 border-b-2 border-slate-900 mb-6">
                  <div>
                    <div className="text-[11px] font-semibold tracking-wider text-slate-700 uppercase">
                      BBPKA PDN IV
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-slate-950 uppercase tracking-tight">
                      Balai Besar Pengembangan Kompetensi Aparatur Pemerintahan Dalam Negeri IV
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <div className="font-semibold text-slate-900">
                      Tahun Anggaran: {trx.tanggalKuitansi.split('-')[0] || '2026'}
                    </div>
                    <div className="text-slate-600">
                      Mata Anggaran: <strong className="text-slate-900">{trx.kodeAkun}</strong>
                    </div>
                  </div>
                </div>

                {/* Receipt Title & Proof Number (ONLY Kuitansi Number, NEVER SPTB Number) */}
                <div className="text-center mb-6">
                  <h2 className="text-base sm:text-lg font-bold tracking-wider uppercase underline text-slate-950">
                    KUITANSI / BUKTI PEMBAYARAN
                  </h2>
                  <div className="text-xs font-mono font-semibold text-slate-700 mt-1">
                    Nomor Bukti: {trx.nomorKuitansi}
                  </div>
                </div>

                {/* Body Fields */}
                <div className="space-y-4 text-xs">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center">
                    <span className="w-44 font-semibold text-slate-700 shrink-0">
                      Sudah Terima Dari
                    </span>
                    <span className="font-semibold text-slate-900">
                      : Kuasa Pengguna Anggaran / Pejabat Pembuat Komitmen BBPKA PDN IV
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start">
                    <span className="w-44 font-semibold text-slate-700 shrink-0">
                      Jumlah Uang
                    </span>
                    <div className="flex-1 bg-slate-50 border border-slate-200 p-2.5 rounded">
                      <span className="font-bold text-slate-950 font-mono text-sm block">
                        : {formatRupiah(trx.totalNetto)}
                      </span>
                      <span className="italic text-slate-800 text-[11px] block mt-1">
                        (Terbilang: {terbilang(trx.totalNetto)})
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start">
                    <span className="w-44 font-semibold text-slate-700 shrink-0">
                      Untuk Pembayaran
                    </span>
                    <div className="flex-1">
                      <p className="text-slate-900 font-medium leading-relaxed">
                        : {trx.uraian} pada kegiatan {trx.kegiatan}
                      </p>
                      {trx.suratTugasNomor && (
                        <p className="text-[11px] text-slate-600 mt-1 font-mono">
                          Dasar Surat Tugas: {trx.suratTugasNomor} ({trx.tanggalTugas})
                        </p>
                      )}

                      {trx.penerimaList && trx.penerimaList.length > 1 && (
                        <div className="mt-3 overflow-x-auto">
                          <table className="w-full text-left text-[11px] border-collapse border border-slate-300">
                            <thead>
                              <tr className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-300">
                                <th className="p-1.5 border border-slate-300 text-center w-8">No</th>
                                <th className="p-1.5 border border-slate-300">Rincian Item</th>
                                <th className="p-1.5 border border-slate-300 text-center w-24">Volume</th>
                                <th className="p-1.5 border border-slate-300 text-right w-28">Tarif Satuan</th>
                                <th className="p-1.5 border border-slate-300 text-right w-32">Subtotal Bruto</th>
                              </tr>
                            </thead>
                            <tbody>
                              {trx.penerimaList.map((item, idx) => (
                                <tr key={item.id} className="border-b border-slate-200">
                                  <td className="p-1.5 border border-slate-300 text-center font-mono">{idx + 1}</td>
                                  <td className="p-1.5 border border-slate-300">{item.uraianItem}</td>
                                  <td className="p-1.5 border border-slate-300 text-center font-mono">
                                    {item.volume} {item.satuan}
                                  </td>
                                  <td className="p-1.5 border border-slate-300 text-right font-mono tabular-nums">
                                    {formatRupiah(item.tarifSatuan)}
                                  </td>
                                  <td className="p-1.5 border border-slate-300 text-right font-mono font-semibold tabular-nums">
                                    {formatRupiah(item.bruto)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start">
                    <span className="w-44 font-semibold text-slate-700 shrink-0">
                      Sumber Pembiayaan
                    </span>
                    <span className="text-slate-900 font-semibold">
                      : DIPA BBPKA PDN IV (Dana {trx.sumberDana === 'RM' ? 'Rupiah Murni' : 'PNBP Layanan'})
                    </span>
                  </div>

                  {/* Rincian Pemotongan Pajak */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5 mt-2">
                    <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
                      Rincian Perhitungan Keuangan & Pajak:
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>1. Jumlah Bruto Pengeluaran</span>
                      <span className="font-mono font-semibold tabular-nums">
                        {formatRupiah(trx.totalBruto)}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>2. Potongan PPN</span>
                      <span className="font-mono tabular-nums text-slate-700">
                        {formatRupiah(trx.totalPPN)}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>3. Potongan PPh</span>
                      <span className="font-mono tabular-nums text-amber-900">
                        {formatRupiah(trx.totalPPh)}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold pt-1 text-slate-950">
                      <span>Jumlah Bersih (Netto) Diterima</span>
                      <span className="font-mono text-sm tabular-nums">
                        {formatRupiah(trx.totalNetto)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tanda Tangan */}
                <div className="mt-10 pt-4 border-t border-slate-200">
                  <div className="text-right text-xs text-slate-700 mb-4">
                    Jakarta, {formatTanggalIndo(trx.tanggalKuitansi)}
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center text-xs">
                    <div>
                      <div className="text-slate-600">Setuju Dibayar:</div>
                      <div className="font-semibold text-slate-900">Pejabat Pembuat Komitmen</div>
                      <div className="h-20"></div>
                      <div className="font-bold underline text-slate-950">{trx.ppkNama}</div>
                      <div className="text-[10px] font-mono text-slate-600">NIP. {trx.ppkNip}</div>
                    </div>

                    <div>
                      <div className="text-slate-600">Lunas Dibayar Tgl:</div>
                      <div className="font-semibold text-slate-900">Bendahara Pengeluaran</div>
                      <div className="h-20"></div>
                      <div className="font-bold underline text-slate-950">{trx.bendaharaNama}</div>
                      <div className="text-[10px] font-mono text-slate-600">NIP. {trx.bendaharaNip}</div>
                    </div>

                    <div>
                      <div className="text-slate-600">Diterima oleh:</div>
                      <div className="font-semibold text-slate-900">Penerima Uang</div>
                      <div className="h-20"></div>
                      <div className="font-bold underline text-slate-950">
                        {trx.ringkasanPenerima}
                      </div>
                      <div className="text-[10px] text-slate-500">Penerima / Ketua Tim</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
