# SIP-BP — Tahap 1E: hasil pengujian backend otomatis (DEV)

Tanggal pelaksanaan: 10 November 2026.
Lingkungan: Supabase **SIP-BP-DEV** `zfbnclhrvtjodkuqzbcx`, Vercel Preview branch `fitur-supabase-auth`.
Pengujian dilakukan oleh agen melalui konektor Supabase dengan transaksi SQL `BEGIN ... ROLLBACK`. Seluruh data pengujian dibatalkan dan akun/password pengguna tidak diakses.

## Hasil tes backend (LULUS)
1. Simpan Draft jasa profesi: 2 OJ × Rp500.000 = bruto Rp1.000.000; PPN Rp0, PPh Rp50.000, netto Rp950.000; parent dan detail tersimpan konsisten.
2. Nomor SPTB dibuat server; counter PNBP meneruskan dari nomor **/1** yang sudah ada menjadi nomor berikutnya **/2**; bukan memulai ulang. Penomoran RM terpisah.
3. Finalisasi Draft sukses; upaya mengubah transaksi Final tanpa kembali ke Draft ditolak.
4. Tandai Final sebagai digunakan SAKTI sukses; upaya mengubah ke Draft ketika terkunci ditolak; pembukaan kunci dengan alasan valid sukses; kembali ke Draft dan hapus Draft berhasil.
5. BPP RM tidak dapat membaca maupun memfinalisasi transaksi PNBP; BPP PNBP dapat membaca PNBP dan tidak dapat membuat transaksi RM.
6. Penandaan SAKTI pada Draft ditolak.
7. Pembukaan kunci SAKTI dengan alasan terlalu singkat ditolak.
8. Nomor akun tidak valid, daftar penerima kosong, dan netto yang tidak sesuai per rincian semuanya ditolak.
9. Penghapusan transaksi Final ditolak.

## Validasi pasca-uji
- Database sesudah rollback: 1 transaksi, 1 rincian, dan 1 baris counter, sama dengan kondisi sebelum rangkaian pengujian.
- Tidak ada transaksi dengan kegiatan `UJI OTOMATIS - ROLLBACK` yang tersisa.
- Transaksi PNBP Draft existing milik pengguna tidak disentuh.
- Vercel Preview commit `f56c89575719751a1b05de71b0922a377187b37f`: READY. GitHub commit status Vercel: success.
- Build logs Vercel menunjukkan Vite berhasil menghasilkan aset. Ada warning besar bundle JavaScript dan penggunaan `__dirname` pada config Vite; bukan kegagalan build.
- Runtime errors Vercel Preview: tidak ada yang tercatat dalam jendela 30 menit pemeriksaan, tetapi ini **bukan** bukti UI bebas bug.

## Belum teruji secara end-to-end
- Uji interaksi formulir melalui browser login nyata, termasuk error handling, refreshing state, tab baru, dan masa berlaku sesi.
- Tampilan serta hasil cetak A4 kuitansi jasa profesi individual/kolektif, perjalanan luar/dalam kota, dan SPTB.
- Perhitungan dokumen perjalanan dinas dan ragam skenario pajak, serta sinkronisasi detail dokumentasi dengan cetakan.
- Ekspor CSV/Excel, filter/paginasi dan select all filtered untuk penandaan SAKTI.
- Pengujian bulk SAKTI dengan input nyata hingga 100 dan hasil parsial.
- Operasi Edge Function manajemen BPP melalui browser, reset password, sesi nonaktif.
- Pengujian concurrency penomoran transaksi yang simultan (satu transaksi per koneksi tidak memvalidasi perlombaan secara paralel).
- Pengamanan Production: Supabase Production terpisah, kebijakan password bocor, backup, test release, dan persetujuan go-live.

## Catatan keamanan
Supabase Security Advisor masih menandai `auth_leaked_password_protection` disabled. Tinjau dan aktifkan melalui pengaturan Auth sebelum go-live, jika fitur tersedia untuk paket proyek.
`nomor_sptb_counter` memang memiliki RLS tanpa policy baca client, desain yang disengaja.

## Kebijakan rilis
Jangan menganggap tes SQL dapat menggantikan UAT browser. Tetap gunakan Preview DEV untuk uji lanjut dan jangan merge branch pengembangan ke `main` atau mengganti domain `sip-bp.vercel.app` sampai syarat rilis terpenuhi.
