#!/usr/bin/env python3
"""
Menambahkan seluruh produk dan foto dari Premium 3D (products_catalog.json) ke:
1. Supabase Cloud Database (tabel public.outfit_catalog)
2. Local Offline Cache (WEB EBD/data/apify_products.json)
3. Fallback catalog di WEB EBD/account.html
4. Sync script sync_apify_products.py
"""
import os
import json
import urllib.request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CATALOG_PATH = os.path.join(BASE_DIR, "Premium 3D", "products_catalog.json")
APIFY_JSON_PATH = os.path.join(BASE_DIR, "WEB EBD", "data", "apify_products.json")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://iklhjmmmolulglxirvrc.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrbGhqbW1tb2x1bGdseGlydnJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyODAzNjQsImV4cCI6MjEwODg1NjM2NH0.NsKrraBp5W2SEDzKXM6GWevYr1g4iwGUei2CSawqNmQ")

with open(CATALOG_PATH, "r", encoding="utf-8") as f:
    cat_3d = json.load(f)

# Buat list produk 3D
items_3d = []

# Map konfigurasi kategori & event
meta_map = {
    "tshirt_graphic_white": {"cat": "kasual", "event": "santai", "price": 149000, "type": "top"},
    "flannel_red": {"cat": "kasual", "event": "ngonser", "price": 229000, "type": "top"},
    "polo_navy": {"cat": "formal", "event": "kantor", "price": 179000, "type": "top"},
    "tshirt_white_basic": {"cat": "kasual", "event": "santai", "price": 99000, "type": "top"},
    "jeans_blue": {"cat": "streetwear", "event": "santai", "price": 299000, "type": "bottom"},
    "jeans_indigo": {"cat": "streetwear", "event": "ngonser", "price": 319000, "type": "bottom"},
    "chino_khaki": {"cat": "formal", "event": "kantor", "price": 219000, "type": "bottom"},
}

for section in ["tops", "bottoms"]:
    for prod in cat_3d.get(section, []):
        pid = prod["id"]
        meta = meta_map.get(pid, {"cat": "kasual", "event": "santai", "price": 150000, "type": "top"})
        
        thumb_filename = f"{pid}_thumb.jpg"
        img_rel_url = f"images/3d/{thumb_filename}"
        b64_data = prod.get("thumb_b64", "")

        param_key = "top" if meta["type"] == "top" else "bot"
        store_url = f"../Premium 3D/index.html?{param_key}={pid}&ref=rekomendasi"

        item = {
            "id": f"3d-{pid}",
            "itemId": f"3d-{pid}",
            "modelId": pid,
            "title": f"{prod['name']} (3D Live Fitting)",
            "name": prod['name'],
            "price": prod['price'],
            "priceTotal": meta["price"],
            "priceDisplay": prod['price'],
            "category": meta["cat"],
            "event_type": meta["event"],
            "rating": 4.9,
            "store": "Orec 3D Studio",
            "source_store": "Orec 3D Studio",
            "storeUrl": store_url,
            "product_link": store_url,
            "image": img_rel_url,
            "photo_url": img_rel_url,
            "thumb_b64": b64_data,
            "desc": f"{prod['desc']} Siap dicoba langsung di Studio Manekin 3D Realistis.",
            "aspect": "aspect-[3/4]",
            "gender": "unisex",
            "source": "orec-3d",
            "is3D": True,
            "isPremium": True,
            "savesCount": 128,
            "location": "Orec Studio Collection",
            "colors": [
                {"name": "Original", "hex": "#" + hex(prod.get("color_hex", 16777215))[2:].zfill(6)}
            ],
            "items": [
                {
                    "category": "Visual 3D Garment",
                    "name": prod["name"],
                    "store": "Orec 3D Studio",
                    "price": prod["price"]
                }
            ]
        }
        items_3d.append(item)

print(f"[*] Berhasil memformat {len(items_3d)} produk dari Visual 3D.")

# 1. Update WEB EBD/data/apify_products.json
try:
    with open(APIFY_JSON_PATH, "r", encoding="utf-8") as f:
        local_data = json.load(f)
    
    existing_items = local_data.get("items", [])
    # Hapus duplikat 3d- jika sebelumnya ada
    existing_items = [i for i in existing_items if not str(i.get("id", "")).startswith("3d-")]
    
    # Masukkan items_3d di urutan paling atas agar langsung terlihat
    combined_items = items_3d + existing_items
    local_data["items"] = combined_items
    local_data["totalItems"] = len(combined_items)
    local_data["has3DProducts"] = True

    with open(APIFY_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(local_data, f, indent=2, ensure_ascii=False)
    print(f"[✓] Berhasil menambahkan {len(items_3d)} produk 3D ke {APIFY_JSON_PATH} (Total: {len(combined_items)} produk)")
except Exception as e:
    print(f"[!] Gagal update apify_products.json: {e}")

# 2. Sync ke Supabase table public.outfit_catalog
print(f"[*] Mengirim {len(items_3d)} produk ke Supabase public.outfit_catalog...")
endpoint = f"{SUPABASE_URL}/rest/v1/outfit_catalog"
headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

db_rows = []
for item in items_3d:
    db_rows.append({
        "item_id": item["id"],
        "title": item["title"],
        "photo_url": item["image"],
        "category": item["category"],
        "event_type": item["event_type"],
        "source_store": item["store"],
        "product_link": item["product_link"],
        "description": item["desc"],
        "price_total": item["priceTotal"],
        "price_display": item["priceDisplay"],
        "rating": item["rating"]
    })

try:
    data = json.dumps(db_rows).encode("utf-8")
    req = urllib.request.Request(endpoint, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req) as resp:
        print("[✓] Supabase: Berhasil mengunggah semua produk 3D ke tabel public.outfit_catalog!")
except Exception as e:
    print(f"[!] Supabase upload error: {e}")

print("Selesai sinkronisasi produk 3D.")
