/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import type {ExtractedReceiptData} from './KuitansiWithExtractor';
import {usePejabatSettings,signerForFunding} from '../../context/PejabatSettingsContext';
import { SumberDana, PenerimaItem, Transaksi } from '../../types';
import { DAFTAR_AKUN } from '../../data/mockData';
import { formatRupiah, formatTanggalIndo, formatNumberCommas } from '../../utils/formatters';
import { TandaTerimaIndividual } from './templates/TandaTerimaIndividual';
import { TandaTerimaKolektif, PenerimaKolektifRow } from './templates/TandaTerimaKolektif';
import { exportElementToPdf } from '../../utils/pdfGenerator';
import {
  Briefcase,
  Save,
  CheckCircle2,
  Calculator,
  ArrowLeft,
  Plus,
  Trash2,
  Eye,
  Printer,
  Download,
  Loader2,
  X,
  Users,
  User,
  Sliders,
  Check,
  AlertCircle,
  RotateCcw,
  FileEdit,
  ExternalLink,
} from 'lucide-react';

export interface SesiHonorItem {
  id: string;
  uraianSesi: string;
  volume: number;
  satuan: string;
  tarifSatuan: number;
}

export interface KolektifInputRow {
  id: string;
  nama: string;
  nip: string;
  golongan: string;
  untukPembayaran: string;
  jp: number;
  tarifSatuan: number;
  pphRate: number;
  customPphNominal: number | null;
}

