# PRD Teknis — Panduan Vibe Coding "Outfit Req"

> Dokumen ini adalah turunan teknis dari PRD produk final (`PRD_Outfit_Req_Final.docx`), ditulis agar bisa langsung dipakai sebagai konteks/prompt untuk AI coding assistant (Claude Code, Cursor, dll). Fokusnya: struktur, data model, aturan bisnis, dan urutan build — bukan narasi bisnis.
>
> Catatan versi: PRD bisnis sumber sudah final — bagian "Keputusan & Pertanyaan Terbuka" dan "Rencana Rilis" sudah tidak ada lagi di dokumen tersebut (dianggap selesai/di luar scope PRD). Beberapa detail teknis di bawah ini tetap perlu nilai konkret sebelum di-build (lihat Bagian 7) — ini murni kebutuhan implementasi, bukan kutipan open question dari PRD bisnis.

---

## 0. Cara pakai dokumen ini

Build berurutan per **Fase** (lihat bagian 8). Setiap fitur punya **Acceptance Criteria** dalam format checklist — tempel per-fitur ke AI coding tool sebagai satu task, jangan sekaligus seluruh dokumen, supaya scope tiap task tetap kecil dan gampang dicek.

---

## 1. Tech Stack yang Disarankan

| Layer | Pilihan | Alasan singkat |
| --- | --- | --- |
| Frontend | Next.js (React) + Tailwind CSS | SSR untuk SEO galeri, familiar untuk AI coding tools |
| State management | Zustand atau React Context | Ringan, cukup untuk skala MVP |
| Backend | Next.js API routes atau Node.js (Express/Fastify) | Satu repo, mempercepat vibe coding |
| Database | PostgreSQL (mis. via Supabase) | Relasional cocok untuk user/quota/transaksi; Supabase sekalian kasih Auth + Storage |
| Auth | Supabase Auth / NextAuth.js (Google OAuth) | Login Gmail autoconnect sesuai requirement |
| Storage foto | Supabase Storage / S3-compatible | Untuk foto outfit & foto tersimpan user |
| Payment gateway | Midtrans atau Xendit | Support Bank, E-Wallet, QRIS sekaligus (sesuai FR-12) — **provider belum ditentukan, perlu dikonfirmasi sebelum implementasi fase 2** |
| Visualisasi body 360° | Placeholder fase awal: image carousel statis; eksplorasi lanjut: Three.js / model 3D | Metode final (avatar 3D vs virtual try-on) belum ditentukan |
| Hosting | Vercel (frontend) + Supabase/Render (backend-db) | Deploy cepat, cocok untuk iterasi vibe coding |

Catatan: stack ini asumsi default. Jika tim punya preferensi lain (mis. Flutter untuk mobile-first), sesuaikan bagian ini dulu sebelum lanjut ke data model.

---

## 2. Struktur Halaman / Route

```
/                     → Landing, auto-masuk sebagai Guest
/personality          → Menu chat (Personality)
/personality/[roomId] → Room chat spesifik (Free & Premium)
/recommendation       → Galeri Rekomendasi (acak + per golongan)
/recommendation/[slug]→ Detail golongan (mis. /recommendation/ke-pantai)
/profile              → Profil user (User, tombol Premium, Foto disimpan)
/premium              → Halaman pilih paket Premium
/premium/checkout     → Pilih metode pembayaran + form data diri
/premium/success      → Konfirmasi upgrade berhasil
/auth/callback        → Callback OAuth Google
```

Komponen global: `Navbar` (2 menu utama + ikon profil), `PremiumAdModal` (muncul saat kuota habis).

---

## 3. Data Model

### `users`
| Field | Tipe | Keterangan |
| --- | --- | --- |
| id | uuid (PK) | |
| email | string | dari Google OAuth |
| name | string | |
| tier | enum: `guest`, `free`, `premium` | guest = belum login, tidak disimpan di DB (session-only) |
| premium_expires_at | timestamp, nullable | null jika bukan Premium |
| created_at | timestamp | |
| tb | number, nullable | tinggi badan — wajib saat upgrade Premium |
| bb | number, nullable | berat badan — wajib saat upgrade Premium |
| ld | number, nullable | lingkar dada — opsional |
| lp | number, nullable | lingkar pinggang — opsional |
| shoulder_width | number, nullable | lebar bahu — opsional |
| body_data_consent_at | timestamp, nullable | bukti persetujuan eksplisit UU PDP sebelum simpan data tubuh |

### `chat_rooms`
| Field | Tipe | Keterangan |
| --- | --- | --- |
| id | uuid (PK) | |
| user_id | uuid (FK), nullable | null untuk Guest (session-based, tidak persist) |
| title | string | auto-generate dari pertanyaan pertama |
| created_at | timestamp | |

### `chat_messages`
| Field | Tipe | Keterangan |
| --- | --- | --- |
| id | uuid (PK) | |
| room_id | uuid (FK) | |
| role | enum: `user`, `assistant` | |
| content_text | text | deskripsi jawaban |
| photo_url | string, nullable | |
| product_link | string, nullable | hanya terisi jika user login (Free/Premium) |
| created_at | timestamp | |

