-- ==============================================================================
-- MIGRASI SKEMA FITUR "GUNAKAN" (Visualisasi Body 3D)
-- Turunan dari PRD bagian 10 "Perubahan Data". Jalankan SETELAH
-- supabase_outfit_catalog_seed.sql (membutuhkan tabel public.outfit_catalog
-- dan kolom item_id yang sudah ada).
--
-- Urutan jalan di Supabase Dashboard -> SQL Editor:
--   1. supabase_outfit_catalog_seed.sql      (sudah ada / sudah dijalankan)
--   2. supabase_gunakan_schema_migration.sql (file ini)
--   3. update_garment_type_215_produk.sql    (klasifikasi garment_type awal)
--
-- Migrasi ini idempotent (aman dijalankan ulang): pakai IF NOT EXISTS dan
-- DROP POLICY IF EXISTS ... CREATE POLICY, mengikuti pola file seed yang ada.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- untuk gen_random_uuid()

-- ------------------------------------------------------------------------------
-- 1. Kolom tambahan pada produk (PRD §10 "Kolom tambahan di produk")
-- ------------------------------------------------------------------------------
ALTER TABLE public.outfit_catalog
  ADD COLUMN IF NOT EXISTS garment_type TEXT,     -- 'kaos' | 'kemeja' | 'jaket' | 'celana' | 'rok'
                                                    -- NULL = kategori belum/tidak didukung (GN-14)
  ADD COLUMN IF NOT EXISTS template_id  TEXT,     -- FK longgar ke garment_templates.template_id
  ADD COLUMN IF NOT EXISTS fit_type     TEXT,     -- 'slim' | 'regular' | 'oversize'
  ADD COLUMN IF NOT EXISTS size_chart   JSONB,    -- mis. {"S":92,"M":98,"L":104,...} lingkar (cm)
  ADD COLUMN IF NOT EXISTS fabric_type  TEXT;

