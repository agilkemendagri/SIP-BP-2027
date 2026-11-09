# SIP-BP — Tahap 2D: Uji database Production tanpa data permanen

Tanggal: 10 November 2026 (WIB)
Target: Supabase `SIP-BP-PROD` (`iozswrpnrataffgtaoki`) terpisah dari DEV.

## Metode dan integritas data
Skenario uji finansial dijalankan sebagai pengguna `authenticated` dengan klaim JWT sub yang sesuai akun Bendahara Production yang sudah memiliki profil aktif. Semua rangkaian mutasi menggunakan satu koneksi transaksi `BEGIN ... ROLLBACK`. Uji izin juga menggunakan `SET ROLE anon` dan UUID terautentikasi yang tidak memiliki profil. Tidak ada password, token atau identitas personal yang dicatat dalam dokumen ini.

Satu uji awal ditolak karena klaim pengguna diatur setelah `SET ROLE authenticated`; setelah dikoreksi, pemeriksaan berikutnya terbentur izin counter yang memang dirancang tidak bisa dibaca klien. Pengujian diperbaiki **tanpa mengubah RLS/grant pada database**. Skenario final kemudian lulus.

## Skenario pengujian yang lulus
- [x] Membuat Draft **RM** Jasa Profesi dengan 1 rincian: bruto Rp1.000.000, PPh Rp50.000, PPN Rp0, netto Rp950.000; memverifikasi nomor SPTB sumber RM.
- [x] Mengubah status Draft → Final; menolak penghapusan transaksi Final.
- [x] Menolak penandaan SAKTI untuk Draft.
- [x] Menandai SAKTI untuk Final; menolak kembali ke Draft sebelum membuka kunci.
- [x] Menolak alasan pembukaan SAKTI yang terlalu singkat; membuka kunci dengan alasan sah; kembali ke Draft dan menghapus Draft.
- [x] Membuat Draft **PNBP** Jasa Profesi; memverifikasi nomor SPTB sumber PNBP dan rincian.
- [x] Menolak kode akun tidak valid, rincian penerima kosong, dan netto tidak sesuai bruto dikurangi pajak.
- [x] Akses anonim (`anon`) tidak boleh SELECT transaksi atau menjalankan RPC menyimpan transaksi.
- [x] Identitas `authenticated` tanpa profil tidak bisa SELECT transaksi maupun membuat transaksi.

## Verifikasi sebelum/sesudah pengujian
| Objek | Sebelum | Sesudah |
|---|---:|---:|
| `public.transaksi` | 0 | 0 |
| `public.rincian_transaksi` | 0 | 0 |
| `public.nomor_sptb_counter` | 0 | 0 |
| `sip_bp_private.audit_log` | 2 | 2 |
| `public.profiles` | 1 | 1 |
| `auth.users` | 1 | 1 |

Jadi tidak ada dokumen, rincian, nomor SPTB, atau jejak audit uji yang permanen.

## Belum lulus / belum dijalankan
- [ ] Browser end-to-end untuk cetak kuitansi dan SPTB, termasuk kesesuaian A4, tanda tangan, pajak, font, dan ekspor Excel. SQL rollback tidak dapat menghasilkan dokumen terpersisten untuk tombol Print di browser.
- [ ] Uji akun BPP RM dan BPP PNBP di Production: saat tes hanya ada satu profil Bendahara. Isolasi dua role pernah diuji di DEV, tetapi **tidak diuji ulang pada PROD dengan akun BPP aktif**.
- [ ] Uji simultan/concurrency untuk penomoran SPTB, SAKTI bulk 100, load/performance, kegagalan jaringan, dan backup/restore.
- [ ] Pengujian login terbaru di browser dan tampilan dashboard: pengguna melaporkan berhasil; bukan verifikasi otomatis mesin.
- [ ] Validasi ketentuan paket gratis Vercel Hobby untuk operasional instansi. Jangan upgrade berbayar tanpa persetujuan.
- [ ] Supabase Security Advisor mencatat warning `auth_leaked_password_protection` disabled; pada paket Free fitur perlindungan terkait dapat dibatasi. Kebijakan password tetap perlu diperkuat, tanpa biaya.

## Gate Production
**Tahap 2D pada sisi database dinyatakan lulus untuk skenario yang diuji, bukan untuk sistem secara menyeluruh.** Domain utama `sip-bp.vercel.app` jangan diganti hingga semua uji browser, role nyata, kebijakan layanan, dan pemulihan tersedia.
