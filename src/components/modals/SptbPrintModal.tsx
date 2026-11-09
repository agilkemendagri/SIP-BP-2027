/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatRupiah, formatTanggalIndo, terbilang } from '../../utils/formatters';
import { Printer, X, FileCheck2, ShieldCheck, Download, Loader2 } from 'lucide-react';
import { exportElementToPdf } from '../../utils/pdfGenerator';

export const SptbPrintModal: React.FC = () => {
  const { previewSptb, setPreviewSptb, showToast } = useApp();
  const printAreaRef = React.useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState<boolean>(false);

  if (!previewSptb) return null;

  const trx = previewSptb;

  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    try {
      setIsGeneratingPdf(true);
      showToast('Sedang membuat berkas PDF SPTB...', 'info');
      const cleanNomor = trx.nomorSPTB.replace(/[^a-zA-Z0-9]/g, '_');
      await exportElementToPdf(printAreaRef.current, {
        fileName: `DOKUMEN_${cleanNomor}`,
        orientation: 'portrait',
      });
      showToast('Berkas PDF SPTB berhasil diunduh ke perangkat Anda!', 'success');
    } catch (err) {
      console.error('Gagal membuat PDF SPTB:', err);
      showToast('Gagal memproses berkas PDF SPTB. Silakan coba lagi.', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch (err: any) {
      console.warn('Cetak browser langsung terbatasi lingkungan iframe:', err);
      showToast('Pencetakan dialog browser dibatasi oleh iframe. Silakan tekan Ctrl+P atau gunakan Unduh PDF.', 'warning');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-auto overflow-hidden border border-slate-200">
        {/* Modal Controls Bar (hidden during printing via .no-print) */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-emerald-400" />
            <div>
              <span className="font-semibold text-sm block">
                Pratinjau Dokumen SPTB: {trx.nomorSPTB}
              </span>
              <span className="text-[10px] text-slate-400 block">
                Format resmi A4 · Unduh PDF atau cetak dokumen
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Unduh dan simpan berkas PDF SPTB ke perangkat"
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
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Dokumen</span>
            </button>
            <button
              onClick={() => setPreviewSptb(null)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet (Standard Indonesian Gov SPTB format) */}
        <div
          ref={printAreaRef}
          className="p-8 sm:p-12 text-slate-900 bg-white min-h-[700px] text-xs leading-relaxed font-sans print:p-0 print:m-0 print-portrait"
        >
          {/* Header Kop Resmi */}
          <div className="text-center pb-4 border-b-2 border-slate-900 mb-6">
            <div className="text-xs uppercase tracking-widest text-slate-700 font-semibold">
              KEMENTERIAN DALAM NEGERI REPUBLIK INDONESIA
            </div>
            <div className="text-sm sm:text-base font-bold uppercase tracking-tight text-slate-950 mt-1">
              BALAI BESAR PENGEMBANGAN KOMPETENSI APARATUR PEMERINTAHAN DALAM NEGERI IV
            </div>
            <div className="text-[11px] text-slate-600 mt-1">
              Makassar, Sulawesi Selatan
            </div>
          </div>

          {/* Judul Dokumen */}
          <div className="text-center mb-6">
            <h2 className="text-sm sm:text-base font-bold underline uppercase tracking-wider text-slate-950">
              SURAT PERNYATAAN TANGGUNG JAWAB BELANJA (SPTB)
            </h2>
            <div className="text-xs font-mono font-semibold text-slate-800 mt-1">
              Nomor: {trx.nomorSPTB}
            </div>
          </div>

          {/* Identitas Satker & Anggaran */}
          <div className="grid grid-cols-2 gap-y-1.5 text-xs mb-6 bg-slate-50 p-3 rounded border border-slate-200">
            <div>
              <span className="text-slate-500 inline-block w-36">1. Satuan Kerja (Satker)</span>
              <span className="font-semibold">: BBPKA PDN IV</span>
            </div>
            <div>
              <span className="text-slate-500 inline-block w-36">4. Tanggal Dokumen</span>
              <span className="font-semibold font-mono">: {formatTanggalIndo(trx.tanggalKuitansi)}</span>
            </div>
            <div>
              <span className="text-slate-500 inline-block w-36">2. Sumber Dana</span>
              <span className="font-semibold">: {trx.sumberDana === 'RM' ? 'Rupiah Murni (RM)' : 'PNBP Layanan'}</span>
            </div>
            <div>
              <span className="text-slate-500 inline-block w-36">5. Kode & Nama Akun</span>
              <span className="font-semibold font-mono">: {trx.kodeAkun} - {trx.namaAkun}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500 inline-block w-36">3. Program / Kegiatan</span>
              <span className="font-semibold">: {trx.kegiatan}</span>
            </div>
          </div>

          {/* Klausul Pernyataan Tanggung Jawab Mutlak (SPTJM) */}
          <p className="mb-4 text-justify leading-relaxed">
            Yang bertanda tangan di bawah ini, Pejabat Pembuat Komitmen (PPK) Balai Besar Pengembangan Kompetensi Aparatur Pemerintahan Dalam Negeri IV menyatakan bahwa saya bertanggung jawab penuh atas kebenaran perhitungan, kelengkapan bukti-bukti transaksi, dan pembayaran yang tertera pada daftar rincian di bawah ini sesuai ketentuan perundang-undangan yang berlaku:
          </p>

          {/* Tabel Daftar Rincian Pembayaran / Bukti Belanja */}
          <div className="mb-6 overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse border border-slate-400">
              <thead>
                <tr className="bg-slate-100 text-slate-800 border-b border-slate-400">
                  <th className="p-2 border border-slate-300 text-center w-8">No</th>
                  <th className="p-2 border border-slate-300 min-w-[150px]">Penerima & Identitas</th>
                  <th className="p-2 border border-slate-300 min-w-[200px]">Uraian Pengeluaran</th>
                  <th className="p-2 border border-slate-300 text-right w-24">Bruto (Rp)</th>
                  <th className="p-2 border border-slate-300 text-right w-20">PPN (Rp)</th>
                  <th className="p-2 border border-slate-300 text-right w-20">PPh (Rp)</th>
                  <th className="p-2 border border-slate-300 text-right w-24">Netto (Rp)</th>
                </tr>
              </thead>
              <tbody>
                {trx.penerimaList.map((item, idx) => (
                  <tr key={item.id} className="border-b border-slate-200">
                    <td className="p-2 border border-slate-300 text-center font-mono">{idx + 1}</td>
                    <td className="p-2 border border-slate-300">
                      <div className="font-semibold">{item.nama}</div>
                      {item.nip && item.nip !== '-' && (
                        <div className="text-[10px] text-slate-600 font-mono">NIP: {item.nip}</div>
                      )}
                    </td>
                    <td className="p-2 border border-slate-300">
                      <div>{item.uraianItem || trx.uraian}</div>
                      <div className="text-[10px] text-slate-600">
                        {item.volume} {item.satuan} @ {formatRupiah(item.tarifSatuan)}
                      </div>
                    </td>
                    <td className="p-2 border border-slate-300 text-right font-mono tabular-nums">
                      {formatRupiah(item.bruto)}
                    </td>
                    <td className="p-2 border border-slate-300 text-right font-mono tabular-nums">
                      {formatRupiah(item.ppnNominal)}
                    </td>
                    <td className="p-2 border border-slate-300 text-right font-mono tabular-nums text-amber-900">
                      {formatRupiah(item.pphNominal)}
                    </td>
                    <td className="p-2 border border-slate-300 text-right font-mono font-bold tabular-nums">
                      {formatRupiah(item.netto)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                  <td colSpan={3} className="p-2 border border-slate-300 text-right uppercase">
                    Jumlah Total:
                  </td>
                  <td className="p-2 border border-slate-300 text-right font-mono tabular-nums">
                    {formatRupiah(trx.totalBruto)}
                  </td>
                  <td className="p-2 border border-slate-300 text-right font-mono tabular-nums">
                    {formatRupiah(trx.totalPPN)}
                  </td>
                  <td className="p-2 border border-slate-300 text-right font-mono tabular-nums text-amber-900">
                    {formatRupiah(trx.totalPPh)}
                  </td>
                  <td className="p-2 border border-slate-300 text-right font-mono tabular-nums text-slate-950">
                    {formatRupiah(trx.totalNetto)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Terbilang */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs mb-8">
            <span className="font-semibold text-slate-700">Terbilang (Jumlah Netto): </span>
            <span className="italic font-medium text-slate-900">
              "{terbilang(trx.totalNetto)}"
            </span>
          </div>

          {/* Penutup */}
          <p className="mb-8 text-justify">
            Bukti-bukti pengeluaran yang sah atas transaksi di atas disimpan dan ditatausahakan pada Bendahara Pengeluaran BBPKA PDN IV untuk kelengkapan pertanggungjawaban serta bahan audit aparat pemeriksa fungsional/eksternal.
          </p>

          {/* Tanda Tangan */}
          <div className="grid grid-cols-2 gap-8 text-center pt-2">
            <div>
              <div className="text-slate-600 mb-1">Mengetahui/Menyetujui:</div>
              <div className="font-semibold text-slate-900">Pejabat Pembuat Komitmen (PPK)</div>
              <div className="h-20"></div>
              <div className="font-bold underline text-slate-950">{trx.ppkNama}</div>
              <div className="text-[11px] font-mono text-slate-600">NIP. {trx.ppkNip}</div>
            </div>

            <div>
              <div className="text-slate-600 mb-1">
                Makassar, {formatTanggalIndo(trx.tanggalKuitansi)}
              </div>
              <div className="font-semibold text-slate-900">Bendahara Pengeluaran</div>
              <div className="h-20"></div>
              <div className="font-bold underline text-slate-950">{trx.bendaharaNama}</div>
              <div className="text-[11px] font-mono text-slate-600">NIP. {trx.bendaharaNip}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
