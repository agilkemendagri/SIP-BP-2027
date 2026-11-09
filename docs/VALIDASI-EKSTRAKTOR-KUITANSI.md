# Validasi Ekstraktor Kuitansi

Pekerjaan pada branch main: engine PDF/OCR gratis dalam iframe sandbox, parser kuitansi Indonesia, formulir verifikasi dan penyimpanan Draft melalui RPC Supabase yang sudah ada. PDF teks diproses lokal; screenshot dan PDF scan membutuhkan model OCR yang diunduh dari CDN. Tidak ada endpoint pembayaran atau API AI berbayar.

Pengguna wajib memastikan setiap nilai dari dokumen asli sebelum simpan; nomor SPTB yang terbit adalah nomor baru, bukan nomor dokumen luar. Tidak ada migrasi atau penghapusan data Production.

Branch ini dibuat untuk memicu pengujian TypeScript, Bun dan build; hasilnya harus diperiksa sebelum menyatakan fitur siap.
