import { supabase } from './supabase';
import { Mahasiswa, Dosen, Prestasi, TracerStudy, RiwayatMBKM, AnggotaPrestasi } from '../types';

export const SUPABASE_DDL = `-- SALIN SCRIPT INI KE SQL EDITOR UNTUK MEMBUAT TABEL DATA
-- Setelah ini jalankan juga: supabase/migrations/001_security.sql
-- (untuk RLS, profile, dan view publik).

CREATE TABLE IF NOT EXISTS public.dosen (
  nip TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  kode_dosen TEXT,
  golongan TEXT,
  pangkat TEXT,
  jabatan TEXT,
  is_dosen_wali BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  CONSTRAINT dosen_nip_no_space CHECK (nip = regexp_replace(nip, '\s+', '', 'g'))
);

CREATE TABLE IF NOT EXISTS public.mahasiswa (
  npm TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  angkatan INTEGER NOT NULL,
  jenis_kelamin TEXT,
  fakultas TEXT,
  prodi TEXT,
  status TEXT NOT NULL,
  nip_dosen_wali TEXT REFERENCES public.dosen(nip) ON DELETE SET NULL,
  tahun_lulus INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  CONSTRAINT mahasiswa_nip_wali_no_space CHECK (nip_dosen_wali IS NULL OR nip_dosen_wali = regexp_replace(nip_dosen_wali, '\s+', '', 'g'))
);

CREATE TABLE IF NOT EXISTS public.prestasi (
  id_prestasi UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  npm_mahasiswa VARCHAR,
  nama_mahasiswa VARCHAR,
  nama_kompetisi VARCHAR NOT NULL,
  tingkat VARCHAR,
  juara_ke INTEGER,
  jenis_peserta VARCHAR NOT NULL DEFAULT 'Individu',
  tahun_kegiatan INTEGER,
  tempat VARCHAR,
  dosen_pembimbing VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.anggota_prestasi (
  id_anggota UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  id_prestasi UUID NOT NULL REFERENCES public.prestasi(id_prestasi) ON DELETE CASCADE,
  npm TEXT,
  nama_lengkap TEXT NOT NULL,
  prodi TEXT,
  universitas TEXT,
  peran TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.riwayat_mbkm (
  id_mbkm UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  npm_mahasiswa TEXT NOT NULL REFERENCES public.mahasiswa(npm) ON DELETE CASCADE,
  tempat_instansi TEXT NOT NULL,
  semester TEXT NOT NULL,
  judul_topik_magang TEXT,
  dosen_pembimbing_lapangan TEXT,
  nip_dosen_pembimbing_dalam TEXT REFERENCES public.dosen(nip) ON DELETE SET NULL,
  periode_magang TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.tracer_study (
  id_tracer UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  npm_mahasiswa TEXT NOT NULL REFERENCES public.mahasiswa(npm) ON DELETE CASCADE,
  tahun_lulus INTEGER NOT NULL,
  status_lulusan TEXT NOT NULL,
  masa_tunggu_bulan INTEGER DEFAULT 0,
  -- Bekerja
  instansi_pekerjaan TEXT,
  jabatan TEXT,
  tingkat_perusahaan TEXT,
  -- Studi Lanjut
  universitas_tujuan TEXT,
  program_studi TEXT,
  -- Wiraswasta
  bidang_usaha TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- PENTING: ROW LEVEL SECURITY diaktifkan di 001_security.sql.
-- JANGAN jalankan "DISABLE ROW LEVEL SECURITY" pada lingkungan produksi.

-- Migration: add columns for existing database
ALTER TABLE public.mahasiswa ADD COLUMN IF NOT EXISTS tahun_lulus INTEGER;
ALTER TABLE public.tracer_study ADD COLUMN IF NOT EXISTS tingkat_perusahaan TEXT;
ALTER TABLE public.tracer_study ADD COLUMN IF NOT EXISTS universitas_tujuan TEXT;
ALTER TABLE public.tracer_study ADD COLUMN IF NOT EXISTS program_studi TEXT;
ALTER TABLE public.tracer_study ADD COLUMN IF NOT EXISTS bidang_usaha TEXT;

-- Natural-key unique constraints (for upsert conflict resolution)
ALTER TABLE public.riwayat_mbkm ADD CONSTRAINT riwayat_mbkm_unique UNIQUE (npm_mahasiswa, tempat_instansi, semester);
ALTER TABLE public.prestasi ADD CONSTRAINT prestasi_unique UNIQUE (npm_mahasiswa, nama_kompetisi, juara_ke);
ALTER TABLE public.tracer_study ADD CONSTRAINT tracer_unique UNIQUE (npm_mahasiswa, tahun_lulus);
`;

