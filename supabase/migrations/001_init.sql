-- ============================================
-- StoryNest Database Setup
-- Jalankan di Supabase SQL Editor
-- ============================================

-- 1. Tabel profiles (extend dari auth.users Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile saat user baru register
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Tabel books
CREATE TABLE IF NOT EXISTS public.books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 0,       -- dalam IDR (rupiah)
  age_min INTEGER NOT NULL DEFAULT 0,
  age_max INTEGER NOT NULL DEFAULT 18,
  pdf_filename TEXT NOT NULL,             -- filename di Supabase Storage bucket
  cover_filename TEXT NOT NULL,           -- filename di Supabase Storage bucket
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS Policies
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Buku yang sudah published bisa dibaca siapa saja
CREATE POLICY "Public can read published books"
  ON public.books FOR SELECT
  USING (is_published = TRUE);

-- Hanya service role (backend kita) yang bisa melakukan semua operasi
-- Backend menggunakan SUPABASE_SERVICE_ROLE_KEY jadi bypass RLS otomatis

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User hanya bisa baca profil sendiri
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- 4. Storage Buckets (jalankan lewat Supabase Dashboard atau API)
-- Buat dua bucket:
--   - books-pdf   (private)
--   - books-cover (public)
-- 
-- Atau via SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('books-pdf', 'books-pdf', FALSE),
  ('books-cover', 'books-cover', TRUE)
ON CONFLICT (id) DO NOTHING;
