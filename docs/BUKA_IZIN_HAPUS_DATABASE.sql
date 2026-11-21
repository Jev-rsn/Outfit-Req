-- ==============================================================================
-- OREC — SCRIPT SQL UNTUK MEMBUKA IZIN HAPUS & KELOLA DATABASE DI SUPABASE
-- ==============================================================================
-- CARA PENGGUNAAN:
-- 1. Buka Dashboard Supabase (https://supabase.com/dashboard)
-- 2. Pilih project Anda
-- 3. Di menu navigasi sebelah kiri, klik "SQL Editor"
-- 4. Klik "New query", tempel (paste) seluruh isi script ini
-- 5. Klik tombol "Run" (atau tekan Ctrl + Enter)
-- ==============================================================================

-- 1. Nonaktifkan Row Level Security (RLS) pada seluruh tabel aplikasi
--    sehingga operasi Hapus (DELETE), Tambah (INSERT), dan Ubah (UPDATE) dari
--    Konsol Admin diizinkan sepenuhnya oleh database.
ALTER TABLE IF EXISTS public.outfit_catalog DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.premium_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_quota DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.saved_photos DISABLE ROW LEVEL SECURITY;

-- 2. Berikan hak akses penuh (SELECT, INSERT, UPDATE, DELETE) kepada anon dan authenticated
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- ==============================================================================
-- SELESAI!
-- Setelah menjalankan script ini di Supabase SQL Editor:
-- Tombol Hapus (DELETE) dan Tambah (INSERT) di Konsol Admin akan langsung 
-- mengubah data di database Supabase secara instan dan permanen.
-- ==============================================================================
