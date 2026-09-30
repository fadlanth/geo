-- ==============================================================================
-- GEO INFO — ALLOW NULL ON BUKTI DOKUMEN (RIWAYAT MBKM / PENELITIAN DOSEN)
-- File: supabase/migrations/003_allow_null_bukti_penelitian.sql
-- ==============================================================================

-- Pastikan kolom bukti_dokumen di riwayat_mbkm dapat bernilai NULL (opsional)
ALTER TABLE IF EXISTS public.riwayat_mbkm 
  ALTER COLUMN bukti_dokumen DROP NOT NULL;