### `chat_quota`
| Field | Tipe | Keterangan |
| --- | --- | --- |
| user_id atau session_id | string (PK) | session_id untuk Guest (cookie/device) |
| tier | enum | `guest` / `free` |
| questions_used | int | |
| quota_reset_at | timestamp, nullable | hanya untuk Free, reset tiap 3 hari |

### `outfit_catalog`
| Field | Tipe | Keterangan |
| --- | --- | --- |
| id | uuid (PK) | |
| photo_url | string | |
| description | text | |
| category | enum/string | "golongan": `ke-pantai`, `ke-mall`, dll — **daftar final belum ditentukan, placeholder** |
| event_type | enum, nullable | `ngonser`, `pengajian`, dll — khusus Premium, **daftar final belum ditentukan, placeholder** |
| source_store | enum: `tokopedia`, `uniqlo`, `zalora`, `shopee`, `lainnya` | |
| product_link | string | |
| affiliate_code | string, nullable | tergantung skema monetisasi link produk — **belum ditentukan** |

### `saved_photos`
| Field | Tipe | Keterangan |
| --- | --- | --- |
| id | uuid (PK) | |
| user_id | uuid (FK) | hanya untuk user login |
| outfit_id | uuid (FK) | |
| saved_at | timestamp | |

### `premium_subscriptions`
| Field | Tipe | Keterangan |
| --- | --- | --- |
| id | uuid (PK) | |
| user_id | uuid (FK) | |
| package | enum: `mingguan`, `bulanan`, `tahunan` | |
| price | int | 8000 / 25000 / 200000 (Rupiah) |
| payment_method | enum: `bank`, `ewallet`, `qris` | |
| payment_gateway_ref | string | referensi dari payment gateway, **provider belum ditentukan** |
| status | enum: `pending`, `paid`, `expired` | |
| started_at | timestamp | |
| expires_at | timestamp | dihitung dari `started_at` + durasi paket |
| auto_renew | boolean | **selalu `false`** — sesuai keputusan "sekali bayar per periode" |

---

## 4. Aturan Bisnis Kunci (Business Rules)

Tulis ini sebagai pseudocode/logic yang harus diimplementasi persis — bagian paling kritikal untuk vibe coding karena gampang salah tafsir.

### 4.1 Penentuan tier & kuota chat
```
if (!user.isLoggedIn) {
  tier = "guest"
  quota_max = 3
  quota_scope = "per session/device" // belum dikonfirmasi: pernah reset atau tidak
}
else if (user.tier === "free") {
  quota_max = 10
  quota_reset_interval = "3 hari"
}
else if (user.tier === "premium" && user.premium_expires_at > now) {
  quota_max = Infinity
}
```

### 4.2 Trigger iklan Premium
```
on each chat question submit:
  if (questions_used >= quota_max) {
    block new question
    show PremiumAdModal immediately // tampil BERSAMAAN saat limit tercapai, bukan di sesi berikutnya
  }
```

### 4.3 Trigger tawaran login (khusus Guest)
```
if (tier === "guest" && questions_used === 3) {
  show LoginPrompt
  // setelah login sukses → redirect balik ke room chat, bukan ke halaman lain
}
```

### 4.4 Link produk
```
show product_link in chat answer only if user.tier in ["free", "premium"]
// Guest: foto + deskripsi saja, TANPA link produk
```

### 4.5 Downgrade otomatis
```
cron job (daily):
  for each user where tier === "premium" and premium_expires_at < now:
    set tier = "free"
    set auto_renew = false // tidak ada perpanjangan otomatis, user harus beli ulang manual
```

### 4.6 Alur upgrade Premium
```
1. User pilih paket (mingguan/bulanan/tahunan)
2. User pilih metode bayar (bank/ewallet/qris)
3. Form data diri:
   - required: nama, tb, bb   // maksimal 3 field wajib
   - optional: ld, lp, shoulder_width
   - WAJIB tampilkan consent screen (UU PDP) SEBELUM form data tubuh bisa disubmit
4. Redirect ke payment gateway
5. Webhook payment gateway → set status "paid" → aktifkan tier "premium", set expires_at
6. Jika payment gagal/timeout → status tetap "pending"/"expired", tier tidak berubah
```

### 4.7 Tombol "Gunakan" (visualisasi body, Premium only)
```
if (user.tier !== "premium") {
  hide "Gunakan" button entirely // bukan disabled, tapi tidak ditampilkan
}
else {
  on click "Gunakan":
    require user.tb && user.bb (minimal)
    render visualisasi body dengan outfit terpilih, rotatable 360°
}
```

---

## 5. Komponen UI Utama

