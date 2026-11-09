# Validasi tata letak SPTB berbasis gambar referensi

Target rilis: commit `35ed22d3975db7e3a33f796a0d35b34b0bca1a57` pada `main`.

- Judul: SURAT PERNYATAAN TANGGUNG JAWAB BELANJA, nomor SPTB
- Identitas: kode satker, nama satker, tanggal/nomor DIPA, klasifikasi anggaran
- Narasi: pernyataan tanggung jawab KPA
- Tabel: No, Akun, Penerima, Uraian, Bukti (Tgl., No.), Jumlah, Pajak dipungut Bendahara Pengeluaran (PPN, PPh)
- Total: bruto, PPN dan PPh, bukan netto
- Penutup dan tanda tangan: PPK/Bendahara Pengeluaran, Makassar
- Nilai DIPA dan klasifikasi anggaran diisi pada pratinjau; tidak menyisipkan data contoh dari gambar sebagai fakta setiap transaksi.
- Tidak ada migrasi database atau perubahan transaksi; deployment otomatis Vercel pada main dilakukan oleh integrasi Git.
- Skenario SSR di `tests/sptbReference.test.ts` memvalidasi struktur dan total referensi, namun layout cetak fisik/PDF tetap membutuhkan UAT visual melalui browser.

Dokumen ini memicu validasi Pull Request untuk commit layout SPTB yang sudah berada di `main`.
