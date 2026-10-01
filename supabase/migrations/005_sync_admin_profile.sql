-- ==============================================================================
-- GEO INFO — FIX REKURSI RLS PROFILES, SYNC AUTH USERS & SET ROLE ADMIN
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
INSERT INTO public.profiles (id, email, role, nama)
SELECT 
  id, 
  email, 
  'admin', 
  COALESCE(raw_user_meta_data->>'nama', split_part(email, '@', 1))
FROM auth.users
ON CONFLICT (id) DO UPDATE 
SET role = 'admin';

-- 3. PERBAIKI POLICY RLS PROFILES (Mencegah Infinite Recursion)
-- PENTING: Policy SELECT pada profiles DILARANG memanggil get_current_role()
-- karena get_current_role() membaca profiles, yang menyebabkan infinite recursion di Postgres!
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow user update own profile" ON public.profiles;

-- Izin baca bebas rekursi untuk seluruh user login
CREATE POLICY "Allow authenticated read profiles" ON public.profiles
  FOR SELECT TO authenticated 
  USING (true);

-- Izin update profil milik sendiri
CREATE POLICY "Allow user update own profile" ON public.profiles
  FOR UPDATE TO authenticated 
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Izin insert profil milik sendiri jika belum ada
CREATE POLICY "Allow user insert own profile" ON public.profiles
  FOR INSERT TO authenticated 
  WITH CHECK (id = auth.uid());
