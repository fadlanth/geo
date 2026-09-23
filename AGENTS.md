# GEO INFO — Project Rules & Guidelines

## 1. Identitas & Karakteristik Proyek
- **Aplikasi**: GEO INFO (Sistem Informasi Akademik Geosains) — React + TypeScript + Vite + Tailwind CSS + Supabase.
- **Status**: Tahap akhir (fitur utama CRUD Mahasiswa/Dosen/Prestasi/Magang, Ringkasan, Tracer Study & Monitoring Cohort sudah aktif).
- **Target Pengguna**: Khusus **internal kampus** (admin, operator, dosen) — bukan publik umum.
  - Fokus utama: Efisiensi kerja untuk power-user (input cepat, navigasi lancar, tampilan padat informatif).
  - Bahasa/Copy: Ringkas, jelas, to-the-point, dan berstandar tata kelola kampus (bukan copy persuasif/marketing/ramah orang awam).
- **Branding & Visual**: Sudah ditentukan dan final (`src/index.css` Tech-Driven Academy Palette: `--color-primary: #9C3434`, dsb.).
  - **DILARANG** mengubah, mengusulkan ulang, atau "memperbaiki" preferensi visual/warna yang sudah ada.

---

## 2. Kebijakan Anti-Slop (Plugin `antislop` Penuh)
Semua pekerjaan wajib mematuhi aturan plugin **antislop** dengan modul lengkap:
- `antislop` (Core filter anti-slop)
- `antislop-ui` (UI, density, micro-interaction tanpa generic gradients/bubbles)
- `antislop-copywriting` (Copy ringkas, hilangkan frasa AI generik)
- `antislop-human` (Aksesibilitas, contrast ratio WCAG, keyboard navigation)
- `antislop-layoutmobile` (Responsivitas fluid, handling overflow, tap target)
- `antislop-code` (Kebersihan kode & komentar tanpa komentar AI boilerplate)

---

## 3. Penentuan Mode Kerja
- **Default: Mode AFTER (Audit)** untuk semua kode yang SUDAH ada di `src/`:
  - **JANGAN** langsung mengubah logic atau visual yang sudah sesuai branding existing.
  - Cari dan tandai pola AI-slop (komentar boilerplate, copy bertele-tele/generik, kontras rendah, breakpoint kaku, dll.).
  - Sajikan temuan dalam bentuk **daftar temuan bernomor (numbered list)**.
  - **Tunggu persetujuan (approval) pengguna** untuk menentukan item mana yang akan dieksekusi.
- **Mode DURING**: Hanya berlaku untuk fitur atau komponen baru yang masih dalam tahap pengerjaan aktif.

---

## 4. Fokus Area Audit & Batasan Keamanan
1. **Form CRUD & Tabel**:
   - Wajib bisa digunakan *keyboard-only* (`Tab`, `Shift+Tab`, `Enter`, `Escape`) dengan focus-ring / indicator yang kontras dan jelas.
   - Kontras teks dan border harus tegas untuk kenyamanan kerja harian operator data.
2. **Smart Importer Kuesioner & Matriks Akreditasi LAMSAMA / IKU-1**:
   - Pastikan tidak ada angka contoh (mock/dummy) yang tampil seolah-olah data riil.
   - Placeholder atau status kosong harus eksplisit dinyatakan kosong (0 atau `-`) bila data belum tersedia.
3. **Higienitas Komentar Kode (`antislop-code`)**:
   - Hapus komentar AI-generic (komentar yang hanya merestat fungsi/syntax).
   - **PERINGATAN KERAS / STRICT PROTECTED LOGIC**:
     - **DILARANG** mengubah atau mengutak-atik logika Row Level Security (RLS) Supabase.
     - **DILARANG** mengubah RPC `audit_log_insert`.
     - **DILARANG** mengubah atau menyentuh alur verifikasi atau penanganan **Sandi Dosen**.
4. **Kepatuhan Desain & Komponen**:
   - Selalu rujuk token CSS di `src/index.css` dan komponen dasar di `src/components/` (Button, StatusChip, Pagination, dll.).
   - Antislop hanya membuang slop teknis & visual, bukan meredesign estetika yang sudah ada.
