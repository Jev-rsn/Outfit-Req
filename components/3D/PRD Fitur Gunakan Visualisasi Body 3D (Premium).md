# PRD Fitur Gunakan: Visualisasi Body 3D (Premium)

Turunan dari *PRD Final: Platform Rekomendasi Outfit* (FR-13, FR-14, FR-17). Versi 1.0.

## 1. Ringkasan

Fitur **Gunakan** memungkinkan pengguna Premium melihat outfit hasil rekomendasi dipakaikan pada manekin 3D yang ukuran tubuhnya mengikuti data diri mereka (TB, BB, dan opsional LD, LP, lebar bahu). Tampilan dapat diputar 360°, dan pengguna dapat berganti produk maupun ukuran tubuh tanpa memuat ulang halaman.

Pendekatan teknis yang dipilih adalah **Hybrid UV Projection**: foto katalog 2D diproyeksikan sebagai tekstur ke template mesh pakaian standar yang sudah sinkron dengan manekin parametrik. Tidak ada model 3D baru yang dibuat per produk.

## 2. Latar Belakang dan Masalah

Pengguna ragu membeli pakaian online karena tidak tahu bagaimana tampilannya di tubuh sendiri. Foto katalog dipakai oleh model dengan proporsi berbeda, dan tabel ukuran sulit dibayangkan. Fitur ini menjawab keraguan tersebut dan menjadi alasan utama pengguna meningkatkan akun ke Premium.

## 3. Tujuan dan Metrik Keberhasilan

| Tujuan | Metrik | Target awal |
| --- | --- | --- |
| Mendorong konversi Free ke Premium | Persentase upgrade yang memicu pratinjau fitur Gunakan | Dipantau sejak rilis |
| Pengguna Premium benar-benar memakai fitur | Persentase Premium aktif yang menekan Gunakan minimal 1 kali per minggu | ≥ 40% |
| Visualisasi mendorong aksi beli | Rasio klik tautan produk setelah Gunakan dibanding tanpa Gunakan | Lebih tinggi dari baseline |
| Pengalaman lancar | Waktu muat manekin + pakaian pertama kali | ≤ 4 detik di 4G |
| Hasil dipercaya | Skor kepuasan visual (umpan balik 👍/👎) | ≥ 70% positif |

## 4. Target Pengguna

- Pengguna Premium yang sudah mengisi data diri (Nama, TB, BB wajib; LD, LP, lebar bahu opsional).
- Pengguna mobile sebagai prioritas utama, desktop sebagai pendukung.

## 5. Hak Akses

| Level | Akses tombol Gunakan |
| --- | --- |
| Guest | Tidak |
| Free | Tidak, tampilkan pratinjau terkunci (contoh visual) dan ajakan upgrade |
| Premium | Ya |

Saat masa Premium habis (FR-16), akun otomatis turun ke Free dan tombol Gunakan terkunci. Data tubuh tetap tersimpan tetapi tidak dipakai sampai Premium aktif kembali, kecuali pengguna memilih menghapusnya.

## 6. Lingkup

### 6.1 Termasuk dalam lingkup (In Scope)

- Tombol Gunakan di kanan atas foto baju pada hasil rekomendasi Premium.
- Manekin 3D parametrik dengan penyesuaian ukuran tubuh dari data diri.
- Pakaian atasan (kaos, kemeja, jaket) dan bawahan (celana, rok) sebagai kategori awal.
- Rotasi 360°, zoom, dan reset kamera.
- Ganti produk dan ganti ukuran (size) pakaian langsung di viewer.
- Pipeline otomatis dari foto katalog menjadi tekstur siap pakai.
- Antrean tinjauan manual untuk hasil yang meragukan.

### 6.2 Di luar lingkup (Out of Scope) versi 1

- Simulasi kain realistis (jatuh, kusut, lipatan dinamis).
- Aksesori, sepatu, hijab, dan pakaian berlapis kompleks (misalnya gamis dengan outer).
- Pemindaian tubuh lewat kamera atau foto pengguna.
- Pewarnaan kulit, wajah, dan gaya rambut yang personal.
- Berbagi hasil visualisasi ke media sosial (dipertimbangkan versi berikutnya).

## 7. User Flow

**Flow utama (Premium dengan data diri lengkap)**

1. Pengguna menerima jawaban chat atau membuka galeri, lalu melihat foto baju.
2. Pengguna menekan **Gunakan** di kanan atas foto.
3. Viewer 3D terbuka dengan manekin berukuran sesuai data tubuh pengguna, mengenakan baju tersebut.
4. Pengguna memutar 360°, memilih size, atau mengganti ke produk rekomendasi lain di strip bawah.
5. Pengguna menekan tautan produk untuk membeli, atau menyimpan foto.

**Flow alternatif**

