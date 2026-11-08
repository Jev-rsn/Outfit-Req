# Outfit Req — Platform Rekomendasi Outfit & Analisis Gaya 3D

Proyek Aplikasi Rekomendasi Outfit berbasis kecerdasan buatan, kurasi gaya personalitas, dan ruang visual 3D interaktif.

---

## 📁 Struktur Direktori Proyek

```
EBD/
├── index.html                 # Entry Point Utama (Otomatis membuka Beranda Outfit Req)
├── start_server.bat           # File Batch Windows (Satu Klik untuk Menjalankan & Membuka Browser)
├── start_server.ps1           # HTTP Server Native PowerShell (Tanpa dependensi)
├── server.py                  # HTTP Server Unified (Opsi Python)
│
├── WEB EBD/                   # Modul Lengkap Aplikasi Web Outfit Req
│   ├── index.html             # Halaman Beranda Utama (Hero Parallax 9 Kartu Busana)
│   ├── Main.dc.html           # Alias Halaman Beranda
│   ├── rekomendasi.html       # Fitur Rekomendasi Outfit (Pinterest Waterfall Masonry, Omnibox, AI Mood Matcher)
│   ├── account.html           # Halaman Khusus Akun (Free & Premium) + Wizard Upgrade 3-Tahap
│   ├── tutorial.html          # Halaman Panduan & Tutorial Interaktif 5 Modul Fitur
│   ├── login.html             # Halaman Masuk & Registrasi 3D Interaktif (Lokal)
│   ├── app.js, scene.js       # Runtime & Logika 3D Autentikasi
│   ├── styles.css             # Desain editorial visual bergaya modern
│   ├── support.js             # Runtime rendering komponen dinamis
│   ├── images/                # Aset kartu gambar busana editorial (card1 - card9)
│   └── vendor/                # Pustaka React & ReactDOM lokal
│
├── WEB EBD Login/             # Modul Autentikasi 3D Mandiri (Opsional)
│   ├── index.html             # Halaman antarmuka autentikasi & Three.js 3D Room
│   ├── app.js, scene.js       # Logika form, validasi, dan render 3D
│   └── styles.css             # Desain editorial autentikasi
│
├── components/                # Komponen UI Modern (shadcn / React / Tailwind)
│   └── ui/
│       ├── product-rail-gallery.tsx  # Komponen Clothing Rail Gallery 3D Interaktif
│       └── demo.tsx                  # Contoh implementasi & data pakaian galeri
│
└── docs/                      # Dokumentasi & Skema Database
    ├── PANDUAN_SETUP_SUPABASE.md              # Langkah setup Supabase dari nol
    ├── PRD Final - Platform Rekomendasi Outfit.docx  # Dokumen PRD Final
    ├── PRD_Teknikal_EBD.md                    # Dokumen Spesifikasi Teknis & Arsitektur
    └── supabase_schema.sql                    # Skema SQL, Trigger, RLS, & Kuota
```

---

## 🚀 Cara Menjalankan Website

1. **Jalankan Server (Paling Direkomendasikan)**:
   Cukup klik dua kali file **`start_server.bat`** (atau jalankan `.\start_server.ps1` di PowerShell).
   Browser Anda akan langsung terbuka otomatis di: [http://localhost:8080/](http://localhost:8080/)
2. **Sinkronisasi Produk Otomatis (Apify Shopee & Uniqlo -> Supabase Database)**:
   - **Sinkronisasi Katalog via PowerShell**:
     ```powershell
     # Sinkronisasi Uniqlo (Actor OLoDZH1W1Kzag99wV)
     powershell -ExecutionPolicy Bypass -File .\sync_apify_products.ps1 -Target uniqlo

     # Sinkronisasi Shopee (Actor fmKWN5uByUCIy2Sam)
     powershell -ExecutionPolicy Bypass -File .\sync_apify_products.ps1 -Target shopee

     # Atau sinkronisasi seluruh katalog (Shopee + Uniqlo)
     powershell -ExecutionPolicy Bypass -File .\sync_apify_products.ps1 -Target all
     ```
   - **Sinkronisasi Katalog via Python (`apify-client`)**:
     ```bash
     python sync_apify_products.py
     # Atau trigger scraping baru:
     python sync_apify_products.py --run
     ```
   - **Memasukkan Produk ke Database Supabase (`outfit_catalog`)**:
     File **[`docs/supabase_outfit_catalog_seed.sql`](docs/supabase_outfit_catalog_seed.sql)** berisi 215 produk resmi dari Uniqlo dan Shopee yang siap dijalankan di menu **SQL Editor** pada Supabase Dashboard Anda.
   - Halaman **[Galeri Rekomendasi (rekomendasi.html)](WEB%20EBD/rekomendasi.html)** secara cerdas akan langsung memuat data dari tabel database Supabase secara real-time (dengan fallback ke cache lokal jika offline). Tersedia tab filter langsung untuk **Shopee Live** dan **Uniqlo Official**.
3. **Atau Buka Langsung File HTML**:
   Anda juga dapat langsung mengeklik dua kali file **`index.html`** di folder utama atau di dalam folder **`WEB EBD/index.html`**.
