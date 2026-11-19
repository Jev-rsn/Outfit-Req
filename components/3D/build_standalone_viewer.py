#!/usr/bin/env python3
"""
Membangun gunakan-viewer (1).html mandiri (self-contained):
- Data produk dan tekstur foto asli di-embed langsung (bebas masalah CORS file://)
- Warna primer pakaian di-set eksplisit sehingga perubahan warna dan tekstur terlihat seketika
- material.needsUpdate dan map.needsUpdate di-flag agar WebGL langsung merefleksikan perubahan
"""
import os, json

with open('products_catalog.json', 'r', encoding='utf-8') as f:
    catalog = json.load(f)

# Tambahkan warna dasar representatif untuk tiap produk
top_colors = {
    "tshirt_graphic_white": 0xf4f4f4,
    "flannel_red": 0x7a1e28,
    "polo_navy": 0x172238,
    "tshirt_white_basic": 0xffffff
}

bot_colors = {
    "jeans_blue": 0x3d5d82,
    "jeans_indigo": 0x1a263b,
    "chino_khaki": 0xc5b498
}

for t in catalog['tops']:
    t['color_hex'] = top_colors.get(t['id'], 0xffffff)

for b in catalog['bottoms']:
    b['color_hex'] = bot_colors.get(b['id'], 0x333333)

with open('products_catalog.json', 'w', encoding='utf-8') as f:
    json.dump(catalog, f, ensure_ascii=False, indent=2)

print("Katalog produk diperbarui dengan color_hex.")
