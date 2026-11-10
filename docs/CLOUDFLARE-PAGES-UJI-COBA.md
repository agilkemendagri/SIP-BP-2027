# Cloudflare Pages — SIP-BP (Uji Coba)

Status: konfigurasi persiapan, **belum ada deployment Cloudflare**. Hosting Vercel dan GitHub main tidak diubah.

## Pengaturan Cloudflare Pages

- Git repository: `agilkemendagri/SIP-BP-2027`
- Branch untuk uji coba: `uji-cloudflare-pages`
- Framework preset: **Vite**
- Build command: `npm run build` (atau `bun run build` bila runtime Bun disetel)
- Build output directory: `dist`
- Root directory: root repo
- Project name yang disarankan: `sip-bp-uji` (jika tersedia)

## Environment variables (Preview/branch ini saja)

- `VITE_SUPABASE_URL`: URL Supabase **DEV**, bukan PROD.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: publishable/anon key Supabase **DEV**, bukan service_role key.
- `VITE_SIP_BP_ENV`: `development`.

Nilai kunci harus dimasukkan langsung melalui dashboard Cloudflare, **jangan commit ke GitHub**. Jangan gunakan Supabase PROD untuk tahap ini.

## Pemeriksaan sebelum UAT

1. Build Vite berhasil dan halaman awal dapat dibuka.
2. Login akun penguji Supabase DEV; konfirmasi URL callback/redirect Auth di Supabase DEV sudah mengizinkan domain Cloudflare uji.
3. Periksa label `Data Supabase DEV`.
4. Uji kuitansi jasa profesi individual, kolektif, SPPD luar kota dan daftar penerimaan dalam kota dengan data pengujian, lalu koreksi hasil OCR sebelum menyimpan Draft.
5. Uji refresh URL, cetak kuitansi/SPTB, RLS peran Bendahara/BPP RM/PNBP, dan akses dari browser lain.
6. Jangan memindahkan domain resmi atau menonaktifkan Vercel. Jangan menggunakan data pribadi nyata untuk UAT sampai keamanan dan kebijakan hosting disetujui.

## Catatan

Frontend React/Vite dikompilasi menjadi aset statis. OCR browser membutuhkan akses ke CDN model OCR dan worker/WASM. Supabase Auth dapat membutuhkan allowlist redirect domain `pages.dev`. Cloudflare Pages Free tetap memiliki kuota dan kebijakan penggunaan; lakukan penilaian kelayakan sebelum operasional resmi instansi.
