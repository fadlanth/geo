-- ==============================================================================
-- GEO INFO — SYNC AUTH USERS KE PROFILES & SET ROLE ADMIN
-- File: supabase/migrations/005_sync_admin_profile.sql
-- ==============================================================================

-- 1. Pastikan tabel public.profiles memiliki struktur yang benar
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'guest' CHECK (role IN ('admin', 'operator', 'dosen', 'guest')),
  nama TEXT,
  nip TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 2. INSERT atau UPDATE seluruh akun dari auth.users ke public.profiles sebagai 'admin'
-- Ini mengatasi masalah akun yang dibuat sebelum trigger ada (sehingga tabel profiles kosong)
INSERT INTO public.profiles (id, email, role, nama)
SELECT 
  id, 
  email, 
  'admin', 
  COALESCE(raw_user_meta_data->>'nama', split_part(email, '@', 1))
FROM auth.users
ON CONFLICT (id) DO UPDATE 
SET role = 'admin';

-- 3. Pastikan RLS pada profiles mengizinkan user yang login membaca profilnya sendiri
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated 
  USING (id = auth.uid() OR public.get_current_role() = 'admin');

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated 
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Admin can manage profiles" ON public.profiles;
CREATE POLICY "Admin can manage profiles" ON public.profiles
  FOR ALL TO authenticated 
  USING (public.get_current_role() = 'admin');
