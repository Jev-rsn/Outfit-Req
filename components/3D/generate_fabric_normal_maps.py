#!/usr/bin/env python3
"""
Generate realistic fabric normal maps and cloth wrinkle maps:
- fabric_denim_normal.jpg (diagonal twill weave)
- fabric_cotton_normal.jpg (jersey combed cotton)
- fabric_pique_normal.jpg (honeycomb polo knit)
- fabric_flannel_normal.jpg (brushed wool/flannel)
- top_wrinkles_normal.jpg (organic drape folds, side seams, collar hem)
- pants_wrinkles_normal.jpg (crotch whiskering, pocket seams, knee break, ankle stacks)
"""
import os, math, json, base64
from io import BytesIO
import numpy as np
from PIL import Image, ImageFilter

TEXTURES_DIR = 'textures'
os.makedirs(TEXTURES_DIR, exist_ok=True)

def height_to_normal(height, strength=1.5):
    """Konversi array 2D heightmap menjadi normal map RGB (tangent space)."""
    h, w = height.shape
    # Sobel / central difference
    dx = (np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)) * 0.5
    dy = (np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)) * 0.5
    
    nx = -dx * strength
    ny = -dy * strength
    nz = np.ones_like(nx)
    
    length = np.sqrt(nx*nx + ny*ny + nz*nz)
    nx /= length
    ny /= length
    nz /= length
    
    r = ((nx * 0.5 + 0.5) * 255).astype(np.uint8)
    g = (((-ny) * 0.5 + 0.5) * 255).astype(np.uint8) # Y-up (OpenGL standard)
    b = ((nz * 0.5 + 0.5) * 255).astype(np.uint8)
    
    return np.dstack([r, g, b])

def to_base64_jpg(img, quality=85):
    buf = BytesIO()
    img.save(buf, format='JPEG', quality=quality)
    b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    return f"data:image/jpeg;base64,{b64}"

def make_denim_twill(size=512):
    """Denim 3x1 right-hand twill weave dengan variasi benang kasar."""
    y, x = np.mgrid[0:size, 0:size]
    # Diagonal twill pattern (45 degrees)
    diag = (x * 2 + y) % 8
    twill = np.where(diag < 5, 0.7, 0.2).astype(np.float32)
    # Slub yarn variation (benang tidak beraturan)
    np.random.seed(42)
    slub_x = np.random.normal(0, 0.08, (size, size))
    slub_y = np.random.normal(0, 0.05, (size, size))
    h = twill + slub_x + slub_y
    # Smooth slightly
    img = Image.fromarray((h * 127).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    h_smooth = np.array(img, dtype=np.float32) / 127.0
    nmap = height_to_normal(h_smooth, strength=1.2)
    return Image.fromarray(nmap)

def make_cotton_jersey(size=512):
    """Combed cotton jersey micro-knit loops."""
    y, x = np.mgrid[0:size, 0:size]
    loop = np.sin(x * math.pi / 2.5) * np.cos(y * math.pi / 3.0) * 0.4
    noise = np.random.normal(0, 0.08, (size, size))
    h = loop + noise
    img = Image.fromarray(((h + 1) * 100).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))
    h_smooth = np.array(img, dtype=np.float32) / 100.0
    nmap = height_to_normal(h_smooth, strength=0.8)
    return Image.fromarray(nmap)

def make_pique_knit(size=512):
    """Pique waffle / honeycomb knit untuk polo shirt."""
    y, x = np.mgrid[0:size, 0:size]
    honeycomb = (np.sin(x * math.pi / 4.0) * np.sin(y * math.pi / 4.0) +
                 np.cos(x * math.pi / 4.0 + math.pi/4) * np.cos(y * math.pi / 4.0 + math.pi/4)) * 0.5
    noise = np.random.normal(0, 0.06, (size, size))
    h = honeycomb + noise
    img = Image.fromarray(((h + 1) * 100).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.9))
    h_smooth = np.array(img, dtype=np.float32) / 100.0
    nmap = height_to_normal(h_smooth, strength=1.4)
    return Image.fromarray(nmap)

