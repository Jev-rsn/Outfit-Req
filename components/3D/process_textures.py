#!/usr/bin/env python3
"""
Memproses foto katalog produk asli menjadi:
1. Thumbnail UI (256x256)
2. Tekstur 3D UV untuk torso / pinggang (512x512)
3. Tekstur 3D UV untuk lengan / kaki (512x512)
4. Export data produk lengkap (dengan data URL base64 agar aman dari CORS saat dibuka via file://)
"""
import os, sys, json, base64
from io import BytesIO
from PIL import Image, ImageFilter, ImageOps, ImageEnhance
import numpy as np

PRODUCTS_DIR = 'products'
TEXTURES_DIR = 'textures'
os.makedirs(TEXTURES_DIR, exist_ok=True)

def to_base64(img, fmt='JPEG', quality=85):
    buf = BytesIO()
    img.save(buf, format=fmt, quality=quality)
    b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    mime = 'image/jpeg' if fmt.upper() in ('JPEG', 'JPG') else 'image/png'
    return f"data:{mime};base64,{b64}"

def extract_swatch(img, box):
    """Ambil potongan kain representatif dan buat seamless/tileable."""
    crop = img.crop(box)
    w, h = crop.size
    # Blend edges untuk seamless tiling
    swatch = Image.new('RGB', (w, h))
    swatch.paste(crop)
    return swatch

def process_top(filename, name, price, desc, fabric_type="cotton"):
    path = os.path.join(PRODUCTS_DIR, filename)
    img = Image.open(path).convert('RGB')
    
    # 1. Thumbnail
    thumb = img.resize((256, 256), Image.Resampling.LANCZOS)
    thumb_path = os.path.join(TEXTURES_DIR, f"{filename[:-4]}_thumb.jpg")
    thumb.save(thumb_path, quality=85)

    # 2. Extract garment center & sample fabric
    w, h = img.size
    fabric_box = (int(w*0.35), int(h*0.45), int(w*0.65), int(h*0.75))
    fabric_swatch = img.crop(fabric_box).resize((512, 512), Image.Resampling.LANCZOS)
    sleeve_path = os.path.join(TEXTURES_DIR, f"{filename[:-4]}_sleeve.jpg")
    fabric_swatch.save(sleeve_path, quality=85)

    # 3. Buat Torso Texture (512x512)
    torso = fabric_swatch.copy()
    front_crop = img.crop((int(w*0.12), int(h*0.08), int(w*0.88), int(h*0.92)))
    front_resized = front_crop.resize((360, 480), Image.Resampling.LANCZOS)
    
    mask = Image.new('L', (360, 480), 0)
    arr_mask = np.zeros((480, 360), dtype=np.float32)
    for x in range(360):
        if x < 40:
            gx = x / 40.0
        elif x > 320:
            gx = (360 - x) / 40.0
        else:
            gx = 1.0
        arr_mask[:, x] = gx * 255.0
    mask = Image.fromarray(arr_mask.astype(np.uint8)).filter(ImageFilter.GaussianBlur(8))
    
    pos_x = (512 - 360) // 2
    pos_y = 16
    torso.paste(front_resized, (pos_x, pos_y), mask)
    
    torso_path = os.path.join(TEXTURES_DIR, f"{filename[:-4]}_torso.jpg")
    torso.save(torso_path, quality=85)

    return {
        "id": filename[:-4],
        "name": name,
        "price": price,
        "desc": desc,
        "fabric_type": fabric_type,
        "thumb_url": f"textures/{filename[:-4]}_thumb.jpg",
        "torso_url": f"textures/{filename[:-4]}_torso.jpg",
        "sleeve_url": f"textures/{filename[:-4]}_sleeve.jpg",
        "thumb_b64": to_base64(thumb),
        "torso_b64": to_base64(torso),
        "sleeve_b64": to_base64(fabric_swatch)
    }

