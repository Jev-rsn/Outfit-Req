-- ==============================================================================
-- OUTFIT REQ — FULL ADMIN DATABASE SETUP & RLS UNBLOCKER (SUPABASE)
-- Menghubungkan seluruh fitur Admin Console langsung ke Database Supabase:
-- 1. public.outfit_catalog (Katalog busana Pinterest, 3D Studio, Shopee, Uniqlo)
-- 2. public.users (Data akun pengguna asli)
-- 3. public.chat_quota (Sisa kuota AI chat)
-- 4. public.premium_subscriptions (Data riwayat transaksi langganan asli)
-- ==============================================================================

-- 1. AKTIFKAN EXTENSION CRYPTO
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Berikan izin schema public
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- 2. TABEL: public.outfit_catalog
CREATE TABLE IF NOT EXISTS public.outfit_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id TEXT,
    title TEXT,
    photo_url TEXT NOT NULL,
    category TEXT NOT NULL,
    event_type TEXT,
    source_store TEXT DEFAULT 'Pinterest',
    product_link TEXT NOT NULL,
    description TEXT,
    price_total NUMERIC DEFAULT 0,
    price_display TEXT,
    rating NUMERIC DEFAULT 4.8,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pastikan kolom item_id memiliki indeks unik untuk kemudahan upsert
DELETE FROM public.outfit_catalog
WHERE ctid IN (
    SELECT ctid
    FROM (
        SELECT ctid, ROW_NUMBER() OVER (
            PARTITION BY item_id
            ORDER BY ctid DESC
        ) as rnum
        FROM public.outfit_catalog
        WHERE item_id IS NOT NULL
    ) t
    WHERE t.rnum > 1
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_outfit_catalog_item_id ON public.outfit_catalog (item_id);

-- RLS outfit_catalog (Buka akses penuh untuk Admin & Publik)
ALTER TABLE public.outfit_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Katalog outfit dapat dibaca publik" ON public.outfit_catalog;
DROP POLICY IF EXISTS "Katalog outfit dapat dikelola" ON public.outfit_catalog;
DROP POLICY IF EXISTS "Admin full access outfit_catalog" ON public.outfit_catalog;

CREATE POLICY "Admin full access outfit_catalog"
    ON public.outfit_catalog FOR ALL
    USING (true)
    WITH CHECK (true);

-- 3. TABEL: public.users
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    name TEXT,
    tier TEXT DEFAULT 'free',
    premium_expires_at TIMESTAMPTZ,
    tb NUMERIC,
    bb NUMERIC,
    ld NUMERIC,
    lp NUMERIC,
    shoulder_width NUMERIC,
    body_data_consent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pastikan email unik
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON public.users (email);

-- RLS users (Buka akses penuh untuk Admin)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users dapat membaca datanya sendiri" ON public.users;
DROP POLICY IF EXISTS "Users dapat membuat datanya sendiri" ON public.users;
DROP POLICY IF EXISTS "Users dapat mengupdate datanya sendiri" ON public.users;
DROP POLICY IF EXISTS "Public access users" ON public.users;
DROP POLICY IF EXISTS "Admin full access users" ON public.users;

CREATE POLICY "Admin full access users"
    ON public.users FOR ALL
    USING (true)
    WITH CHECK (true);

-- 4. TABEL: public.chat_quota
CREATE TABLE IF NOT EXISTS public.chat_quota (
    user_id UUID PRIMARY KEY,
    user_email TEXT,
    questions_remaining INT DEFAULT 10,
    quota_reset_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '3 days'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chat_quota ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users dapat melihat kuota sendiri" ON public.chat_quota;
DROP POLICY IF EXISTS "Admin full access chat_quota" ON public.chat_quota;

CREATE POLICY "Admin full access chat_quota"
    ON public.chat_quota FOR ALL
    USING (true)
    WITH CHECK (true);

-- 5. TABEL: public.premium_subscriptions
CREATE TABLE IF NOT EXISTS public.premium_subscriptions (
    id TEXT PRIMARY KEY DEFAULT ('SUB-' || floor(random() * 90000 + 10000)::text),
    user_id UUID,
    user_email TEXT NOT NULL,
    user_name TEXT,
    user_tier TEXT DEFAULT 'premium',
    package TEXT NOT NULL DEFAULT 'bulanan',
    price INT NOT NULL DEFAULT 25000,
    payment_method TEXT NOT NULL DEFAULT 'qris',
    payment_gateway_ref TEXT,
    status TEXT DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    auto_renew BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_premium_subscriptions_user_email ON public.premium_subscriptions(user_email);
CREATE INDEX IF NOT EXISTS idx_premium_subscriptions_status ON public.premium_subscriptions(status);

ALTER TABLE public.premium_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users dapat melihat histori langganannya" ON public.premium_subscriptions;
DROP POLICY IF EXISTS "Public access premium_subscriptions" ON public.premium_subscriptions;
DROP POLICY IF EXISTS "Admin full access premium_subscriptions" ON public.premium_subscriptions;

CREATE POLICY "Admin full access premium_subscriptions"
    ON public.premium_subscriptions FOR ALL
    USING (true)
    WITH CHECK (true);

-- 6. GRANT ALL PERMISSIONS
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Selesai! Seluruh tabel kini dapat dibaca dan dikelola secara langsung oleh Admin Console Orec.
