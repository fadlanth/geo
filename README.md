# GEO INFO — Sistem Informasi Akademik Geosains Universitas

Aplikasi web (React + TypeScript + Vite + Tailwind + Supabase) untuk Program Studi
Geosains Universitas. Fokus pada **akses publik terbatas** (angka
agregat tanpa login) + **data pribadi terlindungi** (CRUD hanya pengguna
terautentikasi, diamankan Row Level Security).

## Fitur

| Fitur | Deskripsi |
|-------|-----------|
| **Publik / Landing** | Angka agregat umum (mahasiswa/dosen/prestasi/MBKM/alumni) dilihat siapa saja **tanpa login** via view `v_publik_rekap` — tanpa data pribadi |
| **Login & Peran** | Email + password (Supabase Auth). Profil dibuat otomatis (role `guest`), di-promote ke `admin`/`operator` lewat SQL |
| **Ringkasan** | Dashboard overview: statistik aktif, rekap per angkatan (stacked bar), status lulusan (donut), sel tabel bisa diklik (drill-down ke daftar mahasiswa) |
| **Mahasiswa** | CRUD, plotting dosen wali, filter angkatan/status, import CSV/Excel, export Excel, validasi NPM & tahun lulus |
| **Dosen** | CRUD, status wali/non-wali, **Sandi Dosen** (tersembunyi, toggle lihat, tidak ikut export), filter & grafik jabatan/golongan |
| **Prestasi** | CRUD prestasi + anggota kelompok (expandable detail), filter tingkat/juara, typeahead mahasiswa |
| **Magang & MBKM** | CRUD riwayat magang, pembimbing lapangan & dalam, filter semester |
| **Tracer Study** | CRUD profil lulusan (Bekerja/Studi Lanjut/Wiraswasta), donut chart, rekap gaji & status per tahun lulus, export Excel multi-sheet |
| **Log Aktivitas** | Audit trail siapa mengubah data apa & kapan (admin-only) |

Polishing umum: pagination bernomor, modal konfirmasi hapus, header card seragam,
skeleton loading, code-split per tab (React.lazy), komponen UI bersama
(Button/IconButton/StatusChip).

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite 6
- **UI:** Tailwind CSS 4 + Lucide React + Recharts (grafik)
- **Data:** xlsx (import/export Excel), Supabase (PostgreSQL)
- **Auth:** Supabase Auth (email/password) + tabel `profiles` (peran)

## Persiapan Lingkungan

1. Salin `.env.example` → `.env`:
   ```bash
   cp .env.example .env
   ```
2. Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` dari Supabase Dashboard →
   Settings → API → API Keys.
   > Gunakan kunci **publishable/anon** (`sb_publishable_...`), **bukan**
   > service_role/secret. Kunci secret tidak boleh masuk frontend.
3. Install & jalankan:
   ```bash
   npm install
   npm run dev
   ```
   Buka `http://localhost:3000`.

Script lain: `npm run lint` (tsc --noEmit), `npm run build` (produksi), `npm run preview`.

## Setup Database (WAJIB — urut ini penting)

### a) Database baru / kosong

1. Salin script DDL dari **`src/lib/academicService.ts`** (konstanta `SUPABASE_DDL`)
   ke SQL Editor → **Run**. Membuat tabel `dosen`, `mahasiswa`, `prestasi`,
   `anggota_prestasi`, `riwayat_mbkm`, `tracer_study` + constraint unik untuk upsert.
2. Jalankan **`supabase/migrations/001_security.sql`** — profiles + trigger, RLS,
   audit_log + RPC, view `v_publik_rekap`, grants.

### b) Database lama (sebelum fitur Sandi Dosen/unique constraint)

1. Jalankan **`supabase/migrations/002_reconcile.sql`** — tambah kolom
   `sandi_dosen`, dedupe + unique constraint untuk upsert.
2. Lalu jalankan **`supabase/migrations/001_security.sql`** (aman: `IF NOT EXISTS`).

> Catatan: folder `supabase/migrations/` sengaja **tidak ikut git**
> (`.gitignore`) — script hanya tersedia secara lokal di mesin pengembang.

### Verifikasi cepat

```sql
-- Semua harus memunculkan baris (0 bars allowed untuk tabel data)
SELECT * FROM public.v_publik_rekap;
SELECT relname FROM pg_class WHERE relname IN ('profiles','audit_log','v_publik_rekap');
SELECT conname FROM pg_constraint WHERE conname LIKE '%_unique';
```

## Akun Pengguna & Peran

User dibuat di Supabase Dashboard → **Authentication → Users → Add user**
(email + password). Trigger `on_auth_user_created` otomatis membuat profil dengan
role **`guest`** untuk user baru.

Untuk menjadikan akun **admin/operator**, jalankan di SQL Editor (ganti email):

```sql
UPDATE public.profiles
SET role = 'admin'   -- atau 'operator' / 'dosen'
WHERE email = 'nama@example.ac.id';
```

| Peran | Akses |
|-------|-------|
| **admin** | Semua CRUD + Log Aktivitas |
| **operator** | CRUD semua data (tanpa Log Aktivitas) |
| **dosen** | Dashboard ringkasan (read-only; data pribadi terbatas) |
| **guest** | Hanya ringkasan/statistik tanpa data pribadi |

## Pertahanan Keamanan

- **RLS aktif** di semua tabel data; anon hanya boleh membaca `v_publik_rekap`.
- **audit_log** ditulis lewat RPC `audit_log_insert` (SECURITY DEFINER); user
  tidak punya hak INSERT/UPDATE/DELETE langsung.
- **Sandi Dosen** tidak pernah dikirim ke audit log dan tidak ada di export.
- Kunci `service_role` tidak pernah dipakai di kode.

## Lisensi

Universitas / Program Studi Geosains, Fakultas Sains.