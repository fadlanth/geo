-- ==============================================================================
-- GEO INFO — KEBIJAKAN PENYIMPANAN LOG AUDIT (RETENTION POLICY)
-- File: supabase/migrations/007_audit_log_retention.sql
-- ==============================================================================

-- Fungsi ini dapat dipanggil secara manual atau dikaitkan dengan pg_cron (jika aktif)
-- untuk membersihkan log audit (beserta payload JSONB) yang berumur lebih dari 3 tahun,
-- sehingga ukuran database (storage limit) tidak membengkak tanpa kendali.

CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS VOID AS $$
BEGIN
  -- Hapus log yang usianya lebih dari 3 tahun
  DELETE FROM public.audit_log
  WHERE created_at < (now() - interval '3 years');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Cabut akses dari publik/anon dan batasi eksekusinya khusus untuk authenticated
-- (Lebih ideal lagi jika difilter menggunakan role admin di dalam aplikasi jika dipanggil via RPC)
REVOKE EXECUTE ON FUNCTION public.cleanup_old_audit_logs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cleanup_old_audit_logs() TO authenticated;
