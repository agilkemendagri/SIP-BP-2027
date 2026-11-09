# SIP-BP — Tahap 1D: Status integrasi dan gerbang rilis

Tanggal pemeriksaan: 10 November 2026. Lingkungan DEV saja.

## Arsitektur yang sudah ada
- Frontend React/Vite pada branch `fitur-supabase-auth`, Preview Vercel `sip-bp-git-fitur-supabase-auth-bpp6.vercel.app`.
- Supabase DEV `zfbnclhrvtjodkuqzbcx`: Auth, `profiles`, `transaksi`, `rincian_transaksi`, counter SPTB, dan audit.
- Data transaksi dibaca dengan REST Supabase memakai JWT pengguna + RLS.
- Mutasi finansial melalui RPC `sip_bp_save_transaction`, `sip_bp_change_status`, `sip_bp_delete_transaction`, `sip_bp_mark_sakti`, `sip_bp_unlock_sakti`; nomor SPTB dibuat trigger server.
- `src/context/AppContext.tsx` mengambil lagi transaksi tersimpan dari server agar nomor SPTB asli segera tampil setelah menyimpan.
- Dashboard dan rekap menampilkan tahun aktual dan tahun data; rekap memakai kop BBPKA PDN IV.

## Bukti uji database pada 10 November 2026
- Pembuatan RM oleh BPP RM berhasil; upaya membuat PNBP ditolak.
- Pembuatan PNBP oleh BPP PNBP berhasil; upaya membuat RM ditolak.
- Finalisasi, penandaan SAKTI, dan larangan menghapus transaksi SAKTI diuji secara sementara.
- SELECT RLS menunjukkan: Bendahara melihat transaksi PNBP yang tersedia; BPP RM tidak melihatnya; BPP PNBP dapat melihatnya.
- **Sudah terdapat satu transaksi PNBP Draft yang dibuat melalui pengguna pada DEV.** Nomor PNBP /1 sudah digunakan; pengujian berikutnya harus memperhitungkan counter existing, tidak menganggap DEV kosong.
- Pengujian mutasi sementara menggunakan transaksi SQL berakhir ROLLBACK. Jangan melakukan `TRUNCATE`, `DELETE`, atau reset counter untuk membersihkan data pengujian tanpa identifikasi kepemilikan.
- Peringatan advisor: `nomor_sptb_counter` tanpa policy memang sengaja tidak dapat diakses client; **leaked-password protection Supabase Auth masih OFF** dan harus ditinjau sebelum produksi.

## Uji penerimaan yang masih wajib
- [ ] Login/logout dan ganti password pertama untuk ketiga akun, termasuk akun nonaktif dan sesi kedaluwarsa.
- [ ] Melalui browser Preview, buat dan koreksi Draft RM, PNBP; pastikan nomor unik, immutable, berurutan per sumber/bulan, dan tidak ditulis oleh browser.
- [ ] Cetak kuitansi individual/kolektif dan SPTB, bandingkan tampilan A4 serta hasil unduh dengan dokumen contoh yang disetujui.
- [ ] Uji PPN, PPh, dan netto serta hasil rincian untuk ketiga tipe kuitansi (termasuk perjalanan dinas), tanpa memakai data operasional riil.
- [ ] Final → Draft → Final; larangan koreksi/hapus saat SAKTI, serta prosedur buka kunci dan audit dengan alasan.
- [ ] Uji bulk SAKTI maksimal 100 dan laporan kegagalan per item (fitur parsial masih perlu diverifikasi/ditingkatkan).
- [ ] Uji ekspor CSV/Excel per baris rincian dan kesesuaian filter/urutan/paginasi.
- [ ] Uji bahwa BPP RM tidak bisa membaca/mengubah PNBP; BPP PNBP tidak bisa membaca/mengubah RM — melalui browser dan REST.
- [ ] Uji create/reset/nonaktif/ubah role BPP oleh Bendahara; blokir operasi admin BPP.
- [ ] Uji keamanan RLS, grant, SQL function, audit log, XSS injection, dan konfigurasi CORS/Preview.
- [ ] Atur pengamanan password bocor sesuai kebijakan instansi; siapkan backup dan prosedur pemulihan.
- [ ] Siapkan Supabase Production **terpisah**, jalankan migrasi terverifikasi tanpa data DEV, buat akun pengelola Production secara sah, dan pasang env Production baru di Vercel.
- [ ] Uji smoke test pada staged Production build, lalu minta persetujuan untuk merge ke main/aktivasi domain.

## Kebijakan deployment
- Sampai semua gate lolos, **jangan merge `fitur-supabase-auth` ke `main`**, jangan menyambungkan Supabase DEV ke domain utama, dan jangan mengubah deployment `sip-bp.vercel.app`.
- Status READY pada Vercel membuktikan build, bukan keberhasilan uji fungsi/browser atau kesiapan data keuangan resmi.