- **Data diri belum lengkap:** tampil formulir singkat untuk TB dan BB (wajib) sebelum viewer dibuka, dengan persetujuan eksplisit sesuai UU PDP.
- **Free menekan tombol terkunci:** tampil pratinjau contoh dan tawaran paket Premium.
- **Produk belum memiliki tekstur siap pakai:** tampil status "sedang diproses" dan produk diantrekan; pengguna bisa melihat foto 2D biasa.
- **Kategori tidak didukung:** tombol Gunakan disembunyikan atau dinonaktifkan dengan keterangan.

## 8. Kebutuhan Fungsional

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| GN-01 | Tombol Gunakan tampil di kanan atas foto baju pada hasil Premium untuk kategori yang didukung | P0 |
| GN-02 | Manekin 3D parametrik dengan parameter TB, BB, LD, LP, dan lebar bahu | P0 |
| GN-03 | Bila LD, LP, atau lebar bahu kosong, sistem memperkirakan dari TB dan BB memakai tabel proporsi standar | P0 |
| GN-04 | Pakaian dirender dari template mesh per kategori dengan tekstur dari foto produk | P0 |
| GN-05 | Rotasi 360°, zoom, dan reset kamera lewat sentuhan dan mouse | P0 |
| GN-06 | Pilihan size pakaian (XS sampai 3XL sesuai size chart produk); pakaian tampak ketat atau longgar sesuai size terhadap tubuh | P1 |
| GN-07 | Ganti produk di viewer hanya dengan mengganti tekstur (dan template bila kategori berbeda), tanpa memuat ulang manekin | P1 |
| GN-08 | Pipeline otomatis: hapus background, pilih template, proyeksi UV, simpan tekstur | P0 |
| GN-09 | Penandaan `needs_review` untuk hasil berkualitas rendah dan antarmuka tinjauan bagi admin | P1 |
| GN-10 | Batas rentang ukuran tubuh agar distorsi tekstur tetap wajar; nilai di luar rentang ditahan dan diberi pesan | P1 |
| GN-11 | Tombol umpan balik 👍/👎 pada hasil visualisasi | P1 |
| GN-12 | Pengguna dapat mengubah atau menghapus data tubuh kapan saja | P0 |
| GN-13 | Pratinjau terkunci untuk pengguna Free dengan ajakan upgrade | P2 |
| GN-14 | Fallback ke foto 2D bila perangkat tidak mendukung WebGL atau gagal memuat | P1 |

## 9. Arsitektur Teknis Ringkas

### 9.1 Pendekatan

**Hybrid UV Projection**: satu manekin parametrik, satu template mesh per kategori pakaian, dan satu tekstur per produk. Template dan manekin berbagi morph target yang sama sehingga pakaian mengikuti perubahan tubuh tanpa menembus badan (clipping).

### 9.2 Persiapan (sekali)

1. Buat manekin parametrik (SMPL/MakeHuman atau model buatan sendiri) dengan morph target tinggi, dada, pinggang, pinggul, dan bahu.
2. Buat template pakaian per kategori dengan UV rapi dan morph target yang sinkron.
3. Simpan dalam format .glb ringan (target manekin + satu template ≤ 3 MB, terkompresi Draco/meshopt).

### 9.3 Pipeline per produk (backend)

1. Foto katalog masuk dari sumber toko (FR-17); simpan salinan asli.
2. Klasifikasi tipe pakaian dan tampak (depan, belakang, flat lay atau dipakai model).
3. Hapus background menjadi PNG transparan.
4. Pilih template sesuai kategori dan `fit_type`.
5. Proyeksikan gambar ke UV template menjadi `texture_url`.
6. Skor kualitas otomatis; skor rendah menjadi `needs_review`.

### 9.4 Rendering (frontend)

Three.js atau React Three Fiber memuat manekin dan template. Ganti produk berarti mengganti tekstur. Ganti ukuran berarti mengubah morph weights yang dihitung dari data tubuh pengguna dan `size_chart` produk.

## 10. Perubahan Data

**Tabel `product_assets`** (relasi ke produk): `original_url`, `view` (front/back/detail), `cutout_url`, `texture_url`, `normal_map_url` (opsional), `processing_status` (pending/done/failed), `needs_review`.

**Kolom tambahan di produk:** `garment_type`, `template_id`, `fit_type` (slim/regular/oversize), `size_chart`, `fabric_type`.

**Tabel `garment_templates`:** file .glb, UV layout, daftar morph target, kategori.

**Tabel `body_profiles`** (terenkripsi at-rest): TB, BB, LD, LP, lebar bahu, status persetujuan, waktu persetujuan.

**Tabel `mannequin_presets`:** preset parameter tubuh dan morph weights.

Foto asli tidak ditimpa; semua hasil olahan disimpan sebagai aset turunan.

## 11. Kebutuhan Non-Fungsional