export const KuitansiProfesiForm: React.FC<{extracted?:ExtractedReceiptData}> = ({extracted}) => {
  const {value:pejabat,ready:pejabatReady}=usePejabatSettings();
  const {
    currentRole,
    addTransaksi,
    updateTransaksi,
    editingTransaksi,
    setEditingTransaksi,
    generateNextTransactionNumbers,
    setActiveView,
    showToast,
  } = useApp();

  // Pilihan Jenis Dokumen: Individual atau Kolektif
  const [jenisDokumen, setJenisDokumen] = useState<'INDIVIDUAL' | 'KOLEKTIF'>('INDIVIDUAL');

  // Sumber Dana (RM / PNBP)
  const defaultSumberDana: SumberDana = currentRole === 'bpp_pnbp' ? 'PNBP' : 'RM';
  const [sumberDana, setSumberDana] = useState<SumberDana>(defaultSumberDana);

  // Tanggal Kuitansi & Kode Akun
  const [tanggalKuitansi, setTanggalKuitansi] = useState<string>(new Date().toISOString().slice(0,10));
  const [kodeAkun, setKodeAkun] = useState<string>('522151'); // Belanja Jasa Profesi
  const [kegiatan, setKegiatan] = useState<string>('');
  const [uraianUmum, setUraianUmum] = useState<string>('');

  // Konfigurasi terpusat hanya disunting dari Administrasi.
  const kotaTandaTerima=pejabat.kota;
  const namaSatkerPanjang=pejabat.satkerPanjang;
  const namaSatkerPendek=pejabat.satkerPendek;
  const ppkNama=pejabat.ppkNama;
  const ppkNip=pejabat.ppkNip;
  const selectedBpp=signerForFunding(pejabat,sumberDana);
  const bppNama=selectedBpp.nama;
  const bppNip=selectedBpp.nip;

  // ==========================================
  // STATE MODE 1: INDIVIDUAL
  // ==========================================
  const [klasifikasiPenerima, setKlasifikasiPenerima] = useState<'ASN' | 'NON_ASN'>('NON_ASN');
  const [namaPenerima, setNamaPenerima] = useState<string>('');
  const [nipPenerima, setNipPenerima] = useState<string>('-');
  const [golonganPenerima, setGolonganPenerima] = useState<string>('');
  const [jabatanPenerima, setJabatanPenerima] = useState<string>('');
  const [npwp, setNpwp] = useState<string>('');
  const [rekening, setRekening] = useState<string>('');
  const [bank, setBank] = useState<string>('');

  // Sesi Honorarium Individual (Tabel Dinamis)
  // Default data sesuai validasi: 3 JP x Rp 200.000 = Bruto Rp 600.000, PPh Rp 90.000 (15%), Netto Rp 510.000
  const [sesiIndividual, setSesiIndividual] = useState<SesiHonorItem[]>([
    {id:"sesi-indiv-1",uraianSesi:"",volume:1,satuan:"JP",tarifSatuan:0}
  ]);

  const [pphRateIndiv, setPphRateIndiv] = useState<number>(0);
  const [customPphNominalIndiv, setCustomPphNominalIndiv] = useState<number | null>(null);
  const [ppnRateIndiv, setPpnRateIndiv] = useState<number>(0);

  // Perhitungan Subtotal Individual
  const individualSessionCalculated = useMemo(() => {
    return sesiIndividual.map(s => {
      const vol = Math.max(0, s.volume || 0);
      const tarif = Math.max(0, s.tarifSatuan || 0);
      return {
        ...s,
        volume: vol,
        tarifSatuan: tarif,
        subtotal: vol * tarif,
      };
    });
  }, [sesiIndividual]);

  const totalBrutoIndiv = useMemo(() => {
    return individualSessionCalculated.reduce((acc, s) => acc + s.subtotal, 0);
  }, [individualSessionCalculated]);

  const pphNominalIndiv = useMemo(() => {
    if (customPphNominalIndiv !== null) return Math.max(0, customPphNominalIndiv);
    return Math.round((totalBrutoIndiv * Math.max(0, pphRateIndiv)) / 100);
  }, [totalBrutoIndiv, pphRateIndiv, customPphNominalIndiv]);

  const totalNettoIndiv = useMemo(() => {
    return Math.max(0, totalBrutoIndiv - pphNominalIndiv);
  }, [totalBrutoIndiv, pphNominalIndiv]);

  // ==========================================
  // STATE MODE 2: KOLEKTIF
  // ==========================================
  // Default data kolektif diambil dari PDF 2 referensi untuk validasi langsung
  const [rowsKolektif, setRowsKolektif] = useState<KolektifInputRow[]>([
    {id:"kol-1",nama:"",nip:"",golongan:"",untukPembayaran:"",jp:1,tarifSatuan:0,pphRate:0,customPphNominal:null}
  ]);

  // Perhitungan Baris Kolektif (Reaktif & Tanpa Perhitungan Ganda)
  const calculatedRowsKolektif = useMemo<PenerimaKolektifRow[]>(() => {
    return rowsKolektif.map(r => {
      const jp = Math.max(0, r.jp || 0);
      const tarif = Math.max(0, r.tarifSatuan || 0);
      const bruto = jp * tarif;
      const pph = r.customPphNominal !== null ? Math.max(0, r.customPphNominal) : Math.round((bruto * Math.max(0, r.pphRate)) / 100);
      const netto = Math.max(0, bruto - pph);
      return {
        id: r.id,
        nama: r.nama,
        untukPembayaran: r.untukPembayaran,
        jp,
        tarifSatuan: tarif,
        bruto,
        pph,
        netto,
      };
    });
  }, [rowsKolektif]);

  const totalBrutoKolektif = useMemo(() => {
    return calculatedRowsKolektif.reduce((acc, r) => acc + r.bruto, 0);
  }, [calculatedRowsKolektif]);

  const totalPPhKolektif = useMemo(() => {
    return calculatedRowsKolektif.reduce((acc, r) => acc + r.pph, 0);
  }, [calculatedRowsKolektif]);

  const totalNettoKolektif = useMemo(() => {
    return calculatedRowsKolektif.reduce((acc, r) => acc + r.netto, 0);
  }, [calculatedRowsKolektif]);

  useEffect(()=>{
    if(!extracted?.rows.length)return;
    if(extracted.date)setTanggalKuitansi(extracted.date);
    if(extracted.account)setKodeAkun(extracted.account);
    const rows=extracted.rows;
    const distinct=new Set(rows.map(r=>r.nama.trim().toLowerCase()));
    if(distinct.size===1){
      setJenisDokumen('INDIVIDUAL');
      setNamaPenerima(rows[0].nama);
      setSesiIndividual(rows.map((r,i)=>({id:r.id||'ext-'+i,uraianSesi:r.uraianItem,volume:r.volume,satuan:r.satuan||'JP',tarifSatuan:r.tarifSatuan})));
      setCustomPphNominalIndiv(rows.reduce((n,r)=>n+r.pphNominal,0));
      setPphRateIndiv(rows[0].bruto?rows[0].pphNominal/rows[0].bruto*100:0);
    } else {
      setJenisDokumen('KOLEKTIF');
      setRowsKolektif(rows.map((r,i)=>({id:r.id||'ext-'+i,nama:r.nama,nip:'',golongan:'',untukPembayaran:r.uraianItem,jp:r.volume,tarifSatuan:r.tarifSatuan,pphRate:r.bruto?r.pphNominal/r.bruto*100:0,customPphNominal:r.pphNominal})));
    }
    showToast('Rincian hasil ekstraksi telah dimasukkan ke formulir Jasa Profesi. Periksa sebelum simpan.','info');
  },[extracted]);
  // Modal Pratinjau Tanda Terima
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);

  // Reaktif terhadap perubahan editingTransaksi (misal saat dibuka dari Daftar Transaksi)
  useEffect(() => {
    if (editingTransaksi && editingTransaksi.jenisKuitansi === 'jasa_profesi') {
      setTanggalKuitansi(editingTransaksi.tanggalKuitansi || new Date().toISOString().slice(0,10));
      setSumberDana(editingTransaksi.sumberDana || 'PNBP');
      setKodeAkun(editingTransaksi.kodeAkun || '522151');
      setKegiatan(editingTransaksi.kegiatan || '');
      setUraianUmum(editingTransaksi.uraian || '');

      const uniqueRecipients = new Set(editingTransaksi.penerimaList.map(p => p.nama.trim()));
      const isMulti = editingTransaksi.penerimaList.length > 1 && uniqueRecipients.size > 1;

      if (isMulti) {
        setJenisDokumen('KOLEKTIF');
        setRowsKolektif(
          editingTransaksi.penerimaList.map((p, idx) => ({
            id: p.id || `kol-${idx}-${Date.now()}`,
            nama: p.nama,
            nip: p.nip || '-',
            golongan: p.golongan || 'Non-ASN',
            untukPembayaran: p.uraianItem || editingTransaksi.uraian,
            jp: p.volume || 1,
            tarifSatuan: p.tarifSatuan || 0,
            pphRate: p.pphRate || 15,
            customPphNominal: p.pphNominal !== undefined ? p.pphNominal : null,
          }))
        );
      } else {
        setJenisDokumen('INDIVIDUAL');
        const first = editingTransaksi.penerimaList[0];
        if (first) {
          setNamaPenerima(first.nama || '');
          setNipPenerima(first.nip || '-');
          setGolonganPenerima(first.golongan || 'Non-ASN / Praktisi');
          setJabatanPenerima(first.jabatan || '');
          setNpwp(first.npwp || '');
          setRekening(first.rekening || '');
          setBank(first.bank || '');
          setKlasifikasiPenerima(first.nip && first.nip !== '-' ? 'ASN' : 'NON_ASN');
          setPphRateIndiv(first.pphRate || 15);
          setCustomPphNominalIndiv(editingTransaksi.totalPPh);

          if (editingTransaksi.penerimaList.length > 0) {
            setSesiIndividual(
              editingTransaksi.penerimaList.map((p, idx) => ({
                id: p.id || `sesi-indiv-${idx}`,
                uraianSesi: p.uraianItem || editingTransaksi.uraian,
                volume: p.volume || 1,
                satuan: p.satuan || 'JP',
                tarifSatuan: p.tarifSatuan || 0,
              }))
            );
          }
        }
      }
    }
  }, [editingTransaksi]);

  const handleResetForm = () => {
    setEditingTransaksi(null);
    setJenisDokumen('INDIVIDUAL');
    setNamaPenerima('');
    setNipPenerima('-');
    setGolonganPenerima('Non-ASN / Praktisi');
    setJabatanPenerima('');
    setNpwp('');
    setRekening('');
    setBank('');
    setSesiIndividual([
      {
        id: `sesi-indiv-${Date.now()}`,
        uraianSesi: '',
        volume: 1,
        satuan: 'JP',
        tarifSatuan: 0,
      },
    ]);
    setPphRateIndiv(15);
    setCustomPphNominalIndiv(null);
    setKegiatan('');
    setUraianUmum('');
    showToast('Formulir telah di-reset ke kondisi awal yang bersih.', 'info');
  };

  // ==========================================
  // HANDLERS TABEL DINAMIS INDIVIDUAL
  // ==========================================
  const handleAddSesiIndividual = () => {
    const nextIdx = sesiIndividual.length + 1;
    const newSesi: SesiHonorItem = {
      id: `sesi-indiv-${Date.now()}`,
      uraianSesi: `Honor pemateri sesi ${nextIdx} pada ${kegiatan}`,
      volume: 2,
      satuan: 'JP',
      tarifSatuan: 200000,
    };
    setSesiIndividual(prev => [...prev, newSesi]);
  };

  const handleRemoveSesiIndividual = (id: string) => {
    if (sesiIndividual.length <= 1) {
      showToast('Minimal harus ada satu baris rincian sesi!', 'warning');
      return;
    }
    setSesiIndividual(prev => prev.filter(s => s.id !== id));
  };

  const handleUpdateSesiIndividual = (id: string, updates: Partial<SesiHonorItem>) => {
    setSesiIndividual(prev =>
      prev.map(s => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  // ==========================================
  // HANDLERS TABEL KOLEKTIF
  // ==========================================
  const handleAddRowKolektif = () => {
    const nextNo = rowsKolektif.length + 1;
    const newRow: KolektifInputRow = {
      id: `kol-${Date.now()}`,
      nama: '',
      nip: '-',
      golongan: 'Non-ASN',
      untukPembayaran: `Honor pemateri sesi ${nextNo} pada ${kegiatan}`,
      jp: 2,
      tarifSatuan: 200000,
      pphRate: 15,
      customPphNominal: null,
    };
    setRowsKolektif(prev => [...prev, newRow]);
  };

  const handleRemoveRowKolektif = (id: string) => {
    if (rowsKolektif.length <= 1) {
      showToast('Minimal harus ada satu baris pembayaran kolektif!', 'warning');
      return;
    }
    setRowsKolektif(prev => prev.filter(r => r.id !== id));
  };

  const handleUpdateRowKolektif = (id: string, updates: Partial<KolektifInputRow>) => {
    setRowsKolektif(prev =>
      prev.map(r => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  // ==========================================
  // SIMPAN TRANSAKSI (DRAFT / FINAL)
  // ==========================================
  const handleSubmit = async (targetStatus: 'Draft' | 'Final') => {
    if(!pejabatReady){showToast('Konfigurasi pejabat belum tersedia. Buka Administrasi.','warning');return;}
    // 1. Validasi Data
    if (targetStatus === 'Final') {

      if (jenisDokumen === 'INDIVIDUAL') {
        if (!namaPenerima.trim()) {
          showToast('Nama penerima wajib diisi sebelum finalisasi transaksi!', 'warning');
          return;
        }
        if (totalBrutoIndiv <= 0) {
          showToast('Total bruto honorarium harus lebih dari Rp 0 untuk finalisasi!', 'warning');
          return;
        }
      } else {
        const hasEmptyName = rowsKolektif.some(r => !r.nama.trim());
        if (hasEmptyName) {
          showToast('Seluruh nama penerima pada tabel kolektif wajib diisi sebelum finalisasi!', 'warning');
          return;
        }
        if (totalBrutoKolektif <= 0) {
          showToast('Total bruto honorarium kolektif harus lebih dari Rp 0 untuk finalisasi!', 'warning');
          return;
        }
      }
    } else {
      // Validasi minimal saat Simpan Draft
      if (jenisDokumen === 'INDIVIDUAL' && !namaPenerima.trim() && !sesiIndividual.some(x=>x.uraianSesi.trim())) {
        showToast('Harap isi minimal nama penerima atau kegiatan untuk menyimpan Draft!', 'warning');
        return;
      }
    }

    // 2. Nomor Kuitansi & SPTB (Pertahankan jika mode Edit Draft, alokasikan nomor urut jika Baru)
    let finalNomorKuitansi = editingTransaksi?.nomorKuitansi;
    let finalNomorSPTB = editingTransaksi?.nomorSPTB;

    if (!finalNomorKuitansi || !finalNomorSPTB) {
      const generated = generateNextTransactionNumbers(sumberDana, tanggalKuitansi);
      finalNomorKuitansi = generated.nomorKuitansi;
      finalNomorSPTB = generated.nomorSPTB;
    }

    try {
    if (jenisDokumen === 'INDIVIDUAL') {
      const penerimaList: PenerimaItem[] = individualSessionCalculated.map((s, idx) => {
        const ratio = totalBrutoIndiv > 0 ? s.subtotal / totalBrutoIndiv : 0;
        const itemPPh = Math.round(pphNominalIndiv * ratio);
        return {
          id: `RCP-INDIV-${idx + 1}-${Date.now().toString().slice(-4)}`,
          nama: namaPenerima.trim() || 'Draft Penerima',
          nip: nipPenerima || '-',
          golongan: golonganPenerima,
          jabatan: jabatanPenerima,
          uraianItem: s.uraianSesi || uraianUmum || 'Honorarium Jasa Profesi',
          volume: s.volume,
          satuan: s.satuan,
          tarifSatuan: s.tarifSatuan,
          bruto: s.subtotal,
          ppnRate: 0,
          ppnNominal: 0,
          pphRate: pphRateIndiv,
          pphNominal: itemPPh,
          netto: s.subtotal - itemPPh,
          npwp,
          rekening,
          bank,
        };
      });

      const payload = {
        nomorKuitansi: finalNomorKuitansi,
        nomorSPTB: finalNomorSPTB,
        tanggalKuitansi,
        sumberDana,
        jenisKuitansi: 'jasa_profesi' as const,
        kegiatan: sesiIndividual[0]?.uraianSesi.trim() || 'Honorarium Jasa Profesi',
        kodeAkun,
        namaAkun: kodeAkun === '522151' ? 'Belanja Jasa Profesi' : 'Belanja Honor Output Kegiatan',
        uraian: sesiIndividual.map(x=>x.uraianSesi.trim()).filter(Boolean).join('; ') || 'Honorarium Jasa Profesi',
        ringkasanPenerima: namaPenerima.trim() || 'Draft Penerima',
        penerimaList,
        totalBruto: totalBrutoIndiv,
        totalPPN: 0,
        totalPPh: pphNominalIndiv,
        totalNetto: totalNettoIndiv,
        status: targetStatus,
        sudahSakti: editingTransaksi ? editingTransaksi.sudahSakti : false,
        ppkNama,
        ppkNip,
        bendaharaNama: bppNama,
        bendaharaNip: bppNip,
      };

      if (editingTransaksi) {
        await updateTransaksi(editingTransaksi.id, payload);
      } else {
        await addTransaksi(payload);
      }
    } else {
      // KOLEKTIF
      const penerimaList: PenerimaItem[] = calculatedRowsKolektif.map((r, idx) => ({
        id: `RCP-KOL-${idx + 1}-${Date.now().toString().slice(-4)}`,
        nama: r.nama.trim() || `Draft Penerima ${idx + 1}`,
        nip: '-',
        uraianItem: r.untukPembayaran || uraianUmum || kegiatan,
        volume: r.jp,
        satuan: 'JP',
        tarifSatuan: r.tarifSatuan,
        bruto: r.bruto,
        ppnRate: 0,
        ppnNominal: 0,
        pphRate: 15,
        pphNominal: r.pph,
        netto: r.netto,
      }));

      // Ambil nama penerima unik untuk ringkasan
      const uniqueNames = Array.from(new Set(rowsKolektif.map(r => r.nama.trim()))).filter(Boolean);
      const ringkasanPenerima =
        uniqueNames.length === 0
          ? 'Draft Kolektif'
          : uniqueNames.length <= 2
          ? uniqueNames.join(', ')
          : `${uniqueNames[0]} dkk (${rowsKolektif.length} rincian)`;

      const payload = {
        nomorKuitansi: finalNomorKuitansi,
        nomorSPTB: finalNomorSPTB,
        tanggalKuitansi,
        sumberDana,
        jenisKuitansi: 'jasa_profesi' as const,
        kegiatan: rowsKolektif[0]?.untukPembayaran.trim() || 'Honorarium Jasa Profesi Kolektif',
        kodeAkun,
        namaAkun: kodeAkun === '522151' ? 'Belanja Jasa Profesi' : 'Belanja Honor Output Kegiatan',
        uraian: rowsKolektif.map(x=>x.untukPembayaran.trim()).filter(Boolean).join('; ') || 'Honorarium Jasa Profesi Kolektif',
        ringkasanPenerima,
        penerimaList,
        totalBruto: totalBrutoKolektif,
        totalPPN: 0,
        totalPPh: totalPPhKolektif,
        totalNetto: totalNettoKolektif,
        status: targetStatus,
        sudahSakti: editingTransaksi ? editingTransaksi.sudahSakti : false,
        ppkNama,
        ppkNip,
        bendaharaNama: bppNama,
        bendaharaNip: bppNip,
      };

      if (editingTransaksi) {
        await updateTransaksi(editingTransaksi.id, payload);
      } else {
        await addTransaksi(payload);
      }
    }

    setEditingTransaksi(null);
    setActiveView('transaksi');
    } catch (error) {
      // Keep the form open when the server rejects the operation.
    }
  };

  const printAreaRef = React.useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Menyiapkan payload untuk tab cetak mandiri
  const preparePrintData = () => {
    const payload = {
      mode: jenisDokumen,
      namaSatkerPanjang,
      namaSatkerPendek,
      namaPenerima,
      nipPenerima,
      golonganPenerima,
      uraianUmum: individualSessionCalculated.map(s=>s.uraianSesi.trim()).filter(Boolean).join('; '),
      sumberDana,
      kotaTandaTerima,
      tanggalKuitansi,
      tanggalIndo: formatTanggalIndo(tanggalKuitansi),
      ppkNama,
      ppkNip,
      bppNama,
      bppNip,
      individualSessionCalculated,
      totalBrutoIndiv,
      pphRateIndiv,
      pphNominalIndiv,
      totalNettoIndiv,
      calculatedRowsKolektif,
      totalBrutoKolektif,
      totalPPhKolektif,
      totalNettoKolektif,
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
      const cleanReceiver = (namaPenerima || 'Penerima').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName =
        jenisDokumen === 'INDIVIDUAL'
          ? `TANDA_TERIMA_Jasa_Profesi_${cleanReceiver}_${tanggalKuitansi}`
          : `TANDA_TERIMA_Kolektif_Jasa_Profesi_${tanggalKuitansi}`;

      await exportElementToPdf(printAreaRef.current, {
        fileName,
        orientation: jenisDokumen === 'KOLEKTIF' ? 'landscape' : 'portrait',
      });
      showToast('Berkas PDF resmi berhasil dibuat dan diunduh!', 'success');
    } catch (err: any) {
      console.error('Error saat pembuatan PDF client-side:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      showToast(
        `Gagal memproses berkas PDF (${errMsg}). Anda dapat membuka di Tab Baru dan gunakan menu cetak "Save as PDF".`,
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
      console.warn('Cetak dialog browser langsung terbatasi lingkungan iframe:', err);
      showToast(
        'Dialog cetak browser dibatasi oleh iframe preview. Silakan klik tombol "Buka di Tab Baru" di atas untuk mencetak langsung.',
        'warning'
      );
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
              <Briefcase className="w-5 h-5 text-blue-600" />
              Tanda Terima Jasa Profesi
            </h2>
            <p className="text-xs text-slate-500">
              Format Tanda Terima resmi standar Kementerian / BBPK APDN IV
            </p>
          </div>
        </div>

        {/* Pilihan Template & Tombol Pratinjau Tanda Terima */}
        <div className="flex items-center gap-2">
          {/* Segmented Control Jenis Dokumen */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setJenisDokumen('INDIVIDUAL')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-colors ${
                jenisDokumen === 'INDIVIDUAL'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Individual</span>
            </button>
            <button
              type="button"
              onClick={() => setJenisDokumen('KOLEKTIF')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-colors ${
                jenisDokumen === 'KOLEKTIF'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Kolektif</span>
            </button>
          </div>

          {/* Tombol Pratinjau Tanda Terima */}
          <button
            type="button"
            onClick={() => setIsPreviewModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Pratinjau Tanda Terima</span>
          </button>
        </div>
      </div>

      {/* Edit Mode Alert Banner */}
      {editingTransaksi && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <FileEdit className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-amber-900 flex items-center gap-2">
                <span>Mengubah Transaksi: {editingTransaksi.nomorSPTB}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  editingTransaksi.status === 'Final' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-200/80 text-amber-900'
                }`}>
                  Status: {editingTransaksi.status}
                </span>
              </div>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Menyimpan data akan memperbarui transaksi ini dengan nomor kuitansi dan SPTB yang sama.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetForm}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Formulir Baru</span>
          </button>
        </div>
      )}

      {/* 2. Container Form Utama */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
        {/* Klasifikasi Anggaran & Sumber Dana */}
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              1. Penganggaran & Kegiatan
            </h3>
          </div>
          {!pejabatReady&&<p role="alert" className="text-xs mt-2 text-amber-800">Konfigurasi penandatangan belum tersedia. Buka Administrasi.</p>}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sumber Dana
              </label>
              <select
                value={sumberDana}
                disabled={currentRole !== 'bendahara' || Boolean(editingTransaksi)}
                onChange={e => setSumberDana(e.target.value as SumberDana)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-slate-50 focus:outline-none"
              >
                <option value="PNBP">PNBP</option>
                <option value="RM">Rupiah Murni (RM)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Akun Belanja
              </label>
              <select
                value={kodeAkun}
                onChange={e => setKodeAkun(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-slate-50 focus:outline-none"
              >
                <option value="522151">522151 - Belanja Jasa Profesi</option>
                <option value="521213">521213 - Belanja Honor Output Kegiatan</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Tanda Terima
              </label>
              <input
                type="date"
                value={tanggalKuitansi}
                onChange={e => setTanggalKuitansi(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-slate-50 font-mono focus:outline-none"
              />
            </div>
          </div>

        </div>

        {/* ============================================================== */}
        {/* TAMPILAN FORM MODE 1: INDIVIDUAL                               */}
        {/* ============================================================== */}
        {jenisDokumen === 'INDIVIDUAL' && (
          <>
            {/* Identitas Penerima Tunggal */}
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  2. Identitas Penerima (Individual)
                </h3>
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded text-xs">
                  <button
                    type="button"
                    onClick={() => setKlasifikasiPenerima('NON_ASN')}
                    className={`px-2.5 py-1 rounded font-medium ${
                      klasifikasiPenerima === 'NON_ASN' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Non-ASN / Swasta
                  </button>
                  <button
                    type="button"
                    onClick={() => setKlasifikasiPenerima('ASN')}
                    className={`px-2.5 py-1 rounded font-medium ${
                      klasifikasiPenerima === 'ASN' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    PNS / ASN
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Lengkap & Gelar Penerima
                  </label>
                  <input
                    type="text"
                    value={namaPenerima}
                    onChange={e => setNamaPenerima(e.target.value)}
                    placeholder="Contoh: "
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {klasifikasiPenerima === 'ASN' ? 'NIP' : 'NIK / Identitas'}
                  </label>
                  <input
                    type="text"
                    value={nipPenerima}
                    onChange={e => setNipPenerima(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    NPWP (Opsional)
                  </label>
                  <input
                    type="text"
                    value={npwp}
                    onChange={e => setNpwp(e.target.value)}
                    placeholder="Jika ada"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Tabel Dinamis Rincian Sesi Honorarium Individual */}
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    3. Rincian Sesi Honorarium ({sesiIndividual.length} Sesi)
                  </h3>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Satu penerima boleh memiliki beberapa baris sesi berbeda. Bruto = JP × Tarif.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddSesiIndividual}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Rincian</span>
                </button>
              </div>

              <div className="overflow-x-auto mt-3 border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                      <th className="py-2.5 px-3 w-10 text-center">No</th>
                      <th className="py-2.5 px-3 min-w-[260px]">Uraian Sesi Pembahasan</th>
                      <th className="py-2.5 px-3 text-center w-36">Volume & Satuan</th>
                      <th className="py-2.5 px-3 text-right w-44">Tarif Satuan (@Rp)</th>
                      <th className="py-2.5 px-3 text-right w-44">Subtotal Bruto (Rp)</th>
                      <th className="py-2.5 px-3 w-12 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {individualSessionCalculated.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={item.uraianSesi}
                            onChange={e => handleUpdateSesiIndividual(item.id, { uraianSesi: e.target.value })}
                            className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 font-medium"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="1"
                              value={item.volume}
                              onChange={e => handleUpdateSesiIndividual(item.id, { volume: Math.max(1, Number(e.target.value)) })}
                              className="w-14 px-2 py-1.5 text-xs rounded border border-slate-300 font-mono text-center"
                            />
                            <span className="font-semibold text-slate-700">JP</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="10000"
                            value={item.tarifSatuan}
                            onChange={e => handleUpdateSesiIndividual(item.id, { tarifSatuan: Math.max(0, Number(e.target.value)) })}
                            className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 font-mono text-right"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                          {formatRupiah(item.subtotal)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveSesiIndividual(item.id)}
                            disabled={sesiIndividual.length <= 1}
                            className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30 rounded cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={4} className="py-2.5 px-3 text-right uppercase text-slate-700">
                        Total Bruto:
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-950 tabular-nums text-sm">
                        {formatRupiah(totalBrutoIndiv)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Pengaturan Pajak Individual */}
              <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <Calculator className="w-4 h-4 text-blue-600" />
                  <span>Potongan Pajak PPh (Dapat Disesuaikan):</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-600">Tarif PPh:</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={pphRateIndiv}
                      onChange={e => {
                        setPphRateIndiv(Math.max(0, Number(e.target.value)));
                        setCustomPphNominalIndiv(null);
                      }}
                      className="w-16 px-2 py-1 rounded border border-slate-300 font-mono text-center bg-white"
                    />
                    <span className="font-semibold">%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-600">Nominal:</span>
                    <span className="font-mono font-bold text-amber-800 tabular-nums">
                      {formatRupiah(pphNominalIndiv)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ============================================================== */}
        {/* TAMPILAN FORM MODE 2: KOLEKTIF                                 */}
        {/* ============================================================== */}
        {jenisDokumen === 'KOLEKTIF' && (
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  2. Tabel Rincian Pembayaran Kolektif ({rowsKolektif.length} Baris Rincian)
                </h3>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Setiap baris adalah satu rincian pembayaran. Penerima yang sama boleh muncul pada beberapa baris. Kolom cetak: No | Nama | Untuk Pembayaran | JP | @Rp | Bruto | Pph | Netto | Tanda Tangan.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddRowKolektif}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Penerima</span>
              </button>
            </div>

            <div className="overflow-x-auto mt-3 border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                    <th className="py-2.5 px-2 text-center w-8">No</th>
                    <th className="py-2.5 px-3 min-w-[170px]">Nama Penerima</th>
                    <th className="py-2.5 px-3 min-w-[240px]">Untuk Pembayaran</th>
                    <th className="py-2.5 px-2 text-center w-16">JP</th>
                    <th className="py-2.5 px-3 text-right min-w-[110px]">@Rp</th>
                    <th className="py-2.5 px-3 text-right min-w-[110px]">Bruto (Rp)</th>
                    <th className="py-2.5 px-3 text-center min-w-[120px]">PPh (%) / Rp</th>
                    <th className="py-2.5 px-3 text-right min-w-[110px]">Netto (Rp)</th>
                    <th className="py-2.5 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {calculatedRowsKolektif.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="py-2 px-2 text-center font-mono text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={r.nama}
                          onChange={e => handleUpdateRowKolektif(r.id, { nama: e.target.value })}
                          placeholder="Nama lengkap..."
                          className="w-full px-2 py-1 text-xs rounded border border-slate-300 font-semibold text-slate-900"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={r.untukPembayaran}
                          onChange={e => handleUpdateRowKolektif(r.id, { untukPembayaran: e.target.value })}
                          placeholder="Honor pemateri..."
                          className="w-full px-2 py-1 text-xs rounded border border-slate-300 text-slate-800"
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        <input
                          type="number"
                          min="1"
                          value={r.jp}
                          onChange={e => handleUpdateRowKolektif(r.id, { jp: Math.max(1, Number(e.target.value)) })}
                          className="w-12 px-1 py-1 text-xs rounded border border-slate-300 font-mono text-center"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="10000"
                          value={r.tarifSatuan}
                          onChange={e => handleUpdateRowKolektif(r.id, { tarifSatuan: Math.max(0, Number(e.target.value)) })}
                          className="w-24 px-1.5 py-1 text-xs rounded border border-slate-300 font-mono text-right"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatNumberCommas(r.bruto)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={rowsKolektif[idx]?.pphRate || 15}
                            onChange={e => {
                              const rate = Math.max(0, Number(e.target.value));
                              handleUpdateRowKolektif(r.id, { pphRate: rate, customPphNominal: null });
                            }}
                            className="w-10 px-1 py-1 text-xs rounded border border-slate-300 font-mono text-center"
                          />
                          <span className="text-[10px] text-slate-500 font-mono">
                            {formatNumberCommas(r.pph)}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatNumberCommas(r.netto)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRowKolektif(r.id)}
                          disabled={rowsKolektif.length <= 1}
                          className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={5} className="py-2.5 px-3 text-center uppercase tracking-wider text-slate-800">
                      JUMLAH
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-950">
                      {formatNumberCommas(totalBrutoKolektif)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-amber-900">
                      {formatNumberCommas(totalPPhKolektif)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-slate-950 text-sm">
                      {formatNumberCommas(totalNettoKolektif)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* RINGKASAN REAKTIF REALTIME KEUANGAN                            */}
        {/* ============================================================== */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center justify-between">
            <span>
              Ringkasan Nilai Tanda Terima ({jenisDokumen === 'INDIVIDUAL' ? 'Individual' : `Kolektif - ${rowsKolektif.length} Rincian`})
            </span>
            <span className="text-[11px] font-normal text-slate-500">
              Format Rupiah Indonesia (Bebas Perhitungan Ganda)
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-500 text-[11px] block">Total Bruto :</span>
              <span className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                {formatRupiah(jenisDokumen === 'INDIVIDUAL' ? totalBrutoIndiv : totalBrutoKolektif)}
              </span>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-500 text-[11px] block">Potongan PPh :</span>
              <span className="text-lg font-bold font-mono text-amber-800 tabular-nums">
                {formatRupiah(jenisDokumen === 'INDIVIDUAL' ? pphNominalIndiv : totalPPhKolektif)}
              </span>
            </div>
            <div className="p-3 bg-blue-600 text-white rounded-lg shadow-xs">
              <span className="text-blue-100 text-[11px] block">Bersih Diterima (Netto) :</span>
              <span className="text-lg font-bold font-mono text-white tabular-nums">
                {formatRupiah(jenisDokumen === 'INDIVIDUAL' ? totalNettoIndiv : totalNettoKolektif)}
              </span>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* ACTION BUTTONS                                                 */}
        {/* ============================================================== */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setIsPreviewModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-white border border-blue-300 hover:bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-blue-600" />
            <span>Pratinjau Tanda Terima ({jenisDokumen === 'INDIVIDUAL' ? 'Template Individual' : 'Template Kolektif'})</span>
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleSubmit('Draft')}
              className="w-full sm:w-auto px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4 text-slate-500" />
              <span>{editingTransaksi ? 'Perbarui Draft' : 'Simpan sebagai Draft'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSubmit('Final')}
              className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Finalisasi Transaksi</span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL PRATINJAU DOKUMEN CETAK TANDA TERIMA (A4 HITAM PUTIH)    */}
      {/* ============================================================== */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className={`bg-white rounded-xl shadow-2xl ${jenisDokumen === 'KOLEKTIF' ? 'max-w-5xl' : 'max-w-4xl'} w-full my-auto overflow-hidden border border-slate-200`}>
            {/* Modal Controls Bar (hidden during print) */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between no-print">
              <div className="flex items-center gap-2.5">
                <Briefcase className="w-5 h-5 text-blue-400 shrink-0" />
                <div>
                  <span className="font-semibold text-sm block">
                    Pratinjau Tanda Terima ({jenisDokumen === 'INDIVIDUAL' ? 'Template 1 — Individual' : 'Template 2 — Kolektif'})
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Format A4 resmi · Jika dialog cetak dibatasi oleh iframe sandbox preview, tekan Ctrl+P (Cmd+P)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Buka di Tab Baru untuk Cetak Bebas Iframe */}
                <a
                  href="?print=true&mode=print"
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
                  type="button"
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
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  title="Cetak langsung menggunakan dialog peramban"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Dokumen</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Sheet Preview Area */}
            <div className="max-h-[85vh] overflow-y-auto bg-slate-100 p-4 sm:p-8 print:p-0 print:m-0 print:bg-white print:max-h-none print:overflow-visible">
              <div
                ref={printAreaRef}
                className={`bg-white shadow-md print:shadow-none mx-auto border border-slate-300 print:border-none ${jenisDokumen === 'KOLEKTIF' ? 'print-landscape' : 'print-portrait'}`}
              >
                {jenisDokumen === 'INDIVIDUAL' ? (
                  <TandaTerimaIndividual
                    namaInstansiPanjang={namaSatkerPanjang}
                    namaInstansiPendek={namaSatkerPendek}
                    namaPenerima={namaPenerima}
                    nipPenerima={nipPenerima}
                    golonganPenerima={golonganPenerima}
                    uraianKegiatan={individualSessionCalculated.map(s=>s.uraianSesi.trim()).filter(Boolean).join('; ')}
                    sumberDana={sumberDana}
                    kota={kotaTandaTerima}
                    tanggalIndo={formatTanggalIndo(tanggalKuitansi)}
                    ppkNama={ppkNama}
                    ppkNip={ppkNip}
                    bppNama={bppNama}
                    bppNip={bppNip}
                    sesiList={individualSessionCalculated}
                    totalBruto={totalBrutoIndiv}
                    pphRate={pphRateIndiv}
                    pphNominal={pphNominalIndiv}
                    totalNetto={totalNettoIndiv}
                  />
                ) : (
                  <TandaTerimaKolektif
                    namaInstansiPanjang={namaSatkerPanjang}
                    namaInstansiPendek={namaSatkerPendek}
                    sumberDana={sumberDana}
                    kota={kotaTandaTerima}
                    tanggalIndo={formatTanggalIndo(tanggalKuitansi)}
                    ppkNama={ppkNama}
                    ppkNip={ppkNip}
                    bppNama={bppNama}
                    bppNip={bppNip}
                    rows={calculatedRowsKolektif}
                    totalBruto={totalBrutoKolektif}
                    totalPPh={totalPPhKolektif}
                    totalNetto={totalNettoKolektif}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
