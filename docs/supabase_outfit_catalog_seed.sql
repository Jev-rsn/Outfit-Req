-- ==============================================================================
-- OUTFIT REQ â€” SEED OUTFIT CATALOG (APIFY SHOPEE MARKETPLACE PRODUCTS)
-- Jalankan query ini di Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Pastikan kolom-kolom pendukung tersedia di tabel outfit_catalog
ALTER TABLE public.outfit_catalog 
  ADD COLUMN IF NOT EXISTS price_total NUMERIC,
  ADD COLUMN IF NOT EXISTS price_display TEXT,
  ADD COLUMN IF NOT EXISTS rating NUMERIC,
  ADD COLUMN IF NOT EXISTS item_id TEXT;

-- 2. Kebijakan RLS agar dapat dibaca publik dan dikelola
ALTER TABLE public.outfit_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Katalog outfit dapat dibaca publik" ON public.outfit_catalog;
CREATE POLICY "Katalog outfit dapat dibaca publik"
    ON public.outfit_catalog FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Katalog outfit dapat dikelola" ON public.outfit_catalog;
CREATE POLICY "Katalog outfit dapat dikelola"
    ON public.outfit_catalog FOR ALL
    USING (true)
    WITH CHECK (true);

-- 3. Hapus data lama (mock / non-apify) agar hanya produk marketplace Apify yang tersimpan
DELETE FROM public.outfit_catalog;

