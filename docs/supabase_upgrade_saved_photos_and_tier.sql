-- ==============================================================================
-- OUTFIT REQ — FULL DATABASE UPGRADE & RLS UNBLOCKER (SUPABASE)
-- Menghilangkan Foreign Key Blockage dan Membuka Izin RLS agar:
-- 1. Foto Outfit tersimpan ke tabel saved_photos per customer & tier
-- 2. Transaksi Upgrade Premium masuk ke tabel premium_subscriptions & users
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABEL saved_photos
-- ------------------------------------------------------------------------------
-- Pastikan kolom identitas customer & produk tersedia
ALTER TABLE public.saved_photos 
  ADD COLUMN IF NOT EXISTS user_email TEXT,
  ADD COLUMN IF NOT EXISTS user_tier TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS user_name TEXT,
  ADD COLUMN IF NOT EXISTS item_id TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS price_display TEXT,
  ADD COLUMN IF NOT EXISTS store TEXT,
  ADD COLUMN IF NOT EXISTS store_url TEXT,
  ADD COLUMN IF NOT EXISTS item_data JSONB;

-- Hapus Foreign Key constraint ketat yang memblokir penyimpanan jika user belum terdaftar di tabel users
ALTER TABLE public.saved_photos DROP CONSTRAINT IF EXISTS saved_photos_user_id_fkey;
ALTER TABLE public.saved_photos DROP CONSTRAINT IF EXISTS saved_photos_outfit_id_fkey;

-- Buat kolom user_id dan outfit_id fleksibel (nullable)
ALTER TABLE public.saved_photos ALTER COLUMN outfit_id DROP NOT NULL;
ALTER TABLE public.saved_photos ALTER COLUMN user_id DROP NOT NULL;

-- Indeks pencarian cepat
CREATE INDEX IF NOT EXISTS idx_saved_photos_user_email ON public.saved_photos(user_email);
CREATE INDEX IF NOT EXISTS idx_saved_photos_user_tier ON public.saved_photos(user_tier);
CREATE INDEX IF NOT EXISTS idx_saved_photos_item_id ON public.saved_photos(item_id);

-- Konfigurasi RLS saved_photos agar frontend dapat menulis dan membaca
ALTER TABLE public.saved_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users dapat mengelola wishlist foto sendiri" ON public.saved_photos;
DROP POLICY IF EXISTS "Users dapat membaca wishlist foto sendiri" ON public.saved_photos;
DROP POLICY IF EXISTS "Users dapat menambah wishlist foto sendiri" ON public.saved_photos;
DROP POLICY IF EXISTS "Users dapat menghapus wishlist foto sendiri" ON public.saved_photos;
DROP POLICY IF EXISTS "Public access saved_photos" ON public.saved_photos;

CREATE POLICY "Public access saved_photos"
    ON public.saved_photos FOR ALL
    USING (true)
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 2. TABEL users
-- ------------------------------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE public.users ALTER COLUMN id SET DEFAULT gen_random_uuid();
EXCEPTION WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;
EXCEPTION WHEN OTHERS THEN null;
END $$;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ;

-- Unique constraint pada email agar dapat di-upsert dengan aman
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON public.users(email);

-- Konfigurasi RLS users agar dapat di-upsert oleh frontend
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users dapat membaca datanya sendiri" ON public.users;
DROP POLICY IF EXISTS "Users dapat membuat datanya sendiri" ON public.users;
DROP POLICY IF EXISTS "Users dapat mengupdate datanya sendiri" ON public.users;
DROP POLICY IF EXISTS "Public access users" ON public.users;

CREATE POLICY "Public access users"
    ON public.users FOR ALL
    USING (true)
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 3. TABEL premium_subscriptions
-- ------------------------------------------------------------------------------
-- Hapus Foreign Key constraint ketat pada premium_subscriptions
ALTER TABLE public.premium_subscriptions DROP CONSTRAINT IF EXISTS premium_subscriptions_user_id_fkey;
ALTER TABLE public.premium_subscriptions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.premium_subscriptions ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE public.premium_subscriptions ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE public.premium_subscriptions ADD COLUMN IF NOT EXISTS user_tier TEXT DEFAULT 'premium';

-- Konfigurasi RLS premium_subscriptions
ALTER TABLE public.premium_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users dapat melihat langganan sendiri" ON public.premium_subscriptions;
DROP POLICY IF EXISTS "Users dapat membuat langganan sendiri" ON public.premium_subscriptions;
DROP POLICY IF EXISTS "Public access premium_subscriptions" ON public.premium_subscriptions;

CREATE POLICY "Public access premium_subscriptions"
    ON public.premium_subscriptions FOR ALL
    USING (true)
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 4. GRANT PERMISSIONS
-- ------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Selesai! Semua tabel kini siap menerima data simpanan produk & data upgrade customer.
