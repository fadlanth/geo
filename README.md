# GEO INFO - Sistem Informasi Akademik Geofisika UNPAD

Aplikasi web sistem informasi akademik (React, TypeScript, Vite, Tailwind CSS, Supabase):
akses publik hanya menyajikan angka agregat, sedangkan data riil dilindungi Row Level Security (RLS) Supabase dan hanya dapat dikelola oleh pengguna terautentikasi sesuai perannya.

## Fitur Utama

- **Publik / Landing Page**: Statistik agregat publik tanpa login (view `v_publik_rekap`).
- **Autentikasi & Otorisasi Berjenjang**: Supabase Auth dengan hak akses berbasis peran: `admin`, `operator`, `dosen`, dan `guest`.
- **Profil Pengguna**: Dropdown status akun di header navigasi (nama, fakultas, peran) dilengkapi aksi keluar sistem yang aman.
- **Ringkasan**: Dashboard statistik, grafik rekapitulasi per angkatan dan status kelulusan, serta drill-down data per sel tabel.
- **Master Mahasiswa**: Manajemen data mahasiswa, plotting dosen wali, pencarian multi-kolom, filter status/angkatan, dan impor/ekspor Excel.
- **Master Dosen**: Manajemen data dosen, sandi verifikasi dosen (terlindungi, tidak diekspor), dan visualisasi jabatan fungsional.
- **Prestasi Mahasiswa**: Pencatatan capaian prestasi akademik/non-akademik beserta anggota tim dan filter tingkat kejuaraan.
- **Kegiatan Mahasiswa di Luar Prodi (MBKM)**:
  - **Magang Industri**: Rekapitulasi kerja praktik dan magang mahasiswa di dunia usaha/industri.
  - **Penelitian Dosen**: Pencatatan keterlibatan mahasiswa dalam riset dosen homebase.
  - Navigasi sub-rute cepat berbasis hash (`#mbkm/magang` dan `#mbkm/penelitian`).
- **Tracer Study & Monitoring Cohort**:
  - **Cohort Selector**: Analisis berbasis tahun kelulusan resmi prodi (TS, TS-1, TS-2, TS-3, dst.).
  - **Response Rate Indicator**: Pemantauan tingkat keterlacakan lulusan dengan target kepatuhan akreditasi Unggul LAMSAMA (≥ 80%).
  - **Gap Analysis (Alumni Belum Terlacak)**: Sinkronisasi data kelulusan dengan kuesioner tracer untuk mendeteksi alumni yang belum merespons, dilengkapi info Dosen Wali dan aksi cepat input/salin data.
  - **Matriks Akreditasi LAMSAMA & IKU-1**: Tabel matriks standar borang akreditasi (waktu tunggu kerja, skala perusahaan, studi lanjut, wiraswasta, gaji ≥ UMR) siap ekspor ke Excel.
  - **Smart Importer Kuesioner**: Parser data tracer study unduhan kuesioner universitas / Dikti (kode f8, f5-02, dsb.) serta file CSV/Excel manual.
- **Log Aktivitas (Audit Trail)**: Pencatatan jejak mutasi data (khusus admin) dengan inspeksi payload JSON dan dukungan navigasi keyboard penuh.

## Teknologi & Arsitektur

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Build Tool**: Vite dengan optimasi `manualChunks` (pemisahan vendor bundle XLSX, Recharts, Supabase, Lucide)
- **Backend & Database**: Supabase (PostgreSQL, Row Level Security, RPC Security Definer)
- **Icons**: Lucide React
- **Keandalan**: Error Boundary mandiri dengan diagnosa runtime

## Panduan Instalasi Lokal

```bash
# Salin konfigurasi environment
cp .env.example .env

# Isi variabel pada berkas .env:
# VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
# VITE_SUPABASE_ANON_KEY=eyxxxxxxxxxxxxxxxx

# Pasang dependensi
npm install

# Jalankan server pengembangan lokal (http://localhost:3000)
npm run dev
```

Perintah lain yang tersedia:
- `npm run build`: Kompilasi aset produksi ke folder `dist/`
- `npm run preview`: Uji coba bundle produksi secara lokal
- `npm run lint`: Pemeriksaan standar kualitas kode
- `npm test`: Menjalankan unit test (Vitest)
- `npm run test:watch`: Mode watch unit test

## Setup Database Supabase

1. **Inisialisasi Database Baru**:
   Jalankan skrip DDL pada `src/lib/academicService.ts` (`SUPABASE_DDL`), kemudian jalankan berkas migrasi keamanan `supabase/migrations/001_security.sql`.
2. **Database yang Sudah Berjalan**:
   Jalankan migrasi `supabase/migrations/002_reconcile.sql` terlebih dahulu (penyesuaian kolom `sandi_dosen` dan unique constraint), lalu jalankan `001_security.sql`.
3. **Konfigurasi Hak Akses**:
   Pengguna baru yang mendaftar secara bawaan berstatus `guest`. Tingkatkan peran menjadi `admin` atau `operator` melalui SQL Editor Supabase:
   ```sql
   UPDATE public.profiles SET role = 'admin' WHERE email = 'nama@unpad.ac.id';
   ```

## Standar Keamanan & Tata Kelola Data

- Row Level Security (RLS) aktif di seluruh tabel data; peran anonim hanya dapat membaca ringkasan publik `v_publik_rekap`.
- Pencatatan `audit_log` diproses melalui fungsi RPC `audit_log_insert` (SECURITY DEFINER), mencegah manipulasi langsung dari sisi klien.
- Kebijakan retensi data: Log audit yang melampaui usia 3 tahun dapat dibersihkan secara aman menggunakan fungsi SQL `cleanup_old_audit_logs()`.
- Sandi verifikasi dosen tidak dicatat dalam riwayat audit log dan tidak disertakan dalam berkas ekspor data.
- Kunci `service_role` tidak pernah digunakan maupun disematkan pada kode sisi klien.

## Catatan Rilis & Kesiapan Produksi (Production Ready)

Aplikasi ini telah melewati fase audit ketat (Anti-Slop Audit) meliputi:
1.  **Aksesibilitas Tinggi:** Sistem penanda fokus (*focus-ring*) terstandar untuk navigasi kibor.
2.  **Ketahanan Kesalahan (Resilience):** *Error Boundary* global dilengkapi tombol *escape hatch* ganda (muat ulang normal & reset data sesi lokal).
3.  **Higienitas Kode:** Bebas dari komentar *boilerplate* AI berlebih.
4.  **Keamanan Ekstra:** Pemblokiran eksekusi RPC yang tidak valid dan pembatasan pencarian *path* (*hijacking prevention*).

## Lisensi

Program Studi Geofisika, Fakultas Matematika dan Ilmu Pengetahuan Alam (FMIPA), Universitas Padjadjaran.