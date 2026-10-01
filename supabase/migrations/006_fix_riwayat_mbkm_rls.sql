-- ==============================================================================
-- GEO INFO — PULIHKAN POLICY RLS RIWAYAT MBKM (KEGIATAN LUAR PRODI)
-- File: supabase/migrations/006_fix_riwayat_mbkm_rls.sql
-- ==============================================================================

-- 1. Berikan izin dasar tabel ke role authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.riwayat_mbkm TO authenticated;

-- 2. Pastikan RLS aktif pada tabel riwayat_mbkm
ALTER TABLE public.riwayat_mbkm ENABLE ROW LEVEL SECURITY;

-- 3. Bersihkan policy lama jika ada
DROP POLICY IF EXISTS "riwayat_mbkm_all" ON public.riwayat_mbkm;
DROP POLICY IF EXISTS "Staff read riwayat_mbkm" ON public.riwayat_mbkm;
DROP POLICY IF EXISTS "Operator/Admin write riwayat_mbkm" ON public.riwayat_mbkm;

-- 4. Pasang policy baca (SELECT):
-- Mengizinkan seluruh pengguna terautentikasi (admin, operator, dosen) untuk membaca data
-- Menggunakan USING (true) TO authenticated untuk mencegah hambatan evaluasi get_current_role()
CREATE POLICY "Staff read riwayat_mbkm" ON public.riwayat_mbkm
  FOR SELECT TO authenticated
  USING (true);

-- 5. Pasang policy tulis (INSERT, UPDATE, DELETE):
-- Khusus untuk admin dan operator
CREATE POLICY "Operator/Admin write riwayat_mbkm" ON public.riwayat_mbkm
  FOR ALL TO authenticated
  USING (
    COALESCE(public.get_current_role(), '') IN ('admin', 'operator')
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'operator')
    )
  )
  WITH CHECK (
    COALESCE(public.get_current_role(), '') IN ('admin', 'operator')
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'operator')
    )
  );

-- 6. Verifikasi isi data langsung di hasil query SQL Editor
SELECT count(*) AS total_baris_riwayat_mbkm FROM public.riwayat_mbkm;