def make_flannel_brushed(size=512):
    """Kain flanel lembut berbulu halus (napped fiber)."""
    np.random.seed(101)
    noise1 = np.random.normal(0, 0.15, (size, size))
    y, x = np.mgrid[0:size, 0:size]
    weave = (np.sin(x * math.pi / 3.0) + np.sin(y * math.pi / 3.0)) * 0.25
    h = weave + noise1
    img = Image.fromarray(((h + 1) * 100).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    h_smooth = np.array(img, dtype=np.float32) / 100.0
    nmap = height_to_normal(h_smooth, strength=0.9)
    return Image.fromarray(nmap)

def make_top_wrinkles(size=512):
    """
    Lipatan baju organik (organic cloth wrinkles):
    - Kerutan tarikan di dada & ketiak
    - Lipatan kompresi horizontal di pinggang
    - Jahitan samping dan kelim bawah (hem)
    """
    h_map = np.zeros((size, size), dtype=np.float32)
    y, x = np.mgrid[0:size, 0:size]
    
    # 1. Kelim bawah baju (bottom hem rim) di y=490..512
    hem = np.where(y > 485, np.sin((y - 485) / 27.0 * math.pi) * 0.4, 0.0)
    h_map += hem
    
    # 2. Kerutan kompresi pinggang (y=380..470)
    # Lipatan horizontal melengkung halus
    w_folds = np.sin((y - 400) / 14.0) * np.exp(-((y - 425) / 50.0)**2) * 0.25
    # Variasi lateral
    w_var = np.cos(x / 40.0) * 0.5 + 0.5
    h_map += w_folds * w_var
    
    # 3. Tarikan diagonal dari ketiak ke dada (armpit to chest pull lines)
    # Sisi kiri (x=80..180, y=150..320)
    pull_left = np.sin((x * 0.7 - y * 0.4) / 12.0) * np.exp(-((x - 120)**2 + (y - 230)**2) / (70.0**2)) * 0.3
    # Sisi kanan (x=332..432, y=150..320)
    pull_right = np.sin((-x * 0.7 - y * 0.4) / 12.0) * np.exp(-((x - 392)**2 + (y - 230)**2) / (70.0**2)) * 0.3
    h_map += pull_left + pull_right
    
    # 4. Jahitan samping (side seams) di x=20..35 dan x=477..492
    seam_l = np.exp(-((x - 28) / 4.0)**2) * 0.35
    seam_r = np.exp(-((x - 484) / 4.0)**2) * 0.35
    h_map += seam_l + seam_r
    
    # 5. Kerutan dada halus (chest gravity drape)
    drape = np.sin(y / 28.0) * np.exp(-((x - 256) / 140.0)**2) * np.exp(-((y - 260) / 90.0)**2) * 0.18
    h_map += drape
    
    # Haluskan normal map agar terlihat seperti kain sungguhan
    img = Image.fromarray(((h_map + 1) * 100).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.8))
    h_smooth = np.array(img, dtype=np.float32) / 100.0
    nmap = height_to_normal(h_smooth, strength=1.8)
    return Image.fromarray(nmap)

