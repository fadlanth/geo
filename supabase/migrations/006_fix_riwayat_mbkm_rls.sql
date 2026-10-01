-- ==============================================================================
-- GEO INFO — PULIHKAN POLICY RLS RIWAYAT MBKM (KEGIATAN LUAR PRODI)
-- File: supabase/migrations/006_fix_riwayat_mbkm_rls.sql
-- ==============================================================================

-- 1. Pastikan RLS aktif pada tabel riwayat_mbkm
ALTER TABLE public.riwayat_mbkm ENABLE ROW LEVEL SECURITY;

-- 2. Bersihkan policy lama jika ada
DROP POLICY IF EXISTS "riwayat_mbkm_all" ON public.riwayat_mbkm;
DROP POLICY IF EXISTS "Staff read riwayat_mbkm" ON public.riwayat_mbkm;
DROP POLICY IF EXISTS "Operator/Admin write riwayat_mbkm" ON public.riwayat_mbkm;

-- 3. Pasang policy baca (SELECT) untuk admin, operator, dan dosen
CREATE POLICY "Staff read riwayat_mbkm" ON public.riwayat_mbkm
  FOR SELECT TO authenticated
  USING (public.get_current_role() IN ('admin', 'operator', 'dosen'));

-- 4. Pasang policy tulis (INSERT, UPDATE, DELETE) untuk admin dan operator
CREATE POLICY "Operator/Admin write riwayat_mbkm" ON public.riwayat_mbkm
  FOR ALL TO authenticated
  USING (public.get_current_role() IN ('admin', 'operator'))
  WITH CHECK (public.get_current_role() IN ('admin', 'operator'));