export const academicService = {
  // --- AUDIT LOG (best-effort) ---
  async logAuditChange(
    entitas: string,
    aksi: 'insert' | 'update' | 'delete',
    entitasId: string,
    payload?: unknown
  ): Promise<void> {
    try {
      const { error } = await supabase.rpc('audit_log_insert', {
        p_entitas: entitas,
        p_aksi: aksi,
        p_entitas_id: entitasId,
        p_payload: payload ? JSON.parse(JSON.stringify(payload)) : null,
      });
      if (error) console.warn(`Audit log gagal (${entitas}/${aksi}):`, error.message);
    } catch (err) {
      // Tidak boleh menggagalkan operasi utama
      console.warn(`Audit log gagal (${entitas}/${aksi}):`, err);
    }
  },

  // --- DOSEN ---
  async getDosen(): Promise<Dosen[]> {
    const { data, error } = await supabase.from('dosen').select('*').order('nama', { ascending: true });
    if (error) throw new Error(error.message);
    return data as Dosen[];
  },

  async saveDosen(dosen: Dosen): Promise<void> {
    const isNew = await this._isNewRow('dosen', 'nip', dosen.nip);
    const { error } = await supabase.from('dosen').upsert(dosen, { onConflict: 'nip' });
    if (error) throw new Error(error.message);
    await this.logAuditChange('dosen', isNew ? 'insert' : 'update', dosen.nip, dosen);
  },

  // Cek apakah baris dengan primary key ada (untuk label aksi insert/update)
  async _isNewRow(table: string, col: string, value: string): Promise<boolean> {
    const { count, error } = await supabase
      .from(table)
      .select('!', { count: 'exact', head: true })
      .eq(col, value);
    if (error) return false;
    return count === 0;
  },

  async deleteDosen(nip: string): Promise<void> {
    try {
      const { error: updateError } = await supabase.from('mahasiswa').update({ nip_dosen_wali: null }).eq('nip_dosen_wali', nip);
      if (updateError) console.warn("Supabase error updating related students' nip_dosen_wali:", updateError);
    } catch (err) {
      console.warn("Could not update related students in Supabase, proceeding with deletion:", err);
    }
    const { error } = await supabase.from('dosen').delete().eq('nip', nip);
    if (error) throw new Error(error.message);
    await this.logAuditChange('dosen', 'delete', nip, { nip });
  },

  async bulkInsertDosen(data: Dosen[]): Promise<void> {
    const { error } = await supabase.from('dosen').upsert(data, { onConflict: 'nip' });
    if (error) throw new Error(error.message);
    await this.logAuditChange('dosen', 'insert', `bulk_${data.length}`, { count: data.length });
  },

  // --- MAHASISWA ---
  async getMahasiswa(): Promise<Mahasiswa[]> {
    const { data, error } = await supabase.from('mahasiswa').select('*').order('npm', { ascending: true });
    if (error) throw new Error(error.message);
    return data as Mahasiswa[];
  },

  async saveMahasiswa(mhs: Mahasiswa): Promise<void> {
    const isNew = await this._isNewRow('mahasiswa', 'npm', mhs.npm);
    const { error } = await supabase.from('mahasiswa').upsert(mhs, { onConflict: 'npm' });
    if (error) throw new Error(error.message);
    await this.logAuditChange('mahasiswa', isNew ? 'insert' : 'update', mhs.npm, mhs);
  },

  async bulkInsertMahasiswa(data: Mahasiswa[]): Promise<void> {
    const { error } = await supabase.from('mahasiswa').upsert(data, { onConflict: 'npm' });
    if (error) throw new Error(error.message);
    await this.logAuditChange('mahasiswa', 'insert', `bulk_${data.length}`, { count: data.length });
  },

  async deleteMahasiswa(npm: string): Promise<void> {
    try {
      const { error: err1 } = await supabase.from('prestasi').delete().eq('npm_mahasiswa', npm);
      if (err1) console.warn("Supabase error deleting related prestasi:", err1);
      const { error: err2 } = await supabase.from('riwayat_mbkm').delete().eq('npm_mahasiswa', npm);
      if (err2) console.warn("Supabase error deleting related MBKM:", err2);
      const { error: err3 } = await supabase.from('tracer_study').delete().eq('npm_mahasiswa', npm);
      if (err3) console.warn("Supabase error deleting related tracer study:", err3);
    } catch (err) {
      console.warn("Could not clean up dependent rows in Supabase, proceeding with deletion:", err);
    }
    const { error } = await supabase.from('mahasiswa').delete().eq('npm', npm);
    if (error) throw new Error(error.message);
    await this.logAuditChange('mahasiswa', 'delete', npm, { npm });
  },

  // --- PRESTASI ---
  async getPrestasi(): Promise<Prestasi[]> {
    const { data, error } = await supabase.from('prestasi').select('*');
    if (error) throw new Error(error.message);
    return data as Prestasi[];
  },

  async savePrestasi(pres: Prestasi): Promise<void> {
    const { error } = await supabase
      .from('prestasi')
      .upsert(pres, { onConflict: 'npm_mahasiswa, nama_kompetisi, juara_ke' });
    if (error) throw new Error(error.message);
    await this.logAuditChange('prestasi', pres.id_prestasi ? 'update' : 'insert', pres.id_prestasi || `${pres.npm_mahasiswa || ''}|${pres.nama_kompetisi}`, pres);
  },

  async deletePrestasi(id_prestasi: string): Promise<void> {
    const { error } = await supabase.from('prestasi').delete().eq('id_prestasi', id_prestasi);
    if (error) throw new Error(error.message);
    await this.logAuditChange('prestasi', 'delete', id_prestasi, { id_prestasi });
  },

  // --- ANGGOTA PRESTASI ---
  async getAnggotaPrestasi(): Promise<AnggotaPrestasi[]> {
    const { data, error } = await supabase.from('anggota_prestasi').select('*');
    if (error) throw new Error(error.message);
    return data as AnggotaPrestasi[];
  },

  async saveAnggotaPrestasi(anggota: AnggotaPrestasi): Promise<void> {
    const { error } = await supabase.from('anggota_prestasi').upsert(anggota);
    if (error) throw new Error(error.message);
    await this.logAuditChange('anggota_prestasi', anggota.id_anggota ? 'update' : 'insert', anggota.id_anggota || `${anggota.nama_lengkap}|${anggota.id_prestasi}`, anggota);
  },

  async deleteAnggotaPrestasi(id_anggota: string): Promise<void> {
    const { error } = await supabase.from('anggota_prestasi').delete().eq('id_anggota', id_anggota);
    if (error) throw new Error(error.message);
    await this.logAuditChange('anggota_prestasi', 'delete', id_anggota, { id_anggota });
  },

  async bulkReplaceAnggotaPrestasi(id_prestasi: string, anggota: AnggotaPrestasi[]): Promise<void> {
    const { error: delError } = await supabase.from('anggota_prestasi').delete().eq('id_prestasi', id_prestasi);
    if (delError) throw new Error(delError.message);
    if (anggota.length > 0) {
      const { error: insError } = await supabase.from('anggota_prestasi').insert(
        anggota.map(({ id_anggota, ...rest }) => rest)
      );
      if (insError) throw new Error(insError.message);
    }
    await this.logAuditChange('anggota_prestasi', 'replace', id_prestasi, { count: anggota.length, id_prestasi });
  },

  // --- MBKM ---
  async getMBKM(): Promise<RiwayatMBKM[]> {
    const { data, error } = await supabase.from('riwayat_mbkm').select('*');
    if (error) throw new Error(error.message);
    return data as RiwayatMBKM[];
  },

  async saveMBKM(mbkm: RiwayatMBKM): Promise<void> {
    const { error } = await supabase
      .from('riwayat_mbkm')
      .upsert(mbkm, { onConflict: 'npm_mahasiswa, tempat_instansi, semester' });
    if (error) throw new Error(error.message);
    await this.logAuditChange('riwayat_mbkm', mbkm.id_mbkm ? 'update' : 'insert', mbkm.id_mbkm || `${mbkm.npm_mahasiswa}|${mbkm.tempat_instansi}|${mbkm.semester}`, mbkm);
  },

  async deleteMBKM(id_mbkm: string): Promise<void> {
    const { error } = await supabase.from('riwayat_mbkm').delete().eq('id_mbkm', id_mbkm);
    if (error) throw new Error(error.message);
    await this.logAuditChange('riwayat_mbkm', 'delete', id_mbkm, { id_mbkm });
  },

  // --- TRACER ALUMNI ---
  async getTracerAlumni(): Promise<TracerStudy[]> {
    const { data, error } = await supabase.from('tracer_study').select('*');
    if (error) throw new Error(error.message);
    return data as TracerStudy[];
  },

  async saveTracerAlumni(alumni: TracerStudy): Promise<void> {
    const { error } = await supabase
      .from('tracer_study')
      .upsert(alumni, { onConflict: 'npm_mahasiswa, tahun_lulus' });
    if (error) throw new Error(error.message);
    await this.logAuditChange('tracer_study', alumni.id_tracer ? 'update' : 'insert', alumni.id_tracer || `${alumni.npm_mahasiswa}|${alumni.tahun_lulus}`, alumni);
  },

  async deleteTracerAlumni(id_tracer: string): Promise<void> {
    const { error } = await supabase.from('tracer_study').delete().eq('id_tracer', id_tracer);
    if (error) throw new Error(error.message);
    await this.logAuditChange('tracer_study', 'delete', id_tracer, { id_tracer });
  },
};
