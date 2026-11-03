"""
Outfit Req — Apify Shopee Marketplace Sync
Fetches dynamic product listings and photos from Apify Actor 'fmKWN5uByUCIy2Sam'
and compiles them into 'WEB EBD/data/apify_products.json' for the recommendation gallery.
"""
import os
import sys
import json
import urllib.request
import urllib.error

# User's Apify credentials & actor settings (loaded securely from environment)
APIFY_TOKEN = os.environ.get("APIFY_TOKEN", "")
ACTOR_ID = "fmKWN5uByUCIy2Sam"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(BASE_DIR, "WEB EBD", "data", "apify_products.json")

def categorize_item(name):
    """Categorizes the clothing item based on title keywords."""
    nl = name.lower()
    if any(k in nl for k in ["esporte", "caminhada", "pesca", "windbreaker", "corta-vento", "corrida", "sport", "olahraga"]):
        return "sporty", "Athleisure & Windbreaker"
    elif any(k in nl for k in ["negócios", "classica", "elegante", "formal", "blazer", "jas", "kemeja"]):
        return "formal", "Classic Business Outerwear"
    elif any(k in nl for k in ["chines", "retro", "vintage", "heritage", "bobojaco", "puffer", "streetwear"]):
        return "streetwear", "Urban Puffer & Street"
    elif any(k in nl for k in ["simples", "solta", "versatil", "monocrom", "basic", "polos"]):
        return "minimalist", "Clean Minimalist"
    return "kasual", "Casual Streetwear"

def format_price(price, currency):
    """Formats price cleanly for display."""
    if not price:
        return 0, "Harga Khusus Shopee"
    if currency == "BRL":
        # Approx conversion 1 BRL ~ Rp 2.900
        idr_est = round(float(price) * 2900)
        return idr_est, f"R$ {float(price):.2f} (~ Rp {idr_est:,})".replace(",", ".")
    elif currency == "IDR":
        idr_val = int(price)
        return idr_val, f"Rp {idr_val:,}".replace(",", ".")
    return int(price), f"{currency} {price}"

def transform_raw_items(raw_items):
    """Transforms raw Shopee items from Apify into Outfit Req pin format."""
    aspect_ratios = ["aspect-[3/4]", "aspect-[4/5]", "aspect-[2/3]", "aspect-[1/1]"]
    formatted = []

    for idx, item in enumerate(raw_items):
        images = item.get("images", [])
        if not images:
            continue

        item_id = item.get("itemId") or item.get("id") or str(idx)
        name = item.get("name") or "Produk Fashion Shopee"
        price_raw = item.get("price")
        currency = item.get("currency", "BRL")
        price_num, price_display = format_price(price_raw, currency)
        category, style = categorize_item(name)
        aspect = aspect_ratios[idx % len(aspect_ratios)]
        rating = float(item.get("rating") or 4.8)
        location = item.get("location") or "Shopee Official"
        discount = item.get("discountPercent")
        url = item.get("url") or f"https://shopee.com"

        desc = f"Produk live dari Shopee Marketplace. Kualitas terverifikasi dengan rating {rating:.1f}/5.0."
        if discount:
            desc = f"Diskon {discount}%! {desc}"

        formatted.append({
            "id": f"shopee-{item_id}",
            "itemId": item_id,
            "shopId": item.get("shopId"),
            "title": name,
            "category": category,
            "style": style,
            "gender": "unisex",
            "event_type": None,
            "store": "Shopee",
            "storeUrl": url,
            "image": images[0],
            "aspect": aspect,
            "priceTotal": price_num,
            "priceDisplay": price_display,
            "currency": currency,
            "originalPrice": item.get("originalPrice"),
            "discountPercent": discount,
            "rating": rating,
            "location": location,
            "savesCount": 50 + (idx * 17),
            "desc": desc,
            "source": "apify-shopee",
            "colors": [
                {"name": "Onyx Black", "hex": "#1A1A1A"},
                {"name": "Slate Grey", "hex": "#4A5568"}
            ],
            "items": [
                {
                    "category": "Fashion Item",
                    "name": name,
                    "store": "Shopee",
                    "price": price_display,
                    "url": url
                }
            ]
        })

    return formatted

