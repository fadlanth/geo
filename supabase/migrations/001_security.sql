-- ================================================================
-- 001_security.sql - SCHEMA KEAMANAN, PROFILES, AUDIT LOG, VIEW PUBLIK, & RLS
-- ================================================================

-- 1. TABEL PROFILES & TRIGGER PENGGUNA BARU
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'guest' CHECK (role IN ('admin', 'operator', 'dosen', 'guest')),
  nama TEXT,
  nip TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, nama)
  VALUES (
    NEW.id,
    NEW.email,
    'guest',
    COALESCE(NEW.raw_user_meta_data->>'nama', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. TABEL AUDIT LOG & STORED PROCEDURE INSERT
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_email TEXT NOT NULL,
  entitas TEXT NOT NULL,
  aksi TEXT NOT NULL,
  entitas_id TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE OR REPLACE FUNCTION public.audit_log_insert(
  p_entitas TEXT,
  p_aksi TEXT,
  p_entitas_id TEXT,
  p_payload JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.audit_log (actor_email, entitas, aksi, entitas_id, payload)
  VALUES (
    COALESCE(auth.jwt() ->> 'email', 'system'),
    p_entitas,
    p_aksi,
    p_entitas_id,
    p_payload
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. VIEW AGREGAT PUBLIK (Hanya angka statistik agregat tanpa PII)
DROP VIEW IF EXISTS public.v_publik_rekap CASCADE;

CREATE VIEW public.v_publik_rekap AS
SELECT
  (SELECT count(*) FROM public.mahasiswa WHERE status = 'Regulasi Akademik') AS total_mahasiswa,
  (SELECT count(*) FROM public.dosen) AS total_dosen,
  (SELECT count(*) FROM public.prestasi) AS total_prestasi,
  (SELECT count(*) FROM public.riwayat_mbkm) AS total_mbkm,
  (SELECT count(*) FROM public.tracer_study) AS total_alumni;

GRANT SELECT ON public.v_publik_rekap TO anon, authenticated;

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.mahasiswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dosen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prestasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anggota_prestasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riwayat_mbkm ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracer_study ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Policies: Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR public.get_current_role() = 'admin');

DROP POLICY IF EXISTS "Admin can manage profiles" ON public.profiles;
CREATE POLICY "Admin can manage profiles" ON public.profiles
  FOR ALL TO authenticated USING (public.get_current_role() = 'admin');

-- Policies: Mahasiswa, Dosen, Prestasi, MBKM, Tracer Study
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['mahasiswa', 'dosen', 'prestasi', 'anggota_prestasi', 'riwayat_mbkm', 'tracer_study']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Staff read %1$I" ON public.%1$I;', tbl);
    EXECUTE format('
      CREATE POLICY "Staff read %1$I" ON public.%1$I
        FOR SELECT TO authenticated
        USING (public.get_current_role() IN (''admin'', ''operator'', ''dosen''));
    ', tbl);

    EXECUTE format('DROP POLICY IF EXISTS "Operator/Admin write %1$I" ON public.%1$I;', tbl);
    EXECUTE format('
      CREATE POLICY "Operator/Admin write %1$I" ON public.%1$I
        FOR ALL TO authenticated
        USING (public.get_current_role() IN (''admin'', ''operator''))
        WITH CHECK (public.get_current_role() IN (''admin'', ''operator''));
    ', tbl);
  END LOOP;
END $$;

-- Policies: Audit Log (Hanya Admin)
DROP POLICY IF EXISTS "Admin view audit log" ON public.audit_log;
CREATE POLICY "Admin view audit log" ON public.audit_log
  FOR SELECT TO authenticated USING (public.get_current_role() = 'admin');
