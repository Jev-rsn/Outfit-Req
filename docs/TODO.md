# Roadmap Pengembangan & Tracker Revisi

Terakhir diperbarui: **27 November 2026**

## Target & Deadline Utama

| No | Tugas / Pengembangan | Target Detail | Deadline | Status |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Pengembangan Database | Input & strukturisasi 500 data | **29 Nov 2026** | Proses |
| 2 | Fitur 3D Produk | Integrasi model/tampilan 3D per produk | **1 Des 2026** | Belum |
| 3 | Fitur Payment | Integrasi pembayaran sementara (non-gateway) | - | Terkendala |

---

## Checklist Harian (Klik untuk Update Progress)

### Target 29 November 2026 — Database (500 Data)
- [ ] Finalisasi skema tabel & relasi database
- [ ] Migrasi/input batch 1 (Data 1–250)
- [ ] Migrasi/input batch 2 (Data 251–500)
- [ ] Validasi duplikasi dan integritas 500 data

### Target 1 Desember 2026 — Fitur 3D Produk
- [ ] Optimasi ukuran aset/tekstur 3D agar ringan di web
- [ ] Hubungkan masing-masing aset 3D ke ID produk di database
- [ ] Uji coba render & rotasi 3D di tampilan desktop dan mobile

---

## Kendala & Catatan Teknis (Blockers)
- **Payment Gateway Tertunda:** Fitur pembayaran belum bisa menggunakan *payment gateway* otomatis karena dokumen legalitas usaha belum tersedia.
  - **Solusi Sementara / Workaround:** Gunakan metode pembayaran manual (transfer bank / QRIS statis + unggah bukti pembayaran atau konfirmasi via WhatsApp) sembari menyiapkan dokumen legalitas.
