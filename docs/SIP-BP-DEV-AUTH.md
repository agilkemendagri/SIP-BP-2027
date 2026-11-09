# SIP-BP DEV — Tahap 1C (Autentikasi dan Akun BPP)

**Lingkungan:** hanya branch `fitur-supabase-auth` + proyek Supabase `SIP-BP-DEV`. Jangan merge ke `main` sampai Tahap 1D selesai. Versi `sip-bp.vercel.app` tidak berubah.

## Pengaturan Vercel PREVIEW saja

1. Buka proyek SIP-BP di Vercel → Settings → Environment Variables.
2. Tambahkan `VITE_SUPABASE_URL=https://zfbnclhrvtjodkuqzbcx.supabase.co`.
3. Tambahkan `VITE_SUPABASE_PUBLISHABLE_KEY` dari Supabase DEV → Project Settings → API Keys → publishable key.
4. Pilih **Preview** saja (jangan Production). Jalankan **Redeploy** untuk branch `fitur-supabase-auth`.
5. Setelah kedua variabel terisi, Preview akan membuka portal login DEV, bukan prototipe transaksi.

**JANGAN pernah** memasukkan `service_role`, `sb_secret_`, password database, atau token admin ke variabel `VITE_` maupun source code GitHub.

## Bootstrap akun Bendahara pertama (perlu aksi pemilik proyek)

Tidak ada akun dibuat otomatis. Bendahara pertama dibuat secara terverifikasi oleh pemilik proyek:
1. Di Supabase **SIP-BP-DEV** → Authentication → Users → Add user.
2. Pilih login email internal `bendahara@sip-bp.example`; atur password sementara kuat (min 12 karakter), dan konfirmasi email lewat opsi admin.
   Domain `.example` adalah alamat identitas internal, bukan kotak surat sungguhan. Jangan mengandalkan email reset untuk akun ini.
3. Tambahkan baris `public.profiles` yang mereferensikan UUID akun Auth dan memakai `username='bendahara'`, `role='bendahara'`, `aktif=true`, `wajib_ganti_password=true`. Langkah ini harus dilakukan menggunakan akses admin tepercaya; **jangan** memberikan password melalui chat.
4. Login memakai `bendahara` (tanpa domain), lalu ganti password saat diminta. Setelah itu menu BPP terbuka.
5. Hanya **satu Bendahara aktif** diizinkan oleh constraint database. Pemulihan akun Bendahara harus melalui maintainer terverifikasi, bukan reset BPP.

## Operasi yang tersedia

- Username + password melalui Supabase Auth; identitas internal `username@sip-bp.example`.
- Portal membaca role, status aktif, dan flag wajib ganti password dari `profiles` (bukan `user_metadata`).
- Bendahara aktif dapat melihat akun BPP, menambah BPP RM/PNBP, mengubah peran BPP, mengaktifkan/menonaktifkan, dan reset password BPP dengan alasan wajib.
- Password sementara muncul sekali kepada Bendahara, dihasilkan oleh server, dan harus dibagikan secara aman.
- Perubahan password pengguna menggunakan Supabase Auth. Trigger `auth.users` memperbarui `wajib_ganti_password` setelah password hash benar-benar berubah.
- Data transaksi dan rincian tetap **tanpa akses tulis dari browser** sampai alur transaksi backend Tahap 1D tersedia.
- Prototipe lama sengaja dipisah dari portal autentikasi DEV. Jangan memasukkan data keuangan asli.

## Security & testing checklist

- Disable public signups di Supabase DEV (Authentication → Providers / Signups), lalu hanya Admin API yang membuat pengguna.
- Atur minimum password dan aturan kompleksitas pada Auth settings. Aktifkan proteksi yang tersedia.
- Pastikan semua perubahan akun menggunakan Edge Function `sip-bp-accounts` dan user JWT. Jangan menggunakan secret key di frontend.
- Uji login salah, BPP nonaktif, pergantian password pertama, manajemen akun Bendahara, serta larangan BPP melihat sumber dana lain.
- Uji Edge Function di Preview; status ACTIVE/deployed saja **belum** membuktikan handler berjalan.
- Audit akses Supabase kembali setelah data dan akun uji tersedia.
