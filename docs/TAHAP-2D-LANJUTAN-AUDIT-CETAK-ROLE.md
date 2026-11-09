# SIP-BP — Tahap 2D lanjutan: audit cetak, role, dan gate rilis

Tanggal: 10 November 2026. **Status: pemeriksaan kode dan CI lulus; cetak browser/PDF resmi belum disahkan.**

## Hasil perbaikan cetak
1. Kop SPTB yang semula salah menyebut **Kementerian Perdagangan**, nama instansi pengawasan keuangan/aset perdagangan, dan alamat Jakarta telah diperbaiki menjadi **Kementerian Dalam Negeri**, **Balai Besar Pengembangan Kompetensi Aparatur Pemerintahan Dalam Negeri IV**, dan lokasi **Makassar, Sulawesi Selatan**.
2. Penanda lokasi tanda tangan menjadi `Makassar`. Kode satker `411892` dan alamat lengkap yang tidak terverifikasi dihapus dari hasil cetak. **Kode satker dan kop/alamat lengkap perlu dikonfirmasi terhadap dokumen resmi instansi sebelum cetak final.**
3. Cetak kuitansi `Buka di Tab Baru` pada URL same-origin semula membuka tab `noopener` sehingga `sessionStorage` login tidak diwariskan. Sekarang menggunakan `rel="opener"` khusus URL same-origin; tab cetak segera melepaskan `window.opener` setelah dimuat. Harus diverifikasi via browser sesungguhnya.
4. Klasifikasi **individual** vs **kolektif** disatukan ke fungsi `isCollectiveReceipt`. Beberapa sesi pembayaran untuk satu penerima tetap individual; beberapa penerima berbeda menjadi kolektif.
5. `tests/printInstitution.test.ts` dan `tests/printMarkup.test.ts` menguji identitas kop, klasifikasi, mekanisme tab, serta kemampuan server-side rendering tanda terima simulasi individual/kolektif.

## Hasil verifikasi
- GitHub Actions run `42715853592`: **success**, TypeScript, 12 tests PASS / 0 FAIL pada 3 berkas, build Vite PASS. Ini bukan pengujian browser penuh atau verifikasi tampilan PDF.
- RLS ulang di `SIP-BP-DEV` dengan akun BPP RM dan BPP PNBP: PASS untuk pembatasan akses sumber dana sesuai peran, seluruh tes dalam transaksi rollback.
- Staging baru: branch `release-prod-staging`, commit `477933bd663ef3af990361b45e5002b2e7fe5ab5`, Vercel READY.
- Jumlah data pada `SIP-BP-PROD` setelah tes: `transaksi=0`, `rincian=0`, `nomor_sptb_counter=0`, `profiles=1`, `auth.users=1`. Nomor SPTB Production tetap bersih.
- Production Vercel masih dari `main` (commit `78cb3988a8c0620c853e8e59a8c4084ff99054ef`). **Tidak ada merge/aktivasi domain utama.**

## Hal yang belum lulus
- Pratinjau/unduhan PDF dan CSS browser: cek A4 portrait untuk individual/SPTB, landscape untuk kolektif, multi-page, alignment, penggalan baris, kolom tanda tangan, nama pejabat, perhitungan, font, serta hasil file sebenarnya.
- Validasi kop resmi/alamat/kode satker berdasarkan dokumen instansi yang disetujui. Jangan menganggap label lokasi Makassar menggantikan alamat resmi.
- Login dan pembuatan BPP RM dan BPP PNBP secara nyata di **Production** (pengujian role hanya DEV).
- Backup/restore mandiri untuk Supabase Free. **Jangan menyimpan backup transaksi atau kredensial dalam GitHub publik**.
- Kebijakan paket gratis dan kesesuaian penggunaan Vercel Hobby untuk operasional instansi.
- Tidak ada data fiktif yang dibuat secara permanen untuk pengujian di Production.

## Petunjuk UAT cetak aman
Gunakan data simulasi pada **DEV** jika akun penguji DEV tersedia. Untuk cetak Production, jangan membuat transaksi pengujian tanpa memperhitungkan pengaruhnya pada nomor SPTB resmi. Ambil screenshot hasil pratinjau/Print Preview dari contoh yang telah disetujui. Dokumen HTML/PDF yang terlihat harus dicocokkan dengan contoh cetak instansi.

**Gate saat ini: NO-GO untuk go-live resmi.** Pengujian backend Production dan unit template berhasil, tetapi UAT browser/PDF, backup, dan kesesuaian kebijakan layanan belum cukup untuk menyatakan go-live aman.
