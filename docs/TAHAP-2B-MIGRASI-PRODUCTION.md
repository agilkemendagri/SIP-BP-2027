# SIP-BP — Tahap 2B: Hasil Migrasi Database Production

**Status: SELESAI untuk migrasi skema, fungsi, dan keamanan dasar.**  
Lingkungan: Supabase `SIP-BP-PROD` (Project ID `iozswrpnrataffgtaoki`, region Singapore, paket Free).  
Tanggal pelaksanaan: 10 November 2026 (WIB).

## Metode
Ketujuh file di `supabase/migrations/` diverifikasi **persis sama** dengan SQL yang dicatat dalam `supabase_migrations.schema_migrations.statements` pada `SIP-BP-DEV`. File kemudian dijalankan **satu per satu** lewat Supabase `apply_migration` pada proyek Production. Semua tool mengembalikan `success: true`.

**Catatan histori:** `apply_migration` membuat nomor versi histori baru pada PROD berdasarkan waktu eksekusi. Urutan dan nama migrasi identik dengan DEV; nomor versi tidak sama.

## Migrasi yang diterapkan
| Urutan | Nama migrasi | Versi histori PROD |
|---|---|---|
| 1 | sip_bp_profiles_roles_foundation | 20261109220939 |
| 2 | sip_bp_transaction_structure_and_rls | 20261109220942 |
| 3 | sip_bp_auth_profile_security | 20261109220945 |
| 4 | sip_bp_account_activity_log | 20261109220947 |
| 5 | sip_bp_password_update_guard | 20261109220950 |
| 6 | sip_bp_1d_atomic_finance_rpc | 20261109220952 |
| 7 | sip_bp_1d_atomic_finalize | 20261109220955 |

## Verifikasi setelah migrasi
- 6 tabel `public`: `profiles`, `nomor_sptb_counter`, `transaksi`, `rincian_transaksi`, `konfigurasi_pejabat`, dan `account_events`. Seluruhnya **RLS aktif**.
- 5 fungsi RPC publik untuk menyimpan transaksi, perubahan status, menghapus Draft, penandaan SAKTI, dan membuka kunci SAKTI.
- 3 trigger tabel transaksi dan 2 trigger rincian; 5 RLS policies pada schema `public`.
- Semua RPC keuangan dapat dieksekusi `authenticated` dan tidak dapat dieksekusi `anon`.
- Pengguna `authenticated` dapat `SELECT` pada tabel operasional dengan perlindungan RLS, tetapi tidak memiliki hak langsung `INSERT/UPDATE/DELETE` pada tabel keuangan.
- Uji database `SET ROLE anon`: pembacaan transaksi dan RPC tulis ditolak.
- Uji `authenticated` dengan UUID tanpa profil: penulisan transaksi ditolak.
- Seluruh SQL uji memakai `BEGIN...ROLLBACK`. Tidak ada transaksi uji tersisa.
- `auth.users=0`, `profiles=0`, `transaksi=0`, `rincian_transaksi=0`, `nomor_sptb_counter=0`, `account_events=0`, `audit_log=0`.
- Supabase Security Advisor hanya memberi INFO `rls_enabled_no_policy` pada `nomor_sptb_counter`, yang sengaja tidak memiliki policy baca klien; tidak ditemukan warning keamanan tambahan saat pemeriksaan ini.

## Batas tahapan
Tahap 2B hanya **memigrasikan struktur**. Jangan memindahkan DEV user, sesi, password, data transaksi atau nomor SPTB ke PROD. Hingga 2C:
- Edge Function `sip-bp-accounts` belum dideploy ke PROD.
- Akun awal Bendahara Production belum dibuat secara terverifikasi.
- Env Vercel Production belum ditentukan, belum diuji, dan **tidak** menggunakan kunci Supabase DEV.
- Domain `https://sip-bp.vercel.app` **tidak diubah**.
- UAT browser/PDF dan kebijakan backup Production masih diperlukan sebelum go-live.
