-- ==============================================================================
-- GEO INFO — REMEDIASI KEAMANAN BERDASARKAN SUPABASE DATABASE LINTER (REVISI)
-- File: supabase/migrations/004_fix_linter_security.sql
-- ==============================================================================

-- 1. FIX SEARCH PATH PADA FUNGSI KEAMANAN (Mencegah search_path hijacking)
DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY['touch_updated_at', 'handle_new_user', 'get_current_role', 'is_admin', 'is_staff', 'get_my_role', 'current_nip']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = fn AND pronargs = 0) THEN
      EXECUTE format('ALTER FUNCTION public.%I() SET search_path = public, pg_temp;', fn);
    END IF;
  END LOOP;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'audit_log_insert') THEN
    ALTER FUNCTION public.audit_log_insert(text, text, text, jsonb) SET search_path = public, pg_temp;
  END IF;
END $$;

-- 2. BATASI HAK EKSEKUSI FUNGSI (Revoke Execution RPC endpoint)
-- Trigger internal auth TIDAK boleh dieksekusi publik maupun user login via RPC REST API
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Helper functions internal yang tidak dipakai oleh frontend via RPC dicabut dari authenticated
DO $$
DECLARE
  fn_name text;
BEGIN
  FOREACH fn_name IN ARRAY ARRAY['is_admin', 'is_staff', 'get_my_role', 'current_nip']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = fn_name AND pronargs = 0) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I() FROM PUBLIC, anon, authenticated;', fn_name);
    END IF;
  END LOOP;
END $$;

-- Fungsi yang WAJIB dieksekusi oleh authenticated (Intended / By Design):
-- 1) audit_log_insert: Dipanggil oleh frontend via supabase.rpc('audit_log_insert') saat aksi CRUD
REVOKE EXECUTE ON FUNCTION public.audit_log_insert(text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.audit_log_insert(text, text, text, jsonb) TO authenticated;

-- 2) get_current_role: Digunakan oleh ekspresi RLS di Postgres saat user login melakukan query
REVOKE EXECUTE ON FUNCTION public.get_current_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_role() TO authenticated;

-- 3. HAPUS POLICY LAMA OVERLY PERMISSIVE & PASANG POLICY AMAN PADA TRACER_STUDY
DROP POLICY IF EXISTS "anggota_prestasi_all" ON public.anggota_prestasi;
DROP POLICY IF EXISTS "dosen_all" ON public.dosen;
DROP POLICY IF EXISTS "mahasiswa_all" ON public.mahasiswa;
DROP POLICY IF EXISTS "prestasi_all" ON public.prestasi;
DROP POLICY IF EXISTS "riwayat_mbkm_all" ON public.riwayat_mbkm;
DROP POLICY IF EXISTS "Akses Admin Tracer" ON public.tracer_study;

-- Pasang policy berbasis peran standar pada tracer_study (mengatasi rls_enabled_no_policy)
DROP POLICY IF EXISTS "Staff read tracer_study" ON public.tracer_study;
CREATE POLICY "Staff read tracer_study" ON public.tracer_study
  FOR SELECT TO authenticated
  USING (public.get_current_role() IN ('admin', 'operator', 'dosen'));

DROP POLICY IF EXISTS "Operator/Admin write tracer_study" ON public.tracer_study;
CREATE POLICY "Operator/Admin write tracer_study" ON public.tracer_study
  FOR ALL TO authenticated
  USING (public.get_current_role() IN ('admin', 'operator'))
  WITH CHECK (public.get_current_role() IN ('admin', 'operator'));

-- 4. CATATAN TENTANG VIEW v_publik_rekap (ERROR: security_definer_view)
-- View public.v_publik_rekap secara intensional berjalan dengan hak pembuat (definer)
-- agar pengunjung publik/anonim dapat melihat total agregat statistik alumni/mahasiswa
-- tanpa diberi izin akses langsung ke tabel sumber yang berisi data personal (PII).
COMMENT ON VIEW public.v_publik_rekap IS 
'View agregat publik (bebas PII). Intensional berjalan sebagai definer untuk isolasi tabel sumber dari publik.';