def make_pants_wrinkles(size=512):
    """
    Lipatan celana jeans / chino (denim whiskers & crease):
    - Whiskers (kumis lipatan) diagonal di area selangkangan/pinggul
    - Garis resleting dan kancing
    - Jahitan saku samping
    - Lipatan lutut dan stacking bawah
    """
    h_map = np.zeros((size, size), dtype=np.float32)
    y, x = np.mgrid[0:size, 0:size]
    
    # 1. Ban pinggang (waistband) di y=10..55
    waistband = np.where((y > 15) & (y < 50), 0.35, 0.0)
    waistband_edge = np.exp(-((y - 50) / 3.0)**2) * 0.4
    h_map += waistband + waistband_edge
    
    # 2. Resleting / fly di tengah x=256, y=55..180
    fly = np.exp(-((x - 256) / 6.0)**2) * np.where((y > 50) & (y < 190), 0.45, 0.0)
    # Jahitan lengkung J-stitch resleting
    j_stitch = np.exp(-((x - (256 + 18)) / 4.0)**2) * np.where((y > 55) & (y < 165), 0.25, 0.0)
    h_map += fly + j_stitch
    
    # 3. Whiskers (lipatan diagonal denim) di paha atas y=140..280
    whisker_l = (np.sin((x * 0.5 + y * 0.8) / 11.0) * 0.3 *
                 np.exp(-((x - 170)**2 + (y - 200)**2) / (75.0**2)))
    whisker_r = (np.sin((-x * 0.5 + y * 0.8) / 11.0) * 0.3 *
                 np.exp(-((x - 342)**2 + (y - 200)**2) / (75.0**2)))
    h_map += whisker_l + whisker_r
    
    # 4. Saku depan (curved pocket opening)
    pocket_l = np.exp(-(( (x - 90)**2 + (y - 80)**2 - 40**2 ) / 120.0)**2) * 0.3
    pocket_r = np.exp(-(( (x - 422)**2 + (y - 80)**2 - 40**2 ) / 120.0)**2) * 0.3
    h_map += pocket_l + pocket_r
    
    # 5. Lipatan horizontal di paha / lutut
    knee_folds = np.sin(y / 15.0) * np.exp(-((y - 360) / 60.0)**2) * 0.22
    h_map += knee_folds
    
    img = Image.fromarray(((h_map + 1) * 100).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.8))
    h_smooth = np.array(img, dtype=np.float32) / 100.0
    nmap = height_to_normal(h_smooth, strength=2.0)
    return Image.fromarray(nmap)

def main():
    print("Membuat normal maps fabric & wrinkles realistis...")
    
    denim = make_denim_twill(512)
    cotton = make_cotton_jersey(512)
    pique = make_pique_knit(512)
    flannel = make_flannel_brushed(512)
    top_wrinkles = make_top_wrinkles(512)
    pants_wrinkles = make_pants_wrinkles(512)
    
    denim.save(os.path.join(TEXTURES_DIR, "fabric_denim_normal.jpg"), quality=90)
    cotton.save(os.path.join(TEXTURES_DIR, "fabric_cotton_normal.jpg"), quality=90)
    pique.save(os.path.join(TEXTURES_DIR, "fabric_pique_normal.jpg"), quality=90)
    flannel.save(os.path.join(TEXTURES_DIR, "fabric_flannel_normal.jpg"), quality=90)
    top_wrinkles.save(os.path.join(TEXTURES_DIR, "top_wrinkles_normal.jpg"), quality=90)
    pants_wrinkles.save(os.path.join(TEXTURES_DIR, "pants_wrinkles_normal.jpg"), quality=90)
    
    # Simpan dalam JS dictionary base64 agar aman tanpa CORS
    normal_assets = {
        "fabric_denim": to_base64_jpg(denim),
        "fabric_cotton": to_base64_jpg(cotton),
        "fabric_pique": to_base64_jpg(pique),
        "fabric_flannel": to_base64_jpg(flannel),
        "top_wrinkles": to_base64_jpg(top_wrinkles),
        "pants_wrinkles": to_base64_jpg(pants_wrinkles)
    }
    
    with open('fabric_normals.js', 'w', encoding='utf-8') as f:
        f.write("/* Auto-generated fabric normal maps */\n")
        f.write("window.FABRIC_NORMALS = ")
        json.dump(normal_assets, f)
        f.write(";\n")
        
    print("Selesai! Normal maps tersimpan di textures/ dan fabric_normals.js")

if __name__ == '__main__':
    main()
