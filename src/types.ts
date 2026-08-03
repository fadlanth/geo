// =====================================================
// GEO INFO — Geofisika UNPAD
// Types sesuai skema Supabase
// =====================================================

export type UserRole = 'admin' | 'operator' | 'dosen' | 'guest';

export interface Profile {
  id: string;          // sama dengan auth.users.id
  email: string;
  nama: string;
  role: UserRole;
  nip?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Mahasiswa {
  npm: string;                // Primary key
  nama: string;
  angkatan: number;
  jenis_kelamin: string;
  fakultas: string;
  prodi: string;
  status: 'Regulasi Akademik' | 'Lulus' | 'Alih Prodi' | 'Undur Diri';
  nip_dosen_wali: string | null;
  tahun_lulus?: number;
}

export interface Dosen {
  nip: string;                // Primary key
  nama: string;
  kode_dosen: string;
  golongan: string;
  pangkat: string;
  jabatan: string;
  is_dosen_wali: boolean;
}

export interface Prestasi {
  id_prestasi?: string;
  npm_mahasiswa?: string;
  nama_mahasiswa?: string;
  nama_kompetisi: string;
  tingkat: 'Internasional' | 'Nasional' | 'Wilayah' | 'Universitas';
  juara_ke: number;
  jenis_peserta: 'Individu' | 'Kelompok';
  tahun_kegiatan?: number;
  tempat?: string;
  dosen_pembimbing?: string;
}

export function getPrestasiNamaMahasiswa(p: Prestasi, mahasiswa: { npm: string; nama: string }[]): string {
  return p.nama_mahasiswa || mahasiswa.find(m => m.npm === p.npm_mahasiswa)?.nama || '-';
}

export interface AnggotaPrestasi {
  id_anggota?: string;
  id_prestasi: string;
  npm?: string | null;
  nama_lengkap: string;
  prodi?: string | null;
  universitas?: string | null;
  peran?: string | null;
}

export interface RiwayatMBKM {
  id_mbkm?: string;
  npm_mahasiswa: string;
  tempat_instansi: string;
  semester: string;
  judul_topik_magang?: string;
  dosen_pembimbing_lapangan?: string;
  nip_dosen_pembimbing_dalam?: string | null;
  periode_magang?: string;
}

export interface TracerStudy {
  id_tracer?: string;         // UUID PK
  npm_mahasiswa: string;
  tahun_lulus: number;
  status_lulusan: 'Bekerja' | 'Studi Lanjut' | 'Wiraswasta' | 'Belum Bekerja';
  masa_tunggu_bulan: number;

  // Bekerja
  instansi_pekerjaan?: string;
  jabatan?: string;
  tingkat_perusahaan?: 'Lokal' | 'Nasional' | 'Multinasional' | 'Internasional';

  // Studi Lanjut
  universitas_tujuan?: string;
  program_studi?: string;

  // Wiraswasta
  bidang_usaha?: string;
}

export function getMasaTungguKategori(bulan: number): string {
  if (bulan <= 6) return '0-6 bln';
  if (bulan <= 12) return '>6-12 bln';
  return '>12 bln';
}

// Helper type for rekap
export interface RekapAngkatan {
  angkatan: number;
  regulasi: number;
  lulus: number;
  alihProdi: number;
  undurDiri: number;
  total: number;
}
