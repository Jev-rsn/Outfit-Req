-- ==============================================================================
-- OUTFIT REQ — SUPABASE DATABASE SCHEMA (ROBUST, CAST-SAFE & SEARCH-PATH SECURED)
-- Sesuai dengan spesifikasi PRD_Teknikal_EBD.md (Bagian 3: Data Model)
-- ==============================================================================

-- 1. Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Berikan izin dasar pada schema public
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- 2. Tipe Enum untuk Tier Pengguna & Kebutuhan Sistem
DO $$ BEGIN
    CREATE TYPE public.user_tier AS ENUM ('guest', 'free', 'premium');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.chat_role AS ENUM ('user', 'assistant');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.subscription_package AS ENUM ('mingguan', 'bulanan', 'tahunan');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.payment_channel AS ENUM ('bank', 'ewallet', 'qris');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.subscription_status AS ENUM ('pending', 'paid', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- TABEL: users (Profil Pengguna terhubung dengan auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    tier public.user_tier DEFAULT 'free',
    premium_expires_at TIMESTAMPTZ,
    tb NUMERIC,                    -- tinggi badan (cm)
    bb NUMERIC,                    -- berat badan (kg)
    ld NUMERIC,                    -- lingkar dada (cm)
    lp NUMERIC,                    -- lingkar pinggang (cm)
    shoulder_width NUMERIC,        -- lebar bahu (cm)
    body_data_consent_at TIMESTAMPTZ, -- bukti persetujuan eksplisit UU PDP
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TABEL: chat_quota (Kuota Pengguna Free: 10 pertanyaan / 3 hari)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.chat_quota (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    questions_remaining INT DEFAULT 10,
    quota_reset_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '3 days'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function & Trigger otomatis saat user baru mendaftar di Supabase Auth
-- Menggunakan SECURITY DEFINER dengan search_path eksplisit agar tidak crash di GoTrue
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    INSERT INTO public.users (id, email, name, tier)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        'free'::public.user_tier
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, public.users.name);

    INSERT INTO public.chat_quota (user_id, questions_remaining, quota_reset_at)
    VALUES (new.id, 10, NOW() + INTERVAL '3 days')
    ON CONFLICT (user_id) DO NOTHING;

    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        -- Catat pesan jika ada isu tanpa menggagalkan proses pendaftaran auth.users
        RAISE WARNING 'handle_new_user exception: %', SQLERRM;
        RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- TABEL: chat_rooms (Sesi Chat Rekomendasi Outfit)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'Konsultasi Outfit',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TABEL: chat_messages (Riwayat Pesan Chat)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    role public.chat_role NOT NULL,
    content TEXT NOT NULL,
    recommended_outfits JSONB,     -- menyimpan rekomendasi visual outfit
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TABEL: outfit_catalog (Katalog Rekomendasi Outfit)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.outfit_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_url TEXT NOT NULL,
    title TEXT,
    description TEXT,
    category TEXT NOT NULL,        -- ke-pantai, ke-mall, kasual, kerja, pesta, kondangan
    event_type TEXT,               -- khusus fitur premium: ngonser, pengajian, dll
    source_store TEXT DEFAULT 'tokopedia',
    product_link TEXT NOT NULL,
    affiliate_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TABEL: saved_photos (Wishlist & Foto Tersimpan User)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.saved_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    outfit_id UUID NOT NULL REFERENCES public.outfit_catalog(id) ON DELETE CASCADE,
    saved_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TABEL: premium_subscriptions (Langganan & Transaksi Premium)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.premium_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    package public.subscription_package NOT NULL,
    price INT NOT NULL,            -- 8000 (mingguan), 25000 (bulanan), 200000 (tahunan)
    payment_method public.payment_channel NOT NULL,
    payment_gateway_ref TEXT,
    status public.subscription_status DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    auto_renew BOOLEAN DEFAULT FALSE, -- selalu FALSE sesuai keputusan PRD
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_quota ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outfit_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_subscriptions ENABLE ROW LEVEL SECURITY;

-- 1. Policies users
DROP POLICY IF EXISTS "Users dapat membaca datanya sendiri" ON public.users;
CREATE POLICY "Users dapat membaca datanya sendiri"
    ON public.users FOR SELECT
    USING ((auth.uid())::text = id::text);

DROP POLICY IF EXISTS "Users dapat membuat datanya sendiri" ON public.users;
CREATE POLICY "Users dapat membuat datanya sendiri"
    ON public.users FOR INSERT
    WITH CHECK ((auth.uid())::text = id::text);

DROP POLICY IF EXISTS "Users dapat mengupdate datanya sendiri" ON public.users;
CREATE POLICY "Users dapat mengupdate datanya sendiri"
    ON public.users FOR UPDATE
    USING ((auth.uid())::text = id::text);

-- 2. Policies chat_quota
DROP POLICY IF EXISTS "Users dapat melihat kuota sendiri" ON public.chat_quota;
CREATE POLICY "Users dapat melihat kuota sendiri"
    ON public.chat_quota FOR SELECT
    USING ((auth.uid())::text = user_id::text);

DROP POLICY IF EXISTS "Users dapat membuat kuota sendiri" ON public.chat_quota;
CREATE POLICY "Users dapat membuat kuota sendiri"
    ON public.chat_quota FOR INSERT
    WITH CHECK ((auth.uid())::text = user_id::text);

-- 3. Policies chat_rooms
DROP POLICY IF EXISTS "Users dapat mengelola room chat sendiri" ON public.chat_rooms;
CREATE POLICY "Users dapat mengelola room chat sendiri"
    ON public.chat_rooms FOR ALL
    USING ((auth.uid())::text = user_id::text);

-- 4. Policies chat_messages
DROP POLICY IF EXISTS "Users dapat membaca dan mengirim pesan di roomnya" ON public.chat_messages;
CREATE POLICY "Users dapat membaca dan mengirim pesan di roomnya"
    ON public.chat_messages FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_rooms
            WHERE chat_rooms.id = chat_messages.room_id
            AND (chat_rooms.user_id)::text = (auth.uid())::text
        )
    );

-- 5. Policies outfit_catalog (Publik bisa membaca)
DROP POLICY IF EXISTS "Katalog outfit dapat dibaca publik" ON public.outfit_catalog;
CREATE POLICY "Katalog outfit dapat dibaca publik"
    ON public.outfit_catalog FOR SELECT
    USING (true);

-- 6. Policies saved_photos
DROP POLICY IF EXISTS "Users dapat mengelola wishlist foto sendiri" ON public.saved_photos;
CREATE POLICY "Users dapat mengelola wishlist foto sendiri"
    ON public.saved_photos FOR ALL
    USING ((auth.uid())::text = user_id::text);

-- 7. Policies premium_subscriptions
DROP POLICY IF EXISTS "Users dapat melihat histori langganannya" ON public.premium_subscriptions;
CREATE POLICY "Users dapat melihat histori langganannya"
    ON public.premium_subscriptions FOR SELECT
    USING ((auth.uid())::text = user_id::text);

-- Grant privileges kepada authenticated dan service_role
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;