- **Performa:** viewer terbuka ≤ 4 detik (4G), ≥ 30 FPS di perangkat mobile menengah, ganti produk ≤ 1 detik karena hanya mengganti tekstur.
- **Ukuran aset:** tekstur ≤ 500 KB per produk (WebP/KTX2), dimuat bertahap.
- **Keamanan dan privasi:** data tubuh dienkripsi, persetujuan eksplisit sebelum pengumpulan, opsi hapus data, dan data tidak dipakai untuk tujuan lain tanpa persetujuan.
- **Kompatibilitas:** WebGL 2 pada browser mobile umum; fallback 2D bila tidak tersedia.
- **Aksesibilitas:** kontrol rotasi dapat dioperasikan dengan tombol, dan tersedia deskripsi teks pada hasil visualisasi.
- **Bahasa:** Bahasa Indonesia.

## 12. Panduan UX

- Palet warna mengikuti panduan desain PRD utama (putih #FFFFFF, merah marun #6D001A, hitam #000000, plus satu aksen terpilih).
- Tombol Gunakan berupa ikon dengan label, kontras tinggi di atas foto.
- Viewer menampilkan penjelasan singkat bahwa ini **perkiraan visual**, bukan ukuran pasti.
- Slider tubuh dibatasi pada rentang wajar dan menampilkan satuan (cm, kg).
- Manekin netral (tanpa wajah dan detail kulit) agar tidak menimbulkan sensitivitas citra tubuh.

## 13. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Foto katalog memakai model manusia, hasil proyeksi UV kurang akurat | Tampilan aneh atau terdistorsi | Prioritaskan flat lay; segmentasi dan unwarp untuk foto model; skor kualitas dan tinjauan manual |
| Motif garis, kotak, dan logo melar pada ukuran ekstrem | Hasil tidak natural | Batasi rentang ukuran, kompensasi UV, atau tekstur khusus per size |
| Hak cipta dan izin pemakaian foto dari toko pihak ketiga | Risiko hukum | Tinjau ketentuan tiap sumber, perjanjian kemitraan, atau gunakan foto milik sendiri untuk produk utama |
| Data tubuh sensitif | Pelanggaran privasi | Persetujuan eksplisit, enkripsi, opsi hapus, UU PDP |
| Performa buruk di perangkat murah | Pengguna keluar | Aset ringan, kompresi, level kualitas adaptif, fallback 2D |
| Ekspektasi pengguna terlalu tinggi (dikira ukuran pasti) | Retur dan keluhan | Label "perkiraan", rekomendasi size berdasarkan size chart |
| Kategori pakaian kompleks (gamis, outer berlapis) | Template tidak cocok | Tunda ke fase lanjutan, tampilkan tombol hanya untuk kategori yang didukung |

## 14. Ketergantungan

- Form data diri Premium (FR-13) dan alur pembayaran (FR-11, FR-12).
- Katalog outfit dan metadata produk dari FR-17, termasuk ketersediaan size chart.
- Kesiapan aset: manekin dan template pakaian (pekerjaan 3D satu kali).

## 15. Rencana Rilis Bertahap

| Fase | Cakupan | Keluaran |
| --- | --- | --- |
| 0. Prototipe | Satu manekin, 2 template (kaos, celana), 10 produk flat lay | Validasi kualitas visual dan performa |
| 1. MVP | Atasan dan bawahan dasar, input TB/BB, rotasi 360°, ganti produk | Rilis terbatas untuk Premium |
| 2. Penyempurnaan | Pilihan size, estimasi ukuran dari size chart, normal map, antrean tinjauan | Peningkatan akurasi |
| 3. Perluasan | Kategori baru (outer, gamis), berbagi hasil, simulasi kain ringan | Fitur lanjutan |

## 16. Pertanyaan Terbuka

1. Apakah foto produk dari toko pihak ketiga boleh diolah menjadi tekstur, atau perlu izin khusus?&#32;
2. Berapa banyak kategori pakaian yang wajib didukung pada MVP?
3. Apakah manekin cukup satu bentuk dasar, atau perlu pilihan (pria, wanita, netral)?
4. Siapa yang menyiapkan aset 3D awal (tim internal, freelancer, atau pustaka berlisensi)?
5. Bagaimana kebijakan bila data tubuh pengguna Premium yang sudah turun ke Free tidak digunakan lagi (disimpan atau dihapus setelah berapa lama)?

## 17. Kriteria Penerimaan (Acceptance Criteria)

- Pengguna Premium dengan TB dan BB terisi dapat menekan Gunakan dan melihat manekin berpakaian dalam ≤ 4 detik.
- Memutar 360° berjalan mulus tanpa pakaian menembus badan pada rentang ukuran yang diizinkan.
- Mengganti produk atau size memperbarui tampilan tanpa memuat ulang halaman.
- Pengguna Free dan Guest tidak dapat membuka viewer, dan Free melihat ajakan upgrade.
- Pengguna dapat menghapus data tubuh dan viewer kembali meminta data saat dibuka.
- Produk dengan skor kualitas rendah tidak tampil di viewer sampai lolos tinjauan, dan pengguna tetap melihat foto 2D.
