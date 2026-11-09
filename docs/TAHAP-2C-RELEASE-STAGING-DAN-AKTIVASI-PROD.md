# SIP-BP — Tahap 2C: Integrasi Production dan gerbang aktivasi

Tanggal verifikasi: 10 November 2026. **Status: STAGING SIAP, AKUN BENDAHARA PROD DITAUTKAN, GO-LIVE DITAHAN UNTUK UAT.**

## Komponen yang sudah diterapkan
- Database terpisah: `SIP-BP-PROD` (`iozswrpnrataffgtaoki`), region Singapore, 7 migrasi terpasang.
- Edge Function `sip-bp-accounts` versi 1: ACTIVE, `verify_jwt=true`. Fungsi memeriksa bahwa aktor adalah Bendahara aktif dengan password awal yang sudah diganti sebelum boleh membuat, mengubah, menonaktifkan, atau mereset BPP.
- Project Vercel `sip-bp`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SIP_BP_ENV=production` ditetapkan hanya pada **Production target**, menggunakan `iozswrpnrataffgtaoki`. **Tidak ada secret/service-role key di frontend**.
- Variabel Preview branch `fitur-supabase-auth` tetap mengarah ke Supabase DEV. Penanda DEV/PROD dan sessionStorage dipisahkan dalam kode aplikasi.
- Branch `release-prod-staging` merupakan salinan kandidat yang mengarah ke PROD melalui env **Preview yang khusus branch itu**, terpisah dari Preview DEV; deployment staging siap untuk uji sebelum go-live.
- Adaptasi login: autentikasi dapat menggunakan username BPP atau **email institusi yang terverifikasi** untuk Bendahara pertama, tanpa membuka data profil publik.
- GitHub Actions typecheck, unit test, dan Vite build diperiksa pada branch pengembangan.

## Tindakan minimum untuk aktivasi Bendahara pertama (harus melalui pemilik akun Supabase)
Saat migrasi 2B, `auth.users=0` dan `public.profiles=0`. **Pada 10 November 2026 pengguna menyatakan telah membuat akun awal melalui dashboard Supabase.** Pemeriksaan lanjutan menemukan tepat 1 pengguna Auth yang emailnya sudah dikonfirmasi, bukan anonim, dan tidak diblokir; profil `bendahara` ditautkan, dengan `wajib_ganti_password=true`. **Tidak ada INSERT manual ke tabel internal `auth.users`**, dan endpoint bootstrap admin publik tidak dibuat.

1. Pemilik proyek membuka `https://supabase.com/dashboard/project/iozswrpnrataffgtaoki/auth/users`.
2. Gunakan **Add user** / **Create new user** di Supabase Dashboard, dengan **email institusi aktif yang memang dikuasai Bendahara** dan password sementara kuat, unik, panjang. Pastikan email dikonfirmasi (Dashboard memiliki opsi konfirmasi). **Jangan kirim password ke ChatGPT, GitHub, atau repository**.
3. Setelah hanya satu pengguna yang baru dan terverifikasi ada, operator database tepercaya memverifikasi identitas akun tersebut lalu menautkan profil `bendahara` di `public.profiles` (`username=bendahara`, `role=bendahara`, `aktif=true`, `wajib_ganti_password=true`). Tidak pernah menyalin akun DEV.
4. Pengguna login dengan **email institusi** tadi di staging; sistem wajib meminta mengganti password, kemudian sign in ulang dan melakukan smoke test hak akses.
5. Di `Authentication -> Providers / General`, batasi pendaftaran pengguna baru (nonaktifkan self-signup jika tidak diperlukan), dan verifikasi JWT/setting session. Pembuatan BPP melalui Edge Function, bukan signup publik.

Contoh query pemeriksaan sebelum menautkan profil (hanya SELECT):
```sql
select u.id, u.email, u.email_confirmed_at, u.created_at
from auth.users u
left join public.profiles p on p.user_id=u.id
where p.user_id is null and u.is_anonymous=false
order by u.created_at;
```

## Mengapa domain utama belum diganti
- Akun Bendahara pertama Production sudah ditautkan, tetapi **belum diuji login dan penggantian password melalui browser**; jangan menyatakan autentikasi end-to-end sudah lulus.
- Cetakan kuitansi/SPTB dan kontrol pengguna belum diuji end-to-end pada Production.
- Backup dan pemulihan data keuangan belum diverifikasi.
- Vercel Hobby $0 dibatasi untuk penggunaan **personal/nonkomersial** menurut ketentuan layanannya. Operasional institusi pemerintah perlu penilaian kesesuaian lisensi/persetujuan sebelum go-live; jangan mengasumsikan paket Hobby dapat digunakan untuk kebutuhan instansi hanya karena tidak dipungut biaya.
- Jangan mengaktifkan layanan berbayar; anggaran Rp0 adalah batas tetap pengguna.

## Checklist akhir
- [x] Edge Function Production terpasang dan JWT aktif
- [x] Variabel Production hanya memuat kunci publishable PROD
- [x] Dev dan Production env/scoped build dipisahkan
- [x] Staging dibangun dari kandidat release
- [x] Akun Bendahara Production terverifikasi (1 pengguna Auth, email dikonfirmasi), profil `bendahara` dibuat (aktif, wajib_ganti_password=true), akun dapat membaca profil sendiri melalui uji RLS, tanpa menyalin data DEV. Tidak ada password yang dibaca atau dicatat.
- [ ] Auth signup publik dan kebijakan login Production diverifikasi
- [ ] UAT aplikasi melalui browser dan cetak SPTB/kuitansi
- [ ] Backup/restore sesuai kebutuhan keuangan
- [ ] Kesesuaian paket Vercel untuk operasional instansi terkonfirmasi
- [ ] Setelah semua lulus, merge PR release ke `main`, deploy Vercel Production, lalu lanjut Tahap 2D

**Catatan:** Staging yang tersambung ke PROD adalah untuk pemeriksaan akun/tampilan saja; jangan gunakan data keuangan resmi sebelum ada otorisasi go-live.

## Pembaruan setelah pembuatan akun (10 November 2026)
- Supabase PROD: `auth.users=1`, `profiles=1`, `transaksi=0`.
- Profil akun username `bendahara`, role `bendahara`, `aktif=true`, `wajib_ganti_password=true`.
- Pemeriksaan RLS sebagai pengguna terautentikasi dengan UUID akun tersebut: profil Bendahara dapat dibaca. Pengujian SQL dibatalkan via `ROLLBACK`.
- Supabase organisasi `agilkemendagri` tetap paket **Free**; tidak ada layanan berbayar yang diaktifkan.
- Langkah berikutnya: login menggunakan **email institusi yang didaftarkan di Supabase Auth** pada staging; ganti password yang diwajibkan; verifikasi akses dashboard/rekap/cetak, backup, kebijakan signup. Tidak perlu membagikan password di percakapan.