| Komponen | Deskripsi singkat |
| --- | --- |
| `ChatWindow` | Bubble chat + indikator sisa kuota (mis. "2 pertanyaan tersisa") |
| `ChatHistorySidebar` | List room, hanya tampil untuk Free & Premium |
| `OutfitCard` | Foto + deskripsi + (conditional) link produk + (conditional, Premium) tombol "Gunakan" |
| `RecommendationGallery` | Grid dengan lazy load (infinite scroll), filter per golongan |
| `BodyVisualizer360` | Komponen rotatable viewer, Premium only |
| `PremiumAdModal` | Muncul saat kuota habis, CTA ke `/premium` |
| `LoginPromptModal` | Muncul setelah 3 chat Guest |
| `PremiumPackageSelector` | Pilihan 3 paket harga |
| `PaymentMethodSelector` | Bank / E-Wallet / QRIS |
| `BodyDataForm` | Form Nama/TB/BB wajib + LD/LP/lebar bahu opsional, dengan consent checkbox UU PDP |

---

## 6. API Endpoints (REST, ringkas)

```
POST   /api/chat/ask                 → kirim pertanyaan, cek & update kuota
GET    /api/chat/rooms               → list room (Free/Premium only)
GET    /api/chat/rooms/:id           → detail room + messages

GET    /api/recommendation/random    → galeri acak, paginated (lazy load)
GET    /api/recommendation/:category → galeri per golongan

POST   /api/photos/save              → simpan foto ke akun (login only)
GET    /api/photos/saved             → list foto tersimpan user

POST   /api/auth/google/callback     → proses login Google, create/fetch user, set tier=free

POST   /api/premium/checkout         → mulai alur upgrade (paket + metode bayar)
POST   /api/premium/webhook          → terima callback dari payment gateway
GET    /api/premium/status           → cek status Premium user saat ini

PATCH  /api/user/body-data           → submit data tubuh (wajib consent dulu)
```

---

## 7. Detail Implementasi yang Perlu Nilai Konkret Sebelum Build

PRD bisnis sudah final secara ruang lingkup, tapi beberapa parameter teknis di bawah ini belum punya nilai pasti di dokumen manapun. Jangan di-vibe-code dulu bagian terkait sampai nilainya ditentukan tim produk — kalau AI coding tool "mengarang" default-nya (misal nebak nama payment gateway atau daftar golongan), besar risiko harus rewrite:

| Perlu ditentukan | Blokir fase mana |
| --- | --- |
| Skema monetisasi link produk (afiliasi/tanpa komisi) | Fase 1 (katalog) — field `affiliate_code` |
| Daftar lengkap golongan & acara (saat ini baru contoh: ke-pantai, ke-mall / Ngonser, Pengajian, dll) | Fase 1 (katalog) & Fase 3 (penyesuaian acara) |
| Izin penggunaan foto produk dari toko online | Fase 1 (katalog) |
| Reset kuota 3 chat tamu — per sesi/device atau tidak pernah | Fase 1 (quota logic) |
| Penyedia payment gateway | Fase 2 (upgrade Premium) |
| Metode visualisasi body (avatar 3D vs virtual try-on) | Fase 3 (tombol Gunakan) |

---

## 8. Urutan Build (Fase) + Acceptance Criteria

### Fase 1 — MVP
- [ ] Guest otomatis masuk tanpa login, kuota 3 pertanyaan
- [ ] Chat Personality: foto + deskripsi (tanpa link produk untuk Guest)
- [ ] Setelah 3 chat Guest → modal tawaran login muncul
- [ ] Login Google OAuth → otomatis tier `free`, tanpa modal Premium saat login
- [ ] Free: kuota 10 pertanyaan, reset 3 hari, link produk tampil
- [ ] Menu Rekomendasi: galeri acak + per golongan, lazy load
- [ ] Sidebar Histori chat (Free & Premium)

### Fase 2 — Monetisasi
- [ ] Simpan foto ke akun (login only)
- [ ] Halaman pilih paket Premium (3 harga sesuai PRD)
- [ ] Integrasi payment gateway (Bank/E-Wallet/QRIS)
- [ ] Modal iklan Premium saat kuota Guest/Free habis
- [ ] Chat tanpa batas untuk Premium aktif
- [ ] Cron downgrade otomatis saat Premium expired

### Fase 3 — Fitur Premium Lanjutan
- [ ] Tombol "Gunakan" (hanya tampil untuk Premium)
- [ ] Form data diri tubuh + consent UU PDP
- [ ] Visualisasi body + rotasi 360°
- [ ] Penyesuaian acara (Ngonser, Pengajian, dll)

---

## 9. Catatan Keamanan (jangan skip saat vibe coding)

- Data tubuh (`tb`, `bb`, `ld`, `lp`, `shoulder_width`) **wajib dienkripsi at-rest**; jangan simpan plain text.
- **Jangan pernah** simpan data kartu/rekening sendiri — serahkan sepenuhnya ke payment gateway berlisensi, simpan hanya `payment_gateway_ref`.
- Endpoint `PATCH /api/user/body-data` harus menolak request jika `body_data_consent_at` belum di-set.
- Rate limit wajar (fair use) di endpoint `/api/chat/ask` untuk tier Premium agar biaya inferensi tidak membengkak tanpa batas — meski kuota "bebas", tetap pasang rate limit per menit/jam di level infrastruktur.
