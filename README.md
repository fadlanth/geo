# GEO INFO — Sistem Informasi Akademik Geofisika UNPAD

Dashboard akademik berbasis web untuk Program Studi Geofisika UNPAD. Dibangun dengan React + TypeScript + Supabase.

## Fitur

| Fitur | Deskripsi |
|-------|-----------|
| **Ringkasan** | Dashboard overview: statistik mahasiswa, dosen, prestasi, MBKM, tracer alumni |
| **Mahasiswa** | CRUD, plotting dosen wali, filter angkatan/status, import/export Excel |
| **Dosen** | CRUD, status wali/non-wali, distribusi jabatan & golongan, grafik interaktif |
| **Prestasi** | CRUD prestasi + anggota kelompok, expandable detail, filter tingkat/juara |
| **Magang & MBKM** | CRUD riwayat magang, pembimbing lapangan & dalam, filter semester |
| **Tracer Study** | CRUD profil lulusan (Bekerja/Studi Lanjut/Wiraswasta), dashboard analitik, donut chart status, distribusi tingkat perusahaan |

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite
- **UI:** Tailwind CSS + Recharts (grafik)
- **Backend:** Supabase (PostgreSQL)

## Cara Menjalankan

```bash
npm install
npm run dev
```

Buka `http://localhost:5173`.
