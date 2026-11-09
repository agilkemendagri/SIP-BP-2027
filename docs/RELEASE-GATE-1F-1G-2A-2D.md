# SIP-BP — Release gate Tahap 1F, 1G, 2A–2D

Tanggal audit: 10 November 2026. **Status: NO-GO untuk Production.**
Branch kandidat: `fitur-supabase-auth`. Domain utama `https://sip-bp.vercel.app` masih dari `main` dan **belum diubah**.

## 1F — Tampilan, ekspor, cetak, dan penanda SAKTI
- [x] Perbaikan CSV escaping untuk formula injection pada data teks.
- [x] Unit test utilitas CSV, terbilang, dan tanggal ditambahkan ke `tests/formatters.test.ts`; workflow CI dikonfigurasi untuk `bun test` sebelum build.
- [x] **GitHub Actions sudah diperbaiki.** Log run `42703265345` mengungkap error TypeScript dari `supabase/functions/sip-bp-accounts/index.ts` (modul Deno Edge Runtime tidak tersedia bagi typecheck React). `tsconfig.json` sekarang mengecualikan `supabase/functions` dari typecheck aplikasi. Run `42703593415` selesai **success**: TypeScript sukses, **4 tests pass, 0 fail**, Vite build sukses. Edge Function masih memerlukan pengujian runtime terpisah.
- [x] Perbaikan batch SAKTI: RPC atomik dicoba terlebih dahulu; apabila gagal, ditangani per SPTB dan UI menampilkan jumlah serta alasan kegagalan; duplikasi submission saat proses sedang berjalan dicegah.
- [x] Vercel Preview terbaru selesai build dengan status READY.
- [ ] Tes browser interaktif: login melalui tiga akun, tambah/edit/detail transaksi tiap jenis, modal cetak, PDF A4 portrait/landscape, ekspor langsung, refresh/sesi kadaluwarsa, bulk 100 termasuk campuran gagal.
- [ ] Audit kesesuaian output PDF terhadap dokumen resmi yang sudah disetujui oleh instansi.
- [ ] Uji bundle JS dan warning konfigurasi Vite; Vercel READY bukan bukti sukses semua alur.
- [ ] Review penanganan penanda SAKTI dalam kasus request timeout dan retry jaringan.

## 1G — Audit keamanan
- [x] Verifikasi pengaturan Vercel: `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` **hanya Preview** branch `fitur-supabase-auth`. Tidak ada Production variables.
- [x] Database test (Tahap 1E): pengecekan peran BPP RM/PNBP, mutasi finansial bertoken, kunci SAKTI, pajak dan transaksi pengujian yang di-rollback.
- [x] Audit grant RPC: `anon` tidak punya EXECUTE fungsi transaksi publik, `authenticated` memiliki hak yang dibatasi cek peran di server.
- [x] Uji akses tanpa login via `SET ROLE anon`: SELECT tabel transaksi dan pemanggilan RPC simpan ditolak.
- [x] RLS aktif pada transaksi, rincian, profiles, konfigurasi pejabat, dan counter; pengguna terautentikasi hanya dapat SELECT tabel operasional yang telah diberi grant, tanpa INSERT/UPDATE/DELETE tabel langsung.
- [x] Supabase Security Advisor: satu INFO `rls_enabled_no_policy` pada counter nomor SPTB (disengaja), satu WARN `auth_leaked_password_protection` (belum aktif).
- [ ] Selidiki dan mitigasi peringatan password bocor; organisasi `agilkemendagri` berada pada paket Supabase **Free**. Perlindungan password bocor membutuhkan **Pro** atau lebih tinggi; tidak boleh mengklaim fitur sudah diaktifkan.
- [ ] Pemeriksaan registrasi publik/nonaktif, brute force, pemulihan Bendahara, sesi JWT dan timeout, audit akun BPP Edge Function end-to-end.
- [ ] Cadangan, prosedur restore, perlindungan data keuangan dan audit internal instansi. Supabase Free tidak menyediakan kemampuan backup/keandalan setara paket Pro; keputusan hosting Production harus mempertimbangkan ketersediaan dan pemulihan.
- [ ] Pengujian beban/konkurensi nomor SPTB serta pemulihan bila transaksi server gagal.

## 2A — Supabase Production terpisah
**BELUM DIBUAT.** Ditemukan satu organisasi: `agilkemendagri` (`rbqqjkqkrkcsmgglnuti`) dengan paket Free; satu proyek DEV aktif. Pemilihan organisasi untuk proyek baru dan penanganan quotation/cost wajib mengikuti alur persetujuan Supabase. Tidak membuat project dengan menebak organisasi atau memulai komitmen biaya tanpa persetujuan yang diperlukan.

Persiapan:
1. Pastikan organisasi tujuan dan biaya proyek baru yang sah.
2. Beri nama `SIP-BP-PROD`, region `ap-southeast-1`, jika telah disetujui.
3. Periksa status instance, migrasi 7 versi dan semua perubahan yang tercatat; jangan salin transaksi, akun dummy, atau password DEV.
4. Auth signup publik dimatikan, pengelola awal diverifikasi, dan sistem backup/pemulihan dibuktikan.

## 2B — Migrasi Production
**TERTAHAN karena 2A belum selesai.**
- [x] Ketujuh SQL migrasi asli sudah disalin utuh dari `supabase_migrations.schema_migrations.statements` DEV ke folder `supabase/migrations/` di branch fitur (tanpa data pengguna dan tanpa kredensial literal yang terdeteksi). SQL **belum diterapkan** pada PROD.
- Migrasi DEV yang terdeteksi berurutan:
  - `20261109163555 sip_bp_profiles_roles_foundation`
  - `20261109163914 sip_bp_transaction_structure_and_rls`
  - `20261109164351 sip_bp_auth_profile_security`
  - `20261109164421 sip_bp_account_activity_log`
  - `20261109164651 sip_bp_password_update_guard`
  - `20261109174157 sip_bp_1d_atomic_finance_rpc`
  - `20261109175815 sip_bp_1d_atomic_finalize`
- Verifikasi perubahan schema dan grant pada PROD dari nol.
- Gunakan hanya PROD publishable key untuk UI; jangan memindahkan JWT, akun, maupun secret DEV.

## 2C — Deployment domain utama
**TERTAHAN karena 2A, 2B dan pengujian UAT belum selesai.**
- Vercel project `sip-bp` (`prj_Bez0acIcy61OoARMuqC18frt4gC0`) domain `sip-bp.vercel.app`.
- Production saat audit: GitHub branch `main` dan commit `78cb3988a8c0620c853e8e59a8c4084ff99054ef`.
- Jangan merge branch DEV ke main saat environment variables Production kosong: `src/App.tsx` akan menampilkan pesan konfigurasi tidak lengkap, menggantikan aplikasi utama.
- Rilis hanya setelah build, regresi keamanan dan UAT browser lulus, PROD env benar, backup/rollback teruji, disertai otorisasi penerapan yang tepat.

## 2D — Smoke test Production
**TERTAHAN karena 2C belum rilis.** Wajib uji login tiap peran, penyimpanan transaksi fiktif yang dibersihkan secara terkontrol, penomoran, cetak, SAKTI, daftar, filter, ekspor, audit, dan keselamatan backup.

## Kesimpulan
**NO-GO**. Frontend DEV dan verifikasi database telah maju; produksi belum siap dan belum diganti. Dokumen ini adalah bukti penilaian, bukan sertifikat keberhasilan browser/UAT.
