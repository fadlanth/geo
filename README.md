# GEO INFO — Sistem Informasi Akademik Geofisika

Dashboard keamanan aplikasi web (React + TypeScript + Vite + Tailwind + Supabase) untuk
Program Studi Geofisika Universitas Padjadjaran. Fokus pada **akses publik terbatas**
(angka agregat tanpa login) + **data pribadi terlindungi** (CRUD hanya staf terautentikasi).

## Fitur

| Fitur | Deskripsi |
|-------|-----------|
| **Publik / Landing** | Angka agregat umum (mahasiswa/dosen/prestasi/alumni) dapat dilihat siapa saja **tanpa login** — tidak ada data pribadi |
| **Login & Peran** | Email + password (Supabase Auth). Akun pertama otomatis jadi `admin`; sisanya `guest` |
| **Ringkasan** | Dashboard overview: statistik mahasiswa aktif, dosen, prestasi, MBKM, tracer alumni |
| **Mahasiswa** | CRUD, plotting dosen wali, filter angkatan/status, import/export Excel, validasi NPM & tahun lulus |
| **Dosen** | CRUD, status wali/non-wali, distribusi jabatan & golongan, grafik interaktif |
| **Prestasi** | CRUD prestasi + anggota kelompok, expandable detail, filter tingkat/juara |
| **Magang & MBKM** | CRUD riwayat magang, pembimbing lapangan & dalam, filter semester |
| **Tracer Study** | CRUD profil lulusan (Bekerja/Studi Lanjut/Wiraswasta), donut chart, distribusi perusahaan |
| **Log Aktivitas** | Audit trail siapa mengubah data apa & kapan (admin-only) |

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite
- **UI:** Tailwind CSS 4 + Lucide React + Recharts
- **Backend:** Supabase (PostgreSQL) — Auth, database & kebijakan akses
- **Auth:** Supabase Auth (email/password) + tabel `profiles` peran

## Persiapan Lingkungan

1. Salin `.env.example` → `.env`:
   ```bash
   cp .env.example .env
   ```
2. Di isi **kunci anon/publishable & URL proyek** dari Supabase Dashboard → Settings → API → API Keys.
   > Gunakan `publishable` key (diawali `sb_publishable_`), **bukan** `service_role`/`secret`.
3. Install & jalankan dev server:
   ```bash
   npm install
   npm run dev
   ```
   Buka `http://localhost:5173` (atau port yang muncul di terminal).

## Keamanan & Migrasi (WAJIB — urut penting)

> ⚠️ Jika belum, **rotasi key service_role yang bocor dulu**, lalu gunakan publishable key.

Jalankan migrasi **diurut** pada Supabase Dashboard → SQL Editor → paste → **Run**:

1. `supabase/migrations/0001_security.sql` — RLS aktif, tabel `profiles` (peran), trigger admin otomatis, view `v_publik_rekap`, kebijakan anon (hanya aggregate).
2. `supabase/migrations/0002_integrity.sql` — constraint `CHECK`, index kecepatan, kolom `updated_at` otomatis.
3. `supabase/migrations/0003_audit.sql` — tabel `audit_log` & RPC `audit_log_insert`.

## Peran Pengguna (Role)

| Peran | Akses |
|-------|-------|
| **admin** | Semua CRUD + Lihat log aktivitas |
| **operator** | CRUD semua data (kecuali audit) |
| **dosen** | Lihat mahasiswa bimbingan + profil dosen (read-only) |
| **guest** | Hanya dashboard statistik (tanpa data pribadi) |

## Akun Demo Pertama

Karena akun **pertama** otomatis jadi `admin`:
1. Supabase Dashboard → Authentication → Users → **Add user** → email `admin@geofisika.unpad.id`, beri password, klik **Add user**.
2. Buka `0001_security.sql` trigger — profil otomatis terbuat dengan role `admin`.
3. Buka app → klik **Masuk** → masukkan email+kata sandi → masuk sebagai admin.

> Setelah login pertama, klik **Logout** di sidebar, lalu login kembali untuk memastikan profil termuat.

## License

UNPAD / Program Studi Geofisika, Fakultas MIPA.