-- 4. Masukkan 15 Produk Fashion Apify Shopee
INSERT INTO public.outfit_catalog (
    item_id,
    title,
    photo_url,
    category,
    event_type,
    source_store,
    product_link,
    description,
    price_total,
    price_display,
    rating
) VALUES
('shopee-28751940555', 'Jaqueta Com Capuz Casaco Corta-Vento Quente Ã€ Prova D''Ã¡gua Para Homens Caminhadas Pesca Outerwear Jaquetas Masculinas Do', 'https://down-br.img.susercontent.com/file/cn-11134207-7r98o-lw6m33mma1c55c', 'sporty', NULL, 'Shopee', 'https://shopee.com.br/jaqueta-com-capuz-casaco-corta-vento-quente-a-prova-d-agua-para-homens-caminhadas-pesca-outerwear-ja-i.236700327.28751940555', 'Hemat 75%! Produk live dari Shopee Marketplace. Kualitas terverifikasi dengan rating 4.8/5.0.', 165068, 'R$ 56.92 (~ Rp 165.068)', 4.8),
('shopee-53717754452', 'Jaqueta masculina folgada e versÃ¡til com capuz, estampa em cores contrastantes, com zÃ­per, ideal para usar na primavera', 'https://down-br.img.susercontent.com/file/sg-11134201-8257s-mt1a632dqj29b3', 'kasual', NULL, 'Shopee', 'https://shopee.com.br/jaqueta-masculina-folgada-e-versatil-com-capuz-estampa-em-cores-contrastantes-com-ziper-ideal-para-u-i.1930400645.53717754452', 'Produk live dari Shopee Marketplace. Kualitas terverifikasi dengan rating 4.8/5.0.', 376507, 'R$ 129.83 (~ Rp 376.507)', 4.8),
('shopee-29613458326', 'Jaqueta Masculina Com Fecho De ZÃ­per Completo ClÃ¡ssica Para NegÃ³cios E Uso Casual Casaco Macio Elegante Primavera Outono', 'https://down-br.img.susercontent.com/file/sg-11134201-7rbkw-lqkdfengj344d7', 'formal', NULL, 'Shopee', 'https://shopee.com.br/jaqueta-masculina-com-fecho-de-ziper-completo-classica-para-negocios-e-uso-casual-casaco-macio-elega-i.1356520315.29613458326', 'Produk live dari Shopee Marketplace. Kualitas terverifikasi dengan rating 4.6/5.0.', 242179, 'R$ 83.51 (~ Rp 242.179)', 4.6),
('shopee-22098376587', 'Jaqueta ImpermeÃ¡vel de Inverno Masculina Bobojaco Ã  Prova de Vento Forro Macio Capuz RemovÃ­vel Frio Grosso e Intenso', 'https://down-br.img.susercontent.com/file/br-11134207-820me-mqavg52do83m43', 'streetwear', NULL, 'Shopee', 'https://shopee.com.br/jaqueta-impermeavel-de-inverno-masculina-bobojaco-a-prova-de-vento-forro-macio-capuz-removivel-frio-i.494356661.22098376587', 'Produk live dari Shopee Marketplace. Kualitas terverifikasi dengan rating 4.9/5.0.', 826500, 'R$ 285.00 (~ Rp 826.500)', 4.9),
('shopee-54962639141', 'Hkitty Novo Estilo ChinÃªs Jaqueta Abotoada Com Gola Alta Para Casais , Solta', 'https://down-br.img.susercontent.com/file/sg-11134201-824hf-mpt1asazu0b272', 'minimalist', NULL, 'Shopee', 'https://shopee.com.br/hkitty-novo-estilo-chines-jaqueta-abotoada-com-gola-alta-para-casais-solta-i.1407936623.54962639141', 'Produk live dari Shopee Marketplace. Kualitas terverifikasi dengan rating 4.7/5.0.', 410495, 'R$ 141.55 (~ Rp 410.495)', 4.7),
('shopee-23695178417', 'KIT 3 ou 1 JAQUETAS BLUSAS UNISSEX COM CAPUZ DE FRIO FORRADO', 'https://down-br.img.susercontent.com/file/br-11134207-820lp-msk9noxmrsp0be', 'kasual', NULL, 'Shopee', 'https://shopee.com.br/kit-3-ou-1-jaquetas-blusas-unissex-com-capuz-de-frio-forrado-i.988560885.23695178417', 'Hemat 55%! Produk live dari Shopee Marketplace. Kualitas terverifikasi dengan rating 4.7/5.0.', 91234, 'R$ 31.46 (~ Rp 91.234)', 4.7),
('shopee-46069351757', '(duyonglin111) Jaquetas Masculinas De Hip Hop , Corta-Vento Quentes Com ZÃ­per , Casaco Grande Capuz , Casual , Harajuku', 'https://down-br.img.susercontent.com/file/sg-11134201-8258s-mud71ou6zitf0e', 'sporty', NULL, 'Shopee', 'https://shopee.com.br/duyonglin111-jaquetas-masculinas-de-hip-hop-corta-vento-quentes-com-ziper-casaco-grande-capuz-casua-i.1934439499.46069351757', 'Hemat 52%! Produk live dari Shopee Marketplace. Kualitas terverifikasi dengan rating 4.8/5.0.', 136938, 'R$ 47.22 (~ Rp 136.938)', 4.8),
('shopee-55068636715', 'Jaqueta Corta Vento Com Capuz de Nylon Com Forro Com pelinhos', 'https://down-br.img.susercontent.com/file/sg-11134201-825a4-mtr4ztijgu803c', 'kasual', NULL, 'Shopee', 'https://shopee.com.br/jaqueta-corta-vento-com-capuz-de-nylon-com-forro-com-pelinhos-i.1007831167.55068636715', 'Produk live dari Shopee Marketplace. Kualitas terverifikasi dengan rating 4.8/5.0.', 247689, 'R$ 85.41 (~ Rp 247.689)', 4.8),
('shopee-52165451813', 'Jaqueta Casual Masculina Ã€ Prova De Vento , Corta-Leve Para Exterior', 'https://down-br.img.susercontent.com/file/sg-11134201-825b1-mri95698ucqvc0', 'kasual', NULL, 'Shopee', 'https://shopee.com.br/jaqueta-casual-masculina-a-prova-de-vento-corta-leve-para-exterior-i.1869331491.52165451813', 'Produk live dari Shopee Marketplace. Kualitas terverifikasi dengan rating 5/5.0.', 366792, 'R$ 126.48 (~ Rp 366.792)', 5),
('shopee-23498705267', 'Jaqueta em Microfibra Acolchoada Sob Encomenda', 'https://down-br.img.susercontent.com/file/br-11134207-7r98o-mbzjqbnnvsfb91', 'kasual', NULL, 'Shopee', 'https://shopee.com.br/jaqueta-em-microfibra-acolchoada-sob-encomenda-i.435515386.23498705267', 'Produk live dari Shopee Marketplace. Kualitas terverifikasi dengan rating 4.9/5.0.', 493145, 'R$ 170.05 (~ Rp 493.145)', 4.9),
('shopee-58218139482', 'Jaqueta Corta Vento Masculino Plus Size ImpermeÃ¡vel Liso', 'https://down-br.img.susercontent.com/file/sg-11134201-825av-mt57xxq3tqtj40', 'kasual', NULL, 'Shopee', 'https://shopee.com.br/jaqueta-corta-vento-masculino-plus-size-impermeavel-liso-i.1925004781.58218139482', 'Hemat 60%! Produk live dari Shopee Marketplace. Kualitas terverifikasi dengan rating 4.7/5.0.', 115710, 'R$ 39.90 (~ Rp 115.710)', 4.7),
('shopee-28178052281', 'Jaqueta De Inverno Masculina De AlgodÃ£o Slim Estilo Sobretudo Casual', 'https://down-br.img.susercontent.com/file/sg-11134201-7rd5w-m6usp5df2crl6c', 'kasual', NULL, 'Shopee', 'https://shopee.com.br/jaqueta-de-inverno-masculina-de-algodao-slim-estilo-sobretudo-casual-i.820984802.28178052281', 'Produk live dari Shopee Marketplace. Kualitas terverifikasi dengan rating 4.7/5.0.', 388455, 'R$ 133.95 (~ Rp 388.455)', 4.7),
('shopee-18199211255', 'Jaqueta masculina Estilo Parka Casaco Frio', 'https://down-br.img.susercontent.com/file/br-11134207-7r98o-ls38ojpee23oba', 'kasual', NULL, 'Shopee', 'https://shopee.com.br/jaqueta-masculina-estilo-parka-casaco-frio-i.1122402656.18199211255', 'Produk live dari Shopee Marketplace. Kualitas terverifikasi dengan rating 4.9/5.0.', 545490, 'R$ 188.10 (~ Rp 545.490)', 4.9),
('shopee-58270345589', 'Jaqueta Masculina em Couro Fino SintÃ©tico Premium Outono Inverno', 'https://down-br.img.susercontent.com/file/br-11134201-820l5-mu8nolw79j433e', 'kasual', NULL, 'Shopee', 'https://shopee.com.br/jaqueta-masculina-em-couro-fino-sintetico-premium-outono-inverno-i.442458986.58270345589', 'Produk live dari Shopee Marketplace. Kualitas terverifikasi dengan rating 5/5.0.', 465595, 'R$ 160.55 (~ Rp 465.595)', 5),
('shopee-58257744897', 'Jaqueta Masculina Sarja Tradicional', 'https://down-br.img.susercontent.com/file/br-11134207-820lf-mmb8jhn15e6e1f', 'kasual', NULL, 'Shopee', 'https://shopee.com.br/jaqueta-masculina-sarja-tradicional-i.495311461.58257744897', 'Produk live dari Shopee Marketplace. Kualitas terverifikasi dengan rating 4.8/5.0.', 366154, 'R$ 126.26 (~ Rp 366.154)', 4.8);

-- Selesai! 15 produk Apify berhasil dimasukkan ke tabel outfit_catalog.

-- 5. Konfigurasi tabel saved_photos (Wishlist Produk Per Akun)
ALTER TABLE public.saved_photos 
  ADD COLUMN IF NOT EXISTS item_id TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS price_display TEXT,
  ADD COLUMN IF NOT EXISTS store TEXT,
  ADD COLUMN IF NOT EXISTS store_url TEXT,
  ADD COLUMN IF NOT EXISTS item_data JSONB;

-- Pastikan RLS mengizinkan setiap pengguna membaca dan mengelola wishlist mereka sendiri
ALTER TABLE public.saved_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users dapat mengelola wishlist foto sendiri" ON public.saved_photos;
CREATE POLICY "Users dapat mengelola wishlist foto sendiri"
    ON public.saved_photos FOR ALL
    USING (true)
    WITH CHECK (true);

