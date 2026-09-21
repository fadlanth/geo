-- ==============================================================================
-- GEO INFO — SECURE AGGREGATE VIEW FOR TRACER STUDY (PUBLIC / ANON ACCESS)
-- File: supabase/migrations/002_v_publik_rekap_tracer.sql
-- ==============================================================================

-- 1. Hapus view lama jika ada
DROP VIEW IF EXISTS public.v_publik_rekap CASCADE;

-- 2. Buat view agregasi tanpa membocorkan PII (Personal Identifiable Information)
CREATE OR REPLACE VIEW public.v_publik_rekap AS
SELECT
  tahun_lulus,
  COUNT(*)::INTEGER AS total_lulusan,
  COUNT(*) FILTER (WHERE status_lulusan = 'Bekerja')::INTEGER AS total_bekerja,
  COUNT(*) FILTER (WHERE status_lulusan = 'Studi Lanjut')::INTEGER AS total_studi_lanjut,
  COUNT(*) FILTER (WHERE status_lulusan = 'Wiraswasta')::INTEGER AS total_wiraswasta,
  COUNT(*) FILTER (WHERE status_lulusan = 'Belum Bekerja')::INTEGER AS total_belum_bekerja
FROM public.tracer_study
WHERE tahun_lulus IS NOT NULL
GROUP BY tahun_lulus
ORDER BY tahun_lulus ASC;

-- 3. Beri komentar deskripsi
COMMENT ON VIEW public.v_publik_rekap IS 
'View agregat statistik tracer study alumni per tahun kelulusan tanpa data pribadi (bebas PII).';

-- 4. Cabut hak akses publik umum, lalu berikan hak SELECT eksplisit untuk anon & authenticated
REVOKE ALL ON public.v_publik_rekap FROM PUBLIC;
GRANT SELECT ON public.v_publik_rekap TO anon, authenticated;