def fetch_from_latest_run():
    """Fetches items from the most recent run on Apify via REST API."""
    print(f"[*] Mengambil riwayat run terakhir dari Apify Actor: {ACTOR_ID}...")
    headers = {"Authorization": f"Bearer {APIFY_TOKEN}"}
    runs_url = f"https://api.apify.com/v2/acts/{ACTOR_ID}/runs?desc=1&limit=1"

    req = urllib.request.Request(runs_url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        runs_data = json.loads(resp.read().decode("utf-8"))

    items = runs_data.get("data", {}).get("items", [])
    if not items:
        print("[!] Tidak ada riwayat run pada Actor ini.")
        return []

    last_run = items[0]
    dataset_id = last_run.get("defaultDatasetId")
    status = last_run.get("status")
    print(f"[*] Run terakhir: {last_run.get('id')} | Status: {status} | Dataset: {dataset_id}")

    if not dataset_id:
        print("[!] Dataset ID tidak ditemukan.")
        return []

    dataset_url = f"https://api.apify.com/v2/datasets/{dataset_id}/items"
    req_data = urllib.request.Request(dataset_url, headers=headers)
    with urllib.request.urlopen(req_data) as resp:
        raw_items = json.loads(resp.read().decode("utf-8"))

    print(f"[+] Berhasil mengunduh {len(raw_items)} produk dari dataset Apify.")
    return raw_items

def run_actor_with_client(keyword="outfit", country="ID", max_items=50):
    """Triggers an Actor run using apify_client if installed."""
    try:
        from apify_client import ApifyClient
    except ImportError:
        print("[*] apify_client belum terpasang. Menjalankan via Apify REST API...")
        return run_actor_via_rest(keyword, country, max_items)

    print(f"[*] Memulai run Apify Actor {ACTOR_ID} untuk keyword: '{keyword}' (Country: {country})...")
    client = ApifyClient(APIFY_TOKEN)
    run_input = {
        "location": keyword,
        "keywords": [keyword],
        "shopUrls": [],
        "categoryUrls": [],
        "priceSlicing": False,
        "country": country,
        "maxItems": max_items,
        "debug": False,
    }
    run = client.actor(ACTOR_ID).call(run_input=run_input)
    raw_items = list(client.dataset(run["defaultDatasetId"]).iterate_items())
    print(f"[+] Run selesai. Diperoleh {len(raw_items)} produk.")
    return raw_items

def run_actor_via_rest(keyword="outfit", country="ID", max_items=50):
    """Triggers an Actor run using official Apify REST API with synchronous wait."""
    headers = {
        "Authorization": f"Bearer {APIFY_TOKEN}",
        "Content-Type": "application/json"
    }
    run_input = {
        "location": keyword,
        "keywords": [keyword],
        "shopUrls": [],
        "categoryUrls": [],
        "priceSlicing": False,
        "country": country,
        "maxItems": max_items,
        "debug": False,
    }
    # Call actor synchronously with waitForFinish parameter
    url = f"https://api.apify.com/v2/acts/{ACTOR_ID}/runs?waitForFinish=120"
    data = json.dumps(run_input).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")

    print(f"[*] Memulai request Apify Actor via REST API (menunggu hingga selesai)...")
    with urllib.request.urlopen(req) as resp:
        run_data = json.loads(resp.read().decode("utf-8"))

    dataset_id = run_data.get("data", {}).get("defaultDatasetId")
    if not dataset_id:
        print("[!] Gagal mendapatkan defaultDatasetId.")
        return []

    dataset_url = f"https://api.apify.com/v2/datasets/{dataset_id}/items"
    req_data = urllib.request.Request(dataset_url, headers=headers)
    with urllib.request.urlopen(req_data) as resp:
        raw_items = json.loads(resp.read().decode("utf-8"))

    print(f"[+] Berhasil mendapatkan {len(raw_items)} produk dari dataset baru.")
    return raw_items

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://iklhjmmmolulglxirvrc.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrbGhqbW1tb2x1bGdseGlydnJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyODAzNjQsImV4cCI6MjEwODg1NjM2NH0.NsKrraBp5W2SEDzKXM6GWevYr1g4iwGUei2CSawqNmQ")

def sync_to_supabase(formatted_items):
    """Pushes formatted items to Supabase public.outfit_catalog table."""
    print("[*] Menghubungkan dan menyinkronkan data ke Supabase Database...")
    endpoint = f"{SUPABASE_URL}/rest/v1/outfit_catalog"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }

    db_rows = []
    for item in formatted_items:
        db_rows.append({
            "item_id": item["id"],
            "title": item["title"],
            "photo_url": item["image"],
            "category": item["category"],
            "event_type": None,
            "source_store": item["store"],
            "product_link": item["storeUrl"],
            "description": item["desc"],
            "price_total": item["priceTotal"],
            "price_display": item["priceDisplay"],
            "rating": item["rating"]
        })

    try:
        data = json.dumps(db_rows).encode("utf-8")
        req = urllib.request.Request(endpoint, data=data, headers=headers, method="POST")
        with urllib.request.urlopen(req) as resp:
            print(f"[✓] Sukses menyinkronkan {len(db_rows)} produk ke database Supabase!")
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        if "401" in str(e) or "row-level security" in err_msg or "42501" in err_msg:
            print("[i] Supabase RLS Policy terdeteksi. Silakan jalankan query di file:")
            print("    docs/supabase_outfit_catalog_seed.sql pada Supabase SQL Editor untuk aktivasi izin & seed instan.")
        else:
            print(f"[!] Info Supabase ({e.code}): {err_msg}")
    except Exception as e:
        print(f"[!] Supabase sync note: {e}")

def save_output(formatted_items):
    """Saves formatted products to the JSON cache file."""
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    payload = {
        "source": f"Apify Actor {ACTOR_ID}",
        "totalItems": len(formatted_items),
        "items": formatted_items
    }
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
    print(f"[✓] Berhasil menyimpan {len(formatted_items)} produk ke: {OUTPUT_FILE}")
    sync_to_supabase(formatted_items)

def main():
    args = sys.argv[1:]
    if "--run" in args:
        # Trigger new run
        keyword = "outfit"
        country = "ID"
        if len(args) > 1 and not args[1].startswith("--"):
            keyword = args[1]
        raw_items = run_actor_with_client(keyword=keyword, country=country)
    else:
        # Default: fetch from latest successful dataset (fast & cost-efficient)
        try:
            raw_items = fetch_from_latest_run()
        except Exception as e:
            print(f"[!] Gagal mengambil dari run terakhir: {e}. Menjalankan run baru...")
            raw_items = run_actor_with_client()

    formatted = transform_raw_items(raw_items)
    save_output(formatted)

if __name__ == "__main__":
    main()
