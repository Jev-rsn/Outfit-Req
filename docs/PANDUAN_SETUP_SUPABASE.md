# Panduan Lengkap Setup Database Supabase — Outfit Req

Panduan langkah demi langkah dari awal pembuatan akun, konfigurasi database, integrasi skrip, hingga aplikasi siap digunakan.

---

## Daftar Isi
1. [Langkah 1: Membuat Proyek Supabase](#langkah-1-membuat-proyek-supabase)
2. [Langkah 2: Menjalankan Skrip Skema Database (SQL)](#langkah-2-menjalankan-skrip-skema-database-sql)
3. [Langkah 3: Mengambil Kunci API (URL & Anon Key)](#langkah-3-mengambil-kunci-api-url--anon-key)
4. [Langkah 4: Konfigurasi Otentikasi (Email & Google OAuth)](#langkah-4-konfigurasi-otentikasi-email--google-oauth)
5. [Langkah 5: Memasukkan Kredensial ke Klien Frontend](#langkah-5-memasukkan-kredensial-ke-klien-frontend)
6. [Langkah 6: Menjalankan & Menguji Aplikasi](#langkah-6-menjalankan--menguji-aplikasi)
7. [Pengujian Fitur (Checklist)](#pengujian-fitur-checklist)

---

## Langkah 1: Membuat Proyek Supabase

1. Buka browser dan kunjungi [https://supabase.com](https://supabase.com).
2. Klik tombol **Start your project** atau **Sign In** (bisa menggunakan akun GitHub).
3. Di halaman Dashboard, klik **New Project**.
4. Isi data proyek:
   - **Name**: `Outfit Req` (atau nama lain pilihan Anda).
   - **Database Password**: Buat password yang kuat dan catat/simpan dengan aman.
   - **Region**: Pilih yang terdekat dengan Indonesia (misalnya **Singapore (ap-southeast-1)**) agar latensi cepat.
   - **Pricing Plan**: Pilih **Free Plan**.
5. Klik **Create new project** dan tunggu 1–2 menit hingga penyediaan database selesai.

---

## Langkah 2: Menjalankan Skrip Skema Database (SQL)

Di folder proyek Anda telah disediakan file `supabase_schema.sql` yang sudah memuat seluruh tabel, trigger otomatis, kuota chat 10 pertanyaan, dan proteksi RLS (Row Level Security).

1. Di Dashboard Supabase, buka tab **SQL Editor** pada sidebar kiri (ikon `>_`).
2. Klik **New query** (tombol hijau atau tanda `+`).
3. Buka file `supabase_schema.sql` di laptop Anda, salin (**Copy**) seluruh isinya.
4. Tempel (**Paste**) ke area editor SQL di Supabase.
5. Klik tombol **Run** (atau tekan `Ctrl + Enter`).
6. Pastikan muncul notifikasi **`Success. No rows returned`**.

> **Apa yang dibuat oleh skrip ini?**
> - **Tabel `public.users`**: Menyimpan profil pengguna, tier (`guest`, `free`, `premium`).
> - **Trigger `on_auth_user_created`**: Otomatis mendaftarkan user baru dari Supabase Auth ke tabel profil dan memberi **kuota 10 pertanyaan gratis**.
> - **Tabel `chat_rooms` & `chat_messages`**: Menyimpan percakapan rekomendasi gaya.
> - **Tabel `chat_quota`**: Mengontrol reset kuota berkala (tiap 3 hari).
> - **Tabel `outfit_catalog` & `saved_photos`**: Katalog busana dan foto inspirasi.
> - **Aturan RLS**: Pengguna hanya dapat membaca dan mengubah data miliknya sendiri.

---

## Langkah 3: Mengambil Kunci API (URL & Anon Key)

1. Di Dashboard Supabase, klik ikon roda gigi **Project Settings** di bagian bawah sidebar kiri.
2. Pilih submenu **API**.
3. Cari bagian **Project API keys** dan catat dua data penting berikut:
   - **Project URL**: Formatnya seperti `https://xyzcompany.supabase.co`
   - **`anon` `public` Key**: String panjang yang diawali dengan `eyJhbGciOi...`

> **Penting**:
> Jangan gunakan **`service_role` key** di kode frontend (browser) karena memiliki hak akses administrator penuh tanpa mempedulikan aturan RLS. Gunakan selalu **`anon` `public` key**.

---

## Langkah 4: Konfigurasi Otentikasi (Email & Google OAuth)

### A. Otentikasi Email & Password
1. Di sidebar kiri, buka menu **Authentication** -> **Providers**.
2. Pastikan toggle **Email** dalam keadaan **Enabled**.
3. *(Opsional untuk kemudahan demo)*:
   - Masuk ke **Authentication** -> **URL Configuration**.
   - Di bagian **Email Templates** / **Providers** -> **Email**, Anda bisa mematikan opsi *"Confirm email"* jika ingin user yang mendaftar bisa langsung login seketika tanpa harus verifikasi link email terlebih dahulu.

### B. Otentikasi Google OAuth (Opsional jika ingin tombol Google aktif)
1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Buat OAuth 2.0 Client ID baru untuk Web Application.
3. Masukkan **Authorized redirect URIs** yang diberikan oleh Supabase (bisa disalin dari halaman *Authentication -> Providers -> Google* di Supabase).
4. Salin **Client ID** dan **Client Secret** dari Google ke kolom provider Google di Supabase, lalu klik **Save**.

---

## Langkah 5: Memasukkan Kredensial ke Klien Frontend

Buka file `WEB EBD Login/supabaseClient.js` di teks editor Anda.

Ganti baris konfigurasi berikut:

```javascript
// Ganti dengan kredensial dari Langkah 3:
export const SUPABASE_URL = 'https://abcdefghijkl.supabase.co'; // <- Project URL Anda
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // <- Anon Key Anda
```

Simpan file (`Ctrl + S`).

---

## Langkah 6: Menjalankan & Menguji Aplikasi

Aplikasi web ini menggunakan standar browser modern ES Modules (`type="module"`), sehingga paling optimal dijalankan melalui local web server:

1. Buka terminal PowerShell di folder workspace Anda (`c:\Users\Jeverson\OneDrive\Documents\Semester 5\EBD`).
2. Jalankan server lokal:
   ```powershell
   python server.py
   ```
3. Buka browser dan akses alamat:
   - **Halaman Utama**: [http://localhost:8080/WEB%20EBD/Main.dc.html](http://localhost:8080/WEB%20EBD/Main.dc.html)
   - **Halaman Login 3D**: [http://localhost:8080/WEB%20EBD%20Login/index.html](http://localhost:8080/WEB%20EBD%20Login/index.html)

---

## Pengujian Fitur (Checklist)

| No | Aksi Pengujian | Hasil yang Diharapkan |
|---|---|---|
| 1 | Buka Halaman Login, klik **"Daftar di sini"** | Formulir Registrasi terbuka dengan animasi transisi |
| 2 | Isi Nama, Email, & Password >= 6 karakter, lalu klik **Daftar Sekarang** | User otomatis tercatat di Supabase Auth & tabel `users`, kuota `10` terisi, dialihkan ke `Main.dc.html` |
| 3 | Periksa Navbar `Main.dc.html` | Tombol login berubah menjadi **"Halo, [Nama Anda]"** |
| 4 | Buka Supabase Dashboard -> **Table Editor** -> **`users`** & **`chat_quota`** | Data user baru dan jatah 10 pertanyaan muncul di baris tabel |
| 5 | Tes Fitur **"Lupa kata sandi?"** | Masukkan email terdaftar, Supabase mengirim tautan reset password |
