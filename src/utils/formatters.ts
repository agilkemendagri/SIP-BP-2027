/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('id-ID').format(num);
};

export const formatNumberCommas = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(Math.round(num || 0));
};

const BULAN_INDONESIA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const formatTanggalIndo = (dateStr: string): string => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return `${day} ${BULAN_INDONESIA[monthIdx] || ''} ${year}`;
};

export const getNamaBulan = (bulanNumber: number): string => {
  return BULAN_INDONESIA[bulanNumber - 1] || '';
};

export const getDaftarBulan = () => {
  return BULAN_INDONESIA.map((nama, idx) => ({
    nomor: (idx + 1).toString().padStart(2, '0'),
    nama,
  }));
};

/**
 * Konversi angka ke kalimat terbilang Bahasa Indonesia
 * Sangat penting untuk keabsahan Kuitansi dan SPTB Pemerintah
 */
export const terbilang = (n: number): string => {
  const bilangan = [
    '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima',
    'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'
  ];

  const roundN = Math.floor(Math.abs(n));
  if (roundN === 0) return 'Nol Rupiah';

  function konversi(num: number): string {
    if (num < 12) {
      return bilangan[num];
    } else if (num < 20) {
      return konversi(num - 10) + ' Belas';
    } else if (num < 100) {
      const sisa = num % 10;
      return konversi(Math.floor(num / 10)) + ' Puluh' + (sisa > 0 ? ' ' + konversi(sisa) : '');
    } else if (num < 200) {
      return 'Seratus' + (num - 100 > 0 ? ' ' + konversi(num - 100) : '');
    } else if (num < 1000) {
      const sisa = num % 100;
      return konversi(Math.floor(num / 100)) + ' Ratus' + (sisa > 0 ? ' ' + konversi(sisa) : '');
    } else if (num < 2000) {
      return 'Seribu' + (num - 1000 > 0 ? ' ' + konversi(num - 1000) : '');
    } else if (num < 1000000) {
      const sisa = num % 1000;
      return konversi(Math.floor(num / 1000)) + ' Ribu' + (sisa > 0 ? ' ' + konversi(sisa) : '');
    } else if (num < 1000000000) {
      const sisa = num % 1000000;
      return konversi(Math.floor(num / 1000000)) + ' Juta' + (sisa > 0 ? ' ' + konversi(sisa) : '');
    } else if (num < 1000000000000) {
      const sisa = num % 1000000000;
      return konversi(Math.floor(num / 1000000000)) + ' Miliar' + (sisa > 0 ? ' ' + konversi(sisa) : '');
    } else {
      const sisa = num % 1000000000000;
      return konversi(Math.floor(num / 1000000000000)) + ' Triliun' + (sisa > 0 ? ' ' + konversi(sisa) : '');
    }
  }

  return (konversi(roundN).trim() + ' Rupiah').replace(/\s+/g, ' ');
};

/**
 * Escape Excel/LibreOffice formula injection from untrusted recipient/activity names.
 * Quoting CSV alone does not neutralize cells beginning with =, +, -, or @.
 * Numeric values stay numeric, and all text is quoted for semicolon-delimited CSV.
 */
export const csvEscapeCell = (value: string | number): string => {
  const raw = String(value ?? '');
  const safe = typeof value === 'string' && /^[\\s\\u0000-\\u001f]*[=+\\-@]/u.test(raw)
    ? "'" + raw
    : raw;
  return '"' + safe.replace(/"/g, '""') + '"';
};

/**
 * Generate CSV / TSV file and trigger direct browser download
 */
export const downloadCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const sanitize = csvEscapeCell;

  const csvContent = [
    '\uFEFF' + headers.map(sanitize).join(';'), // UTF-8 BOM for Excel in Indonesia locale
    ...rows.map(row => row.map(sanitize).join(';'))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