DO $$ BEGIN
  ALTER TABLE public.outfit_catalog
    ADD CONSTRAINT outfit_catalog_garment_type_check
    CHECK (garment_type IS NULL OR garment_type IN ('kaos','kemeja','jaket','celana','rok'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.outfit_catalog
    ADD CONSTRAINT outfit_catalog_fit_type_check
    CHECK (fit_type IS NULL OR fit_type IN ('slim','regular','oversize'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_outfit_catalog_garment_type
  ON public.outfit_catalog (garment_type) WHERE garment_type IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 1.5 PENTING: product_assets di bawah mereferensikan outfit_catalog(item_id)
--     sebagai foreign key, dan Postgres mewajibkan kolom yang direferensikan
--     punya constraint UNIQUE/PK. Ditemukan dari data produksi nyata bahwa
--     outfit_catalog bisa punya item_id GANDA (produk yang sama ter-scrape
--     ulang tanpa DELETE penuh sebelumnya -- lihat supabase_outfit_catalog_seed.sql
--     yang melakukan DELETE FROM sebelum INSERT, tapi proses scraping rutin
--     setelahnya belum tentu melakukan hal yang sama). Blok ini membersihkan
--     duplikat tsb SEBELUM menambahkan constraint UNIQUE, supaya migrasi ini
--     tidak gagal seperti semula (`ERROR: there is no unique constraint
--     matching given keys for referenced table "outfit_catalog"`).
--
--     Baris yang disimpan per item_id kembar: diprioritaskan yang judulnya
--     TIDAK mengandung artefak mojibake 'Ã' (indikasi encoding UTF-8 ganda),
--     lalu yang created_at-nya PALING BARU. Baris lain DIHAPUS PERMANEN.
--     Jalankan SELECT percobaan di bawah dulu kalau ingin meninjau sebelum
--     menghapus (ganti DELETE jadi SELECT * FROM ranked WHERE rn>1).
-- ------------------------------------------------------------------------------
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY item_id
           ORDER BY (title !~ 'Ã') DESC NULLS LAST, created_at DESC NULLS LAST, id
         ) AS rn
  FROM public.outfit_catalog
  WHERE item_id IS NOT NULL
)
DELETE FROM public.outfit_catalog oc
USING ranked
WHERE oc.id = ranked.id AND ranked.rn > 1;

DO $$ BEGIN
  ALTER TABLE public.outfit_catalog
    ADD CONSTRAINT outfit_catalog_item_id_key UNIQUE (item_id);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- ------------------------------------------------------------------------------
-- 2. garment_templates: satu baris per template mesh pakaian (.glb)
--    (lih. generate_mannequin_glb.py -- template_id di sini HARUS sama dengan
--    nama file .glb yang dihasilkan script tsb, mis. 'tshirt_v1' -> tshirt.glb)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.garment_templates (
  template_id   TEXT PRIMARY KEY,
  category      TEXT NOT NULL CHECK (category IN ('kaos','kemeja','jaket','celana','rok')),
  glb_url       TEXT,                 -- lokasi file .glb (storage bucket)
  uv_layout     JSONB,                -- deskripsi tata letak UV (band/zona) untuk pipeline tekstur
  morph_targets TEXT[] NOT NULL DEFAULT '{}',  -- harus sinkron dgn mannequin.glb, mis. {chest,waist,hip,shoulder,size}
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.garment_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Template pakaian dapat dibaca publik" ON public.garment_templates;
CREATE POLICY "Template pakaian dapat dibaca publik" ON public.garment_templates
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Template pakaian dikelola admin" ON public.garment_templates;
CREATE POLICY "Template pakaian dikelola admin" ON public.garment_templates
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

INSERT INTO public.garment_templates (template_id, category, morph_targets) VALUES
  ('tshirt_v1', 'kaos',   ARRAY['chest','waist','hip','shoulder','size']),
  ('pants_v1',  'celana', ARRAY['chest','waist','hip','shoulder','size'])
ON CONFLICT (template_id) DO NOTHING;
-- kemeja/jaket/rok sementara memakai template di atas (lih. generate_mannequin_glb.py);
-- tambahkan baris baru di sini saat template khusus kategori tsb sudah dibuat.

-- ------------------------------------------------------------------------------
-- 3. product_assets: hasil pipeline foto->tekstur per produk (PRD §9.3 & §10)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_assets (
  asset_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id            TEXT NOT NULL REFERENCES public.outfit_catalog(item_id) ON DELETE CASCADE,
  view               TEXT NOT NULL DEFAULT 'front' CHECK (view IN ('front','back','detail')),
  original_url       TEXT NOT NULL,   -- salinan foto katalog asli, tidak pernah ditimpa
  cutout_url         TEXT,            -- PNG transparan hasil hapus background
  texture_url        TEXT,            -- WebP siap pakai viewer (<=500KB, NFR §11)
  normal_map_url     TEXT,
  template_id        TEXT REFERENCES public.garment_templates(template_id),
  processing_status  TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending','done','failed')),
  needs_review       BOOLEAN NOT NULL DEFAULT false,   -- GN-09
  quality_score      NUMERIC,
  quality_breakdown  JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (item_id, view)
);

CREATE INDEX IF NOT EXISTS idx_product_assets_item_id ON public.product_assets (item_id);
CREATE INDEX IF NOT EXISTS idx_product_assets_needs_review ON public.product_assets (needs_review) WHERE needs_review = true;

ALTER TABLE public.product_assets ENABLE ROW LEVEL SECURITY;

-- Publik hanya boleh melihat aset yang SUDAH lolos tinjauan kualitas --
-- ini yang membuat kriteria penerimaan PRD §17 ("produk skor rendah tidak
-- tampil di viewer sampai lolos tinjauan") berlaku otomatis di level DB,
-- bukan cuma di kode frontend.
DROP POLICY IF EXISTS "Aset produk siap pakai dapat dibaca publik" ON public.product_assets;
CREATE POLICY "Aset produk siap pakai dapat dibaca publik" ON public.product_assets
  FOR SELECT USING (processing_status = 'done' AND needs_review = false);

DROP POLICY IF EXISTS "Aset produk dikelola service role" ON public.product_assets;
CREATE POLICY "Aset produk dikelola service role" ON public.product_assets
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Admin (kalau ada klaim role 'admin' di JWT) perlu melihat SEMUA baris,
-- termasuk needs_review=true, untuk antarmuka tinjauan manual (GN-09).
DROP POLICY IF EXISTS "Admin dapat membaca semua aset untuk tinjauan" ON public.product_assets;
CREATE POLICY "Admin dapat membaca semua aset untuk tinjauan" ON public.product_assets
  FOR SELECT USING (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin');

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_product_assets_updated_at ON public.product_assets;
CREATE TRIGGER trg_product_assets_updated_at BEFORE UPDATE ON public.product_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 4. body_profiles: data tubuh pengguna (PRIBADI & SENSITIF -- PRD §10/§11)
--    Catatan: Supabase mengenkripsi seluruh data at-rest di tingkat
--    infrastruktur secara bawaan. Baris di bawah menambahkan isolasi akses
--    PER PENGGUNA lewat RLS (syarat "data tubuh dienkripsi" + privasi di
--    PRD terpenuhi lewat kombinasi keduanya). Jika perlu enkripsi kolom
--    tambahan di level aplikasi, pertimbangkan Supabase Vault/pgsodium --
--    sengaja tidak diterapkan di sini agar slider di viewer tetap bisa
--    langsung baca angka tanpa proses dekripsi ekstra di setiap request.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.body_profiles (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  height_cm      NUMERIC NOT NULL CHECK (height_cm BETWEEN 100 AND 230),   -- GN-10: batas rentang
  weight_kg      NUMERIC NOT NULL CHECK (weight_kg BETWEEN 25 AND 250),
  chest_cm       NUMERIC CHECK (chest_cm BETWEEN 60 AND 170),              -- opsional (GN-03)
  waist_cm       NUMERIC CHECK (waist_cm BETWEEN 50 AND 170),
  shoulder_cm    NUMERIC CHECK (shoulder_cm BETWEEN 30 AND 70),
  consent_given  BOOLEAN NOT NULL DEFAULT false,   -- persetujuan eksplisit UU PDP
  consent_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.body_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pengguna hanya mengakses data tubuhnya sendiri" ON public.body_profiles;
CREATE POLICY "Pengguna hanya mengakses data tubuhnya sendiri" ON public.body_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_body_profiles_updated_at ON public.body_profiles;
CREATE TRIGGER trg_body_profiles_updated_at BEFORE UPDATE ON public.body_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- GN-12: pengguna dapat menghapus data tubuh kapan saja -- cukup
-- `DELETE FROM body_profiles WHERE user_id = auth.uid()`, diizinkan oleh
-- policy FOR ALL di atas.

-- ------------------------------------------------------------------------------
-- 5. mannequin_presets: preset demo/pratinjau (dipakai mis. untuk pratinjau
--    terkunci akun Free, GN-13 -- tidak berisi data pengguna sungguhan)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mannequin_presets (
  preset_id      TEXT PRIMARY KEY,
  label          TEXT NOT NULL,
  height_cm      NUMERIC NOT NULL,
  weight_kg      NUMERIC NOT NULL,
  chest_cm       NUMERIC,
  waist_cm       NUMERIC,
  shoulder_cm    NUMERIC
);

ALTER TABLE public.mannequin_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Preset manekin dapat dibaca publik" ON public.mannequin_presets;
CREATE POLICY "Preset manekin dapat dibaca publik" ON public.mannequin_presets
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Preset manekin dikelola service role" ON public.mannequin_presets;
CREATE POLICY "Preset manekin dikelola service role" ON public.mannequin_presets
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

INSERT INTO public.mannequin_presets (preset_id, label, height_cm, weight_kg, chest_cm, waist_cm, shoulder_cm) VALUES
  ('demo_rata_rata', 'Rata-rata (pratinjau Free)', 170, 65, 92, 76, 42)
ON CONFLICT (preset_id) DO NOTHING;
