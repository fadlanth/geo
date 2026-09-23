# Rules: GEO INFO Anti-Slop Policy

Proyek: GEO INFO (Sistem Informasi Akademik Geosains - React + Vite + TS + Tailwind + Supabase).
Target: Power-user internal kampus (admin, operator, dosen).
Branding: Sudah final (`src/index.css` Tech-Driven Academy Palette). Dilarang ubah atau desain ulang.

## Aturan Utama Antislop
- Gunakan paket antislop penuh: core, antislop-ui, antislop-copywriting, antislop-human, antislop-layoutmobile, antislop-code.
- **Default Mode**: AFTER (Audit) untuk kode existing di `src/`.
  - Temukan pola AI-slop, susun dalam daftar bernomor, tunggu persetujuan user sebelum melakukan perubahan kode.
- **Mode DURING**: Hanya untuk fitur atau komponen baru yang masih dalam tahap pengerjaan.

## Fokus & Batasan
1. **Keyboard-Only & Kontras**: Form CRUD dan tabel data harus nyaman dioperasikan keyboard-only dengan indikator focus jelas dan kontras tinggi.
2. **Kejujuran Data**: Smart Importer dan Matriks Akreditasi LAMSAMA/IKU-1 dilarang menampilkan angka contoh yang tersamar seperti data riil.
3. **Komentar Kode**: Bersihkan komentar AI-generic di `src/`.
4. **AREA TERLINDUNGI (STRICT DO NOT TOUCH)**:
   - Logic RLS Supabase
   - RPC `audit_log_insert`
   - Segala hal yang berhubungan dengan Sandi Dosen
5. **Konsistensi Desain**: Selalu ikuti styling & komponen yang sudah ada di proyek.
