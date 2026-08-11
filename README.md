# GEO INFO — Sistem Informasi Akademik Geosains Universitas

Aplikasi web akademik (React + TypeScript + Vite + Tailwind + Supabase):
akses publik hanya angka agregat, data pribadi dilindungi RLS dan hanya bisa
diubah pengguna terautentikasi.

## Fitur

- **Publik/Landing** — statistik agregat tanpa login (view `v_publik_rekap`)
- **Login & Peran** — Supabase Auth; peran `admin`, `operator`, `dosen`, `guest`
- **Ringkasan** — dashboard statistik + grafik rekap per angkatan/status lulusan, drill-down per sel
- **Mahasiswa** — CRUD, plotting dosen wali, filter, import/export Excel
- **Dosen** — CRUD, Sandi Dosen (tersembunyi, tidak diexport), grafik jabatan
- **Prestasi** — CRUD prestasi + anggota, filter tingkat/juara
- **Magang & MBKM** — CRUD riwayat magang, filter semester
- **Tracer Study** — CRUD profil lulusan, rekap gaji/status, export multi-sheet
- **Log Aktivitas** — audit trail (admin-only)

## Quick Start

```bash
cp .env.example .env   # isi VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (publishable key)
npm install
npm run dev            # http://localhost:3000
```

Script lain: `npm run lint`, `npm run build`, `npm run preview`.

## Setup Database (urutan penting)

1. **Database baru:** jalankan script DDL dari `src/lib/academicService.ts` (`SUPABASE_DDL`),
   lalu `supabase/migrations/001_security.sql`.
2. **Database lama:** jalankan `supabase/migrations/002_reconcile.sql` dulu
   (kolom `sandi_dosen` + unique constraint), lalu `001_security.sql`.
3. **Set peran:** user baru otomatis `guest`. Promote lewat SQL Editor:
   ```sql
   UPDATE public.profiles SET role = 'admin' WHERE email = 'nama@example.ac.id';
   ```

> Folder `supabase/migrations/` sengaja tidak ikut git (`.gitignore`).

## Keamanan

- RLS aktif di semua tabel; anon hanya baca `v_publik_rekap`.
- `audit_log` ditulis via RPC `audit_log_insert` (SECURITY DEFINER) — user tidak bisa menulis langsung.
- Sandi Dosen tidak masuk audit log dan tidak ikut export.
- Kunci `service_role` tidak pernah dipakai di kode.

## Lisensi

Universitas / Program Studi Geosains, Fakultas Sains.