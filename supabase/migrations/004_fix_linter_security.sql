-- ==============================================================================
-- GEO INFO — REMEDIASI KEAMANAN BERDASARKAN SUPABASE DATABASE LINTER
-- File: supabase/migrations/004_fix_linter_security.sql
-- ==============================================================================

-- 1. FIX SEARCH PATH PADA FUNGSI KEAMANAN (Mencegah search_path hijacking)
DO $$
BEGIN
  -- Trigger & Helper Functions
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'touch_updated_at') THEN
    ALTER FUNCTION public.touch_updated_at() SET search_path = public, pg_temp;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') THEN
    ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'audit_log_insert') THEN
    ALTER FUNCTION public.audit_log_insert(text, text, text, jsonb) SET search_path = public, pg_temp;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_current_role') THEN
    ALTER FUNCTION public.get_current_role() SET search_path = public, pg_temp;
  END IF;
END $$;

-- 2. BATASI HAK EKSEKUSI FUNGSI (Revoke Execution dari role anon / PUBLIC)
-- Trigger internal auth tidak boleh dieksekusi publik lewat REST API RPC
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;

-- Audit log hanya boleh dieksekusi oleh authenticated (untuk pencatatan aksi CRUD)
REVOKE EXECUTE ON FUNCTION public.audit_log_insert(text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.audit_log_insert(text, text, text, jsonb) TO authenticated;

-- Helper role checks & auth functions (hanya boleh dieksekusi oleh authenticated jika ada)
DO $$
DECLARE
  fn_name text;
BEGIN
  FOREACH fn_name IN ARRAY ARRAY['get_current_role', 'is_admin', 'is_staff', 'get_my_role', 'current_nip']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = fn_name) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I() FROM PUBLIC, anon;', fn_name);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I() TO authenticated;', fn_name);
    END IF;
  END LOOP;
END $$;

-- 3. HAPUS POLICY LAMA YANG BERSIFAT OVERLY PERMISSIVE (USING true / WITH CHECK true)
-- Menghilangkan celah bypass RLS yang memungkinkan authenticated user melakukan CRUD tanpa cek role
DROP POLICY IF EXISTS "anggota_prestasi_all" ON public.anggota_prestasi;
DROP POLICY IF EXISTS "dosen_all" ON public.dosen;
DROP POLICY IF EXISTS "mahasiswa_all" ON public.mahasiswa;
DROP POLICY IF EXISTS "prestasi_all" ON public.prestasi;
DROP POLICY IF EXISTS "riwayat_mbkm_all" ON public.riwayat_mbkm;
DROP POLICY IF EXISTS "Akses Admin Tracer" ON public.tracer_study;

-- 4. CATATAN TENTANG VIEW v_publik_rekap (ERROR: security_definer_view)
-- View public.v_publik_rekap secara intensional berjalan dengan hak pembuat (definer)
-- agar pengunjung publik/anonim dapat melihat total agregat statistik alumni/mahasiswa
-- tanpa diberi izin akses langsung ke tabel sumber yang berisi data personal (PII).
COMMENT ON VIEW public.v_publik_rekap IS 
'View agregat publik (bebas PII). Intensional berjalan sebagai definer untuk isolasi tabel sumber dari publik.';