def process_bottom(filename, name, price, desc, fabric_type="denim"):
    path = os.path.join(PRODUCTS_DIR, filename)
    img = Image.open(path).convert('RGB')
    w, h = img.size

    # 1. Thumbnail
    thumb = img.resize((256, 256), Image.Resampling.LANCZOS)
    thumb_path = os.path.join(TEXTURES_DIR, f"{filename[:-4]}_thumb.jpg")
    thumb.save(thumb_path, quality=85)

    # 2. Sample kain untuk kaki
    leg_box = (int(w*0.35), int(h*0.45), int(w*0.65), int(h*0.80))
    leg_swatch = img.crop(leg_box).resize((512, 512), Image.Resampling.LANCZOS)
    leg_path = os.path.join(TEXTURES_DIR, f"{filename[:-4]}_leg.jpg")
    leg_swatch.save(leg_path, quality=85)

    # 3. Waistband & Hips Texture
    waist_crop = img.crop((int(w*0.20), int(h*0.04), int(w*0.80), int(h*0.48)))
    waist_resized = waist_crop.resize((360, 480), Image.Resampling.LANCZOS)
    
    waist = leg_swatch.copy()
    mask = Image.new('L', (360, 480), 0)
    arr_mask = np.zeros((480, 360), dtype=np.float32)
    for x in range(360):
        if x < 40:
            gx = x / 40.0
        elif x > 320:
            gx = (360 - x) / 40.0
        else:
            gx = 1.0
        arr_mask[:, x] = gx * 255.0
    mask = Image.fromarray(arr_mask.astype(np.uint8)).filter(ImageFilter.GaussianBlur(8))
    
    pos_x = (512 - 360) // 2
    waist.paste(waist_resized, (pos_x, 16), mask)

    waist_path = os.path.join(TEXTURES_DIR, f"{filename[:-4]}_waist.jpg")
    waist.save(waist_path, quality=85)

    return {
        "id": filename[:-4],
        "name": name,
        "price": price,
        "desc": desc,
        "fabric_type": fabric_type,
        "thumb_url": f"textures/{filename[:-4]}_thumb.jpg",
        "waist_url": f"textures/{filename[:-4]}_waist.jpg",
        "leg_url": f"textures/{filename[:-4]}_leg.jpg",
        "thumb_b64": to_base64(thumb),
        "waist_b64": to_base64(waist),
        "leg_b64": to_base64(leg_swatch)
    }

def main():
    print("Memproses foto katalog produk asli...")
    
    tops = [
        process_top(
            "tshirt_graphic_white.jpg",
            "Kaos Graphic Minimalist Putih",
            "Rp 149.000",
            "Katun combed 24s dengan sablon grafis geometris modern.",
            fabric_type="cotton"
        ),
        process_top(
            "flannel_red.jpg",
            "Kemeja Flanel Buffalo Merah",
            "Rp 229.000",
            "Kain flanel katun premium motif kotak merah-hitam.",
            fabric_type="flannel"
        ),
        process_top(
            "polo_navy.jpg",
            "Kaos Polo Pique Navy",
            "Rp 179.000",
            "Polo shirt katun rajut pique biru dongker dengan kancing mutiara.",
            fabric_type="pique"
        ),
        process_top(
            "tshirt_white_basic.jpg",
            "Kaos Polos Basic Putih",
            "Rp 99.000",
            "Kaos oblong putih polos combed 30s adem dan lembut.",
            fabric_type="cotton"
        )
    ]

    bottoms = [
        process_bottom(
            "jeans_blue.jpg",
            "Jeans Biru Klasik Regular Fit",
            "Rp 299.000",
            "Denim twill 13.5 oz cuci medium wash dengan aksen rivet tembaga.",
            fabric_type="denim"
        ),
        process_bottom(
            "jeans_indigo.jpg",
            "Jeans Indigo Gelap Raw Finish",
            "Rp 319.000",
            "Denim kaku raw indigo pekat dengan jahitan kontras warna emas.",
            fabric_type="denim"
        ),
        process_bottom(
            "chino_khaki.jpg",
            "Celana Chino Slim Khaki",
            "Rp 219.000",
            "Celana panjang chino katun stretch warna krem khaki kasual.",
            fabric_type="cotton"
        )
    ]

    catalog = {
        "tops": tops,
        "bottoms": bottoms
    }

    # Simpan JSON
    with open('products_catalog.json', 'w', encoding='utf-8') as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)

    # Simpan JS file agar bisa langsung di-include di HTML tanpa fetch CORS
    with open('products_catalog.js', 'w', encoding='utf-8') as f:
        f.write("/* Auto-generated product catalog with embedded base64 textures */\n")
        f.write("window.PRODUCT_CATALOG = ")
        json.dump(catalog, f, ensure_ascii=False)
        f.write(";\n")

    print("Selesai! File textures dan products_catalog.js berhasil dibuat.")

if __name__ == '__main__':
    main()
