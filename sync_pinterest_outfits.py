#!/usr/bin/env python3
"""
Outfit Req — Pinterest Outfit Database Sync Engine (Regular/Free Tier)
Menambahkan dan menyinkronkan database outfit inspirasi dari Pinterest untuk bagian BIASA (Non-Premium) ke:
  1. Local Cache: 'WEB EBD/data/pinterest_outfits.json'
  2. Merged Cache: 'WEB EBD/data/apify_products.json' (agar langsung tampil di rekomendasi.html & personality.html)
  3. Supabase Cloud Database: tabel 'public.outfit_catalog'
  4. SQL Seed File: 'docs/supabase_pinterest_catalog_seed.sql'
"""

import os
import sys
import json
import re
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Baca .env jika ada
ENV_FILE = os.path.join(BASE_DIR, ".env")
if os.path.exists(ENV_FILE):
    with open(ENV_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                k, v = k.strip(), v.strip().strip('"').strip("'")
                if not os.environ.get(k):
                    os.environ[k] = v

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY", "")

OUTPUT_PINTEREST_FILE = os.path.join(BASE_DIR, "WEB EBD", "data", "pinterest_outfits.json")
OUTPUT_APIFY_FILE = os.path.join(BASE_DIR, "WEB EBD", "data", "apify_products.json")
OUTPUT_SQL_FILE = os.path.join(BASE_DIR, "docs", "supabase_pinterest_catalog_seed.sql")

# Katalog Lengkap Inspirasi Outfit Pinterest Khusus Bagian BIASA (Non-Premium)
# Mencakup 11 Kategori Gaya Fashion: Kasual, Smart Casual, Formal, Streetwear, Minimalist, Old Money, Outerwear, Hijab, Pantai, Pesta, Sporty
PINTEREST_CURATED_OUTFITS = [
    # 1. KASUAL (Everyday Casual & Weekend)
    {
        "id": "pinterest-kasual-01",
        "pin_id": "984388431034101",
        "title": "French Casual Linen Shirt & Straight Khaki Chinos",
        "category": "kasual",
        "event_type": "santai",
        "style": "Everyday Relaxed Casual",
        "gender": "unisex",
        "image": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80",
        "aspect": "aspect-[3/4]",
        "priceTotal": 249000,
        "priceDisplay": "Inspirasi Pinterest (~ Rp 249.000)",
        "rating": 4.9,
        "savesCount": 1420,
        "desc": "Kombinasi kemeja katun linen bernapas potongan santai dipadukan celana chino lurus warna khaki natural. Sempurna untuk kopi santai akhir pekan atau jalan sore.",
        "pin_url": "https://www.pinterest.com/search/pins/?q=french+casual+linen+shirt+men+women",
        "colors": [{"name": "Warm Sand", "hex": "#D8C4B6"}, {"name": "Off White", "hex": "#F5F5F0"}, {"name": "Olive Slate", "hex": "#4F5D54"}],
        "items": [
            {"category": "Atasan", "name": "Relaxed French Linen Shirt", "store": "Pinterest Curation", "price": "Rp 149.000"},
            {"category": "Bawahan", "name": "Straight Leg Khaki Chinos", "store": "Pinterest Curation", "price": "Rp 100.000"}
        ]
    },
    {
        "id": "pinterest-kasual-02",
        "pin_id": "984388431034102",
        "title": "Minimalist Crewneck Boxy Tee & Relaxed Washed Denim",
        "category": "kasual",
        "event_type": "santai",
        "style": "Clean Weekend Casual",
        "gender": "unisex",
        "image": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80",
        "aspect": "aspect-[4/5]",
        "priceTotal": 199000,
        "priceDisplay": "Inspirasi Pinterest (~ Rp 199.000)",
        "rating": 4.8,
        "savesCount": 980,
        "desc": "Kaos katun berat (heavyweight 220gsm) berpotongan boxy bersih berpasangan dengan celana denim washed biru terang potongan regular fit.",
        "pin_url": "https://www.pinterest.com/search/pins/?q=boxy+tee+relaxed+denim+casual+outfit",
        "colors": [{"name": "Milk White", "hex": "#F9F9F6"}, {"name": "Medium Wash Denim", "hex": "#5B7C99"}, {"name": "Charcoal", "hex": "#2F3136"}],
        "items": [
            {"category": "Atasan", "name": "Heavyweight Boxy Tee 220gsm", "store": "Pinterest Curation", "price": "Rp 99.000"},
            {"category": "Bawahan", "name": "Relaxed Light-Wash Jeans", "store": "Pinterest Curation", "price": "Rp 100.000"}
        ]
    },
    {
        "id": "pinterest-kasual-03",
        "pin_id": "984388431034103",
        "title": "Waffle Knit Polo & Olive Fatigue Shorts",
        "category": "kasual",
        "event_type": "santai",
        "style": "Summer Texture Casual",
        "gender": "unisex",
        "image": "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=800&q=80",
        "aspect": "aspect-[3/4]",
        "priceTotal": 215000,
        "priceDisplay": "Inspirasi Pinterest (~ Rp 215.000)",
        "rating": 4.9,
        "savesCount": 1130,
        "desc": "Polo knit bertekstur waffle warna oatmeal dengan aksen kancing tanduk, dipadukan celana pendek katun ripstop warna olive green.",
        "pin_url": "https://www.pinterest.com/search/pins/?q=waffle+knit+polo+olive+shorts",
        "colors": [{"name": "Oatmeal Beige", "hex": "#D7C9B1"}, {"name": "Army Olive", "hex": "#4B5320"}, {"name": "Bone", "hex": "#EDE8D0"}],
        "items": [
            {"category": "Atasan", "name": "Open-Collar Waffle Polo", "store": "Pinterest Curation", "price": "Rp 120.000"},
            {"category": "Bawahan", "name": "Olive Fatigue Pocket Shorts", "store": "Pinterest Curation", "price": "Rp 95.000"}
        ]
    },

    # 2. SMART CASUAL (Office, Work & College)
    {
        "id": "pinterest-smartcasual-01",
        "pin_id": "984388431034201",
        "title": "Deconstructed Unlined Blazer & Pleated Ankle Trousers",
        "category": "smartcasual",
        "event_type": "kantor",
        "style": "Contemporary Smart Casual",
        "gender": "unisex",
        "image": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80",
        "aspect": "aspect-[3/4]",
        "priceTotal": 389000,
        "priceDisplay": "Inspirasi Pinterest (~ Rp 389.000)",
        "rating": 4.9,
        "savesCount": 2150,
        "desc": "Blazer tanpa furing yang luwes berbahan linen-blend warna sage grey dipadukan celana bahan berlipit satu (single pleat) di atas mata kaki.",
        "pin_url": "https://www.pinterest.com/search/pins/?q=deconstructed+blazer+smart+casual+outfit",
        "colors": [{"name": "Sage Grey", "hex": "#8A9A86"}, {"name": "Charcoal Black", "hex": "#1F2124"}, {"name": "Chalk White", "hex": "#F4F4F4"}],
        "items": [
            {"category": "Outerwear", "name": "Unstructured Linen-Cotton Blazer", "store": "Pinterest Curation", "price": "Rp 239.000"},
            {"category": "Bawahan", "name": "Single Pleat Tapered Trousers", "store": "Pinterest Curation", "price": "Rp 150.000"}
        ]
    },
    {
        "id": "pinterest-smartcasual-02",
        "pin_id": "984388431034202",
        "title": "Ribbed Knit Cardigan & Tapered Navy Chinos",
        "category": "smartcasual",
        "event_type": "kantor",
        "style": "Soft Tailoring Smart Casual",
        "gender": "unisex",
        "image": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80",
        "aspect": "aspect-[4/5]",
        "priceTotal": 310000,
        "priceDisplay": "Inspirasi Pinterest (~ Rp 310.000)",
        "rating": 4.8,
        "savesCount": 1640,
        "desc": "Cardigan rajut warna krem berkerah v-neck halus di atas kaos polos katun putih, diimbangi bawahan chino navy berpola tapered rapi.",
        "pin_url": "https://www.pinterest.com/search/pins/?q=knit+cardigan+smart+casual+mens+womens",
        "colors": [{"name": "Butter Cream", "hex": "#EFE8D8"}, {"name": "Deep Navy", "hex": "#1B2A4A"}, {"name": "Espresso Brown", "hex": "#3E2723"}],
        "items": [
            {"category": "Atasan", "name": "Fine Ribbed Button Cardigan", "store": "Pinterest Curation", "price": "Rp 160.000"},
            {"category": "Bawahan", "name": "Navy Smart Ankle Chinos", "store": "Pinterest Curation", "price": "Rp 150.000"}
        ]
    },
    {
        "id": "pinterest-smartcasual-03",
        "pin_id": "984388431034203",
        "title": "Oxford Cloth Button-Down & Tailored Mocha Slacks",
        "category": "smartcasual",
        "event_type": "kuliah",
        "style": "Ivy Academic Smart Casual",
        "gender": "unisex",
        "image": "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=800&q=80",
        "aspect": "aspect-[2/3]",
        "priceTotal": 289000,
        "priceDisplay": "Inspirasi Pinterest (~ Rp 289.000)",
        "rating": 4.9,
        "savesCount": 1820,
        "desc": "Kemeja oxford katun klasik biru muda dengan kerah roll button-down yang berkarakter, dipadukan celana slacks berpotongan lurus warna mocha hangat.",
        "pin_url": "https://www.pinterest.com/search/pins/?q=oxford+shirt+brown+trousers+aesthetic",
        "colors": [{"name": "Powder Blue", "hex": "#A0C4DF"}, {"name": "Warm Mocha", "hex": "#735340"}, {"name": "Tan Leather", "hex": "#A26E49"}],
        "items": [
            {"category": "Atasan", "name": "Classic Heavy Oxford Shirt", "store": "Pinterest Curation", "price": "Rp 139.000"},
            {"category": "Bawahan", "name": "Tailored Mocha Wool-Touch Slacks", "store": "Pinterest Curation", "price": "Rp 150.000"}
        ]
    },

    # 3. STREETWEAR (Urban, Y2K & Harajuku)
    {
        "id": "pinterest-streetwear-01",
        "pin_id": "984388431034301",
        "title": "Oversized Vintage Acid-Wash Tee & Multi-Pocket Cargos",
        "category": "streetwear",
        "event_type": "ngonser",
        "style": "Tokyo Urban Streetwear",
        "gender": "unisex",
        "image": "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80",
        "aspect": "aspect-[3/4]",
        "priceTotal": 299000,
        "priceDisplay": "Inspirasi Pinterest (~ Rp 299.000)",
        "rating": 4.9,
        "savesCount": 3410,
        "desc": "Kaos sablon grafis retro faded wash berpotongan drop-shoulder lebar dengan celana cargo multi-pocket berbahan parasut tebal yang tangguh.",
        "pin_url": "https://www.pinterest.com/search/pins/?q=oversized+tee+cargo+pants+streetwear+aesthetic",
        "colors": [{"name": "Washed Anthracite", "hex": "#2B2B2A"}, {"name": "Dark Olive Cargo", "hex": "#3D4436"}, {"name": "Neon Acent", "hex": "#CEFF00"}],
        "items": [
            {"category": "Atasan", "name": "Faded Wash Vintage Graphic Tee", "store": "Pinterest Curation", "price": "Rp 129.000"},
            {"category": "Bawahan", "name": "Multi-Pocket Parachute Cargos", "store": "Pinterest Curation", "price": "Rp 170.000"}
        ]
    },
    {
        "id": "pinterest-streetwear-02",
        "pin_id": "984388431034302",
        "title": "Heavyweight Hoodie & Baggy Skate Denim",
        "category": "streetwear",
        "event_type": "ngonser",
        "style": "90s Retro Skate Streetwear",
        "gender": "unisex",
        "image": "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=800&q=80",
        "aspect": "aspect-[4/5]",
        "priceTotal": 359000,
        "priceDisplay": "Inspirasi Pinterest (~ Rp 359.000)",
        "rating": 4.9,
        "savesCount": 2890,
        "desc": "Hoodie katun fleece 330gsm bersiluet kokoh dan jatuh natural, berpadu sempurna dengan celana baggy jeans biru pudar khas kultur skate 90-an.",
        "pin_url": "https://www.pinterest.com/search/pins/?q=heavyweight+hoodie+baggy+jeans+aesthetic",
        "colors": [{"name": "Heather Grey", "hex": "#B0B3B8"}, {"name": "Vintage Fade Blue", "hex": "#768DA1"}, {"name": "Jet Black", "hex": "#111111"}],
        "items": [
            {"category": "Atasan", "name": "Structured Fleece Heavy Hoodie", "store": "Pinterest Curation", "price": "Rp 189.000"},
            {"category": "Bawahan", "name": "Wide Baggy Carpenter Denim", "store": "Pinterest Curation", "price": "Rp 170.000"}
        ]
    },
    {
        "id": "pinterest-streetwear-03",
        "pin_id": "984388431034303",
        "title": "Cropped Utility Windbreaker & Wide Parachute Pants",
        "category": "streetwear",
        "event_type": "santai",
        "style": "Techwear Minimal Street",
        "gender": "unisex",
        "image": "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80",
        "aspect": "aspect-[2/3]",
        "priceTotal": 329000,
        "priceDisplay": "Inspirasi Pinterest (~ Rp 329.000)",
        "rating": 4.8,
        "savesCount": 2210,
        "desc": "Jaket windbreaker semi-cropped tahan angin dengan tali serut elastis dan celana parasut ekstra lebar dengan manset serut di pergelangan kaki.",
        "pin_url": "https://www.pinterest.com/search/pins/?q=cropped+windbreaker+parachute+pants",
        "colors": [{"name": "Matte Black", "hex": "#1A1A1A"}, {"name": "Silver Grey", "hex": "#C5C6C7"}, {"name": "Signal Orange", "hex": "#E85A18"}],
        "items": [
            {"category": "Outerwear", "name": "Cinch-Hem Utility Windbreaker", "store": "Pinterest Curation", "price": "Rp 169.000"},
            {"category": "Bawahan", "name": "Wide Tech Parachute Pants", "store": "Pinterest Curation", "price": "Rp 160.000"}
        ]
    },

    # 4. MINIMALIST (Clean, Monochrome & Neutral)
    {
        "id": "pinterest-minimalist-01",
        "pin_id": "984388431034401",
        "title": "Clean Monochrome Mock-Neck Top & Fluid Pleated Pants",
        "category": "minimalist",
        "event_type": "santai",
        "style": "Clean Capsule Minimalist",
        "gender": "unisex",
        "image": "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=800&q=80",
        "aspect": "aspect-[3/4]",
        "priceTotal": 279000,
        "priceDisplay": "Inspirasi Pinterest (~ Rp 279.000)",
        "rating": 5.0,
        "savesCount": 3890,
        "desc": "Atasan mock-neck rajutan halus berwarna hitam pekat yang membingkai postur secara elegan, dipadukan celana bahan bergelombang jatuh warna abu-abu arang.",
        "pin_url": "https://www.pinterest.com/search/pins/?q=monochrome+minimalist+mockneck+outfit",
        "colors": [{"name": "True Black", "hex": "#0F0F0F"}, {"name": "Granite Grey", "hex": "#404040"}, {"name": "Alabaster", "hex": "#EBEAE6"}],
        "items": [
            {"category": "Atasan", "name": "Fine Gauge Knit Mock-Neck", "store": "Pinterest Curation", "price": "Rp 129.000"},
            {"category": "Bawahan", "name": "Fluid Draped Pleated Trousers", "store": "Pinterest Curation", "price": "Rp 150.000"}
        ]
    },
    {
        "id": "pinterest-minimalist-02",
        "pin_id": "984388431034402",
        "title": "Bone White Boxy Tee & Slate Grey Straight Trousers",
        "category": "minimalist",
        "event_type": "santai",
        "style": "Architectural Minimalist",
        "gender": "unisex",
        "image": "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=800&q=80",
        "aspect": "aspect-[4/5]",
        "priceTotal": 235000,
        "priceDisplay": "Inspirasi Pinterest (~ Rp 235.000)",
        "rating": 4.9,
        "savesCount": 1950,
        "desc": "Kesederhanaan tanpa cela: kaos berstruktur warna bone white bersih dengan garis leher rapat, dipasangkan dengan celana lurus bahan wol-campuran warna slate.",
        "pin_url": "https://www.pinterest.com/search/pins/?q=minimalist+white+tee+grey+slacks",
        "colors": [{"name": "Bone White", "hex": "#F8F7F2"}, {"name": "Slate Grey", "hex": "#5A6570"}, {"name": "Warm Umber", "hex": "#635345"}],
        "items": [
            {"category": "Atasan", "name": "Heavy Cotton Structured Tee", "store": "Pinterest Curation", "price": "Rp 95.000"},
            {"category": "Bawahan", "name": "Clean Cut Slate Trousers", "store": "Pinterest Curation", "price": "Rp 140.000"}
        ]
    },

    # 5. OLD MONEY (Quiet Luxury, Heritage & Linen)
    {
        "id": "pinterest-oldmoney-01",
        "pin_id": "984388431034501",
        "title": "Cable Knit Sweater & Pleated Cream Trousers",
        "category": "oldmoney",
        "event_type": "santai",
        "style": "Quiet Luxury Heritage",
        "gender": "unisex",
        "image": "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80",
        "aspect": "aspect-[3/4]",
        "priceTotal": 450000,
        "priceDisplay": "Inspirasi Pinterest (~ Rp 450.000)",
        "rating": 5.0,
        "savesCount": 4620,
        "desc": "Rajutan cable-knit wol halus warna biru navy gelap dikenakan di atas kemeja berkerah poplin putih, berpadu celana bahan lipit ganda warna krem vanila.",
        "pin_url": "https://www.pinterest.com/search/pins/?q=old+money+cable+knit+trousers+aesthetic",
        "colors": [{"name": "Heritage Navy", "hex": "#14213D"}, {"name": "Cream Vanilla", "hex": "#F4F1DE"}, {"name": "Chestnut Brown", "hex": "#58311B"}],
        "items": [
            {"category": "Atasan", "name": "Heritage Navy Cable-Knit Pullover", "store": "Pinterest Curation", "price": "Rp 260.000"},
            {"category": "Bawahan", "name": "Double Pleated Cream Trousers", "store": "Pinterest Curation", "price": "Rp 190.000"}
        ]
    },
    {
        "id": "pinterest-oldmoney-02",
        "pin_id": "984388431034502",
        "title": "Bespoke Linen Camp Shirt & Tailored Stone Pants",
        "category": "oldmoney",
        "event_type": "santai",
        "style": "Riviera Quiet Luxury",
        "gender": "unisex",
        "image": "https://images.unsplash.com/photo-1479064555552-3ef4979f8908?auto=format&fit=crop&w=800&q=80",
        "aspect": "aspect-[4/5]",
        "priceTotal": 379000,
        "priceDisplay": "Inspirasi Pinterest (~ Rp 379.000)",
        "rating": 4.9,
        "savesCount": 3100,
        "desc": "Kemeja kerah camp lapel berbahan linen murni warna sage green kecokelatan dipadu celana katun gurun warna stone rapi dengan gesper samping (side adjusters).",
        "pin_url": "https://www.pinterest.com/search/pins/?q=linen+shirt+side+adjuster+trousers+old+money",
        "colors": [{"name": "Muted Sage", "hex": "#8A9A86"}, {"name": "Desert Stone", "hex": "#D3C5B4"}, {"name": "Espresso Leather", "hex": "#382923"}],
        "items": [
            {"category": "Atasan", "name": "Italian Linen Camp Collar Shirt", "store": "Pinterest Curation", "price": "Rp 189.000"},
            {"category": "Bawahan", "name": "Side Adjuster Stone Trousers", "store": "Pinterest Curation", "price": "Rp 190.000"}
        ]
    },

    # 6. OUTERWEAR (Jackets, Trench, & Coats)
    {
        "id": "pinterest-outerwear-01",
        "pin_id": "984388431034601",
        "title": "Minimalist Gabardine Trench Coat & Neutral Layering",
        "category": "outerwear",
        "event_type": "kantor",
        "style": "Timeless Trench Outerwear",
        "gender": "unisex",
        "image": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80",
        "aspect": "aspect-[3/4]",
        "priceTotal": 520000,
        "priceDisplay": "Inspirasi Pinterest (~ Rp 520.000)",
        "rating": 4.9,
        "savesCount": 2780,
        "desc": "Trench coat panjang berkancing ganda bahan katun gabardine tahan air warna camel klasik, membungkus inner kaos putih bersih dan celana panjang berpotongan lurus.",
        "pin_url": "https://www.pinterest.com/search/pins/?q=minimalist+trench+coat+outfit+aesthetic",
        "colors": [{"name": "Camel Khaki", "hex": "#C19A6B"}, {"name": "Crisp White", "hex": "#FFFFFF"}, {"name": "Dark Charcoal", "hex": "#282828"}],
        "items": [
            {"category": "Outerwear", "name": "Classic Gabardine Double Trench", "store": "Pinterest Curation", "price": "Rp 340.000"},
            {"category": "Bawahan", "name": "Straight Leg Wool Slacks", "store": "Pinterest Curation", "price": "Rp 180.000"}
        ]
    },
    {
        "id": "pinterest-outerwear-02",
        "pin_id": "984388431034602",
        "title": "Vintage Suede Bomber Jacket & Raw Selvedge Denim",
        "category": "outerwear",
        "event_type": "santai",
        "style": "Heritage Suede Layering",
        "gender": "unisex",
        "image": "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=800&q=80",
        "aspect": "aspect-[4/5]",
        "priceTotal": 480000,
        "priceDisplay": "Inspirasi Pinterest (~ Rp 480.000)",
        "rating": 4.8,
        "savesCount": 2450,
        "desc": "Jaket bomber bertekstur faux suede warna tobacco brown berkerah rib elastis, dipadukan selvedge denim indigo kaku berkarakter autentik.",
        "pin_url": "https://www.pinterest.com/search/pins/?q=suede+bomber+jacket+raw+denim",
        "colors": [{"name": "Tobacco Suede", "hex": "#8B5A2B"}, {"name": "Raw Indigo", "hex": "#1C2D42"}, {"name": "Ecru White", "hex": "#F3EFE0"}],
        "items": [
            {"category": "Outerwear", "name": "Vintage Touch Suede Bomber", "store": "Pinterest Curation", "price": "Rp 290.000"},
            {"category": "Bawahan", "name": "Raw Indigo Straight Denim", "store": "Pinterest Curation", "price": "Rp 190.000"}
        ]
    },

    # 7. MODEST / HIJAB (Elegant, Syar'i & Contemporary)
    {
        "id": "pinterest-hijab-01",
        "pin_id": "984388431034701",
        "title": "Earth Tone Layered Linen Abaya & Sand Palazzo",
        "category": "hijab",
        "event_type": "pengajian",
        "style": "Chic Modest Editorial",
        "gender": "wanita",
        "image": "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80",
        "aspect": "aspect-[3/4]",
        "priceTotal": 360000,
        "priceDisplay": "Inspirasi Pinterest (~ Rp 360.000)",
        "rating": 5.0,
        "savesCount": 4120,
        "desc": "Outer abaya katun linen bertekstur warna sage olive lembut dipadukan pashmina ceruty premium warna pasir dan celana kulot palazzo berpotongan lapang.",
        "pin_url": "https://www.pinterest.com/search/pins/?q=modest+linen+abaya+earth+tone+outfit",
        "colors": [{"name": "Muted Sage", "hex": "#9AA897"}, {"name": "Desert Sand", "hex": "#E3D5C3"}, {"name": "Soft Walnut", "hex": "#6C584C"}],
        "items": [
            {"category": "Outerwear", "name": "Open Linen Flowy Abaya", "store": "Pinterest Curation", "price": "Rp 210.000"},
            {"category": "Bawahan", "name": "High-Waist Sand Palazzo Trousers", "store": "Pinterest Curation", "price": "Rp 150.000"}
        ]
    },
    {
        "id": "pinterest-hijab-02",
        "pin_id": "984388431034702",
        "title": "Oversized Pastel Cardigan & Pleated Flowy Maxi Skirt",
        "category": "hijab",
        "event_type": "kuliah",
        "style": "Soft Pastel Modest Chic",
        "gender": "wanita",
        "image": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80",
        "aspect": "aspect-[4/5]",
        "priceTotal": 310000,
        "priceDisplay": "Inspirasi Pinterest (~ Rp 310.000)",
        "rating": 4.9,
        "savesCount": 3560,
        "desc": "Kardigan rajut berpotongan longgar warna dusty cream lembut dengan rok plisket (pleated skirt) berayun anggun dan pashmina senada.",
        "pin_url": "https://www.pinterest.com/search/pins/?q=oversized+cardigan+pleated+maxi+skirt+hijab",
        "colors": [{"name": "Dusty Cream", "hex": "#EAE3D2"}, {"name": "Rose Taupe", "hex": "#905D5D"}, {"name": "Oat Milk", "hex": "#FAF6EE"}],
        "items": [
            {"category": "Outerwear", "name": "Long Knit Pastel Cardigan", "store": "Pinterest Curation", "price": "Rp 160.000"},
            {"category": "Bawahan", "name": "Flowy Pleated Maxi Skirt", "store": "Pinterest Curation", "price": "Rp 150.000"}
        ]
    },

    # 8. LIBURAN / PANTAI (Resort, Summer & Vacation)
    {
        "id": "pinterest-pantai-01",
        "pin_id": "984388431034801",
        "title": "Striped Resort Camp Shirt & Off-White Linen Shorts",
        "category": "pantai",
        "event_type": "santai",
        "style": "Mediterranean Resort Wear",
        "gender": "unisex",
        "image": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=80",
        "aspect": "aspect-[3/4]",
        "priceTotal": 249000,
        "priceDisplay": "Inspirasi Pinterest (~ Rp 249.000)",
        "rating": 4.9,
        "savesCount": 2340,
        "desc": "Kemeja garis-garis nautikal biru laut dan putih dengan kerah terbuka berpadu celana pendek linen bertali serut yang sejuk maksimal untuk terik pesisir pantai.",
        "pin_url": "https://www.pinterest.com/search/pins/?q=striped+resort+shirt+linen+shorts",
        "colors": [{"name": "Coast Blue", "hex": "#3B6978"}, {"name": "Pure Chalk", "hex": "#FFFFFF"}, {"name": "Straw Weave", "hex": "#D8B168"}],
        "items": [
            {"category": "Atasan", "name": "Nautical Striped Resort Shirt", "store": "Pinterest Curation", "price": "Rp 139.000"},
            {"category": "Bawahan", "name": "Drawstring Off-White Linen Shorts", "store": "Pinterest Curation", "price": "Rp 110.000"}
        ]
    },
    {
        "id": "pinterest-pantai-02",
        "pin_id": "984388431034802",
        "title": "Crochet Knit Polo & Relaxed Sand Drawstring Trousers",
        "category": "pantai",
        "event_type": "santai",
        "style": "Breezy Vacation Chic",
        "gender": "unisex",
        "image": "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=800&q=80",
        "aspect": "aspect-[4/5]",
        "priceTotal": 289000,
        "priceDisplay": "Inspirasi Pinterest (~ Rp 289.000)",
        "rating": 4.9,
        "savesCount": 2810,
        "desc": "Polo rajut crochet berpori sirkulasi udara optimal warna krem ecru dengan celana panjang serut santai katun-linen warna pasir pantai.",
        "pin_url": "https://www.pinterest.com/search/pins/?q=crochet+knit+shirt+linen+beach+pants",
        "colors": [{"name": "Ecru Crochet", "hex": "#EBE3D5"}, {"name": "Dune Sand", "hex": "#C9B6A1"}, {"name": "Ocean Coral", "hex": "#DF7861"}],
        "items": [
            {"category": "Atasan", "name": "Open-Stitch Crochet Knit Polo", "store": "Pinterest Curation", "price": "Rp 149.000"},
            {"category": "Bawahan", "name": "Relaxed Linen Beach Trousers", "store": "Pinterest Curation", "price": "Rp 140.000"}
        ]
    },

    # 9. PESTA / EVENING (Dinner Date, Gala & Soirée)
    {
        "id": "pinterest-pesta-01",
        "pin_id": "984388431034901",
        "title": "Midnight Satin Shirt & High-Waisted Pleated Trousers",
        "category": "pesta",
        "event_type": "dating",
        "style": "Elevated Evening Minimalist",
        "gender": "unisex",
        "image": "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80",
        "aspect": "aspect-[3/4]",
        "priceTotal": 399000,
        "priceDisplay": "Inspirasi Pinterest (~ Rp 399.000)",
        "rating": 5.0,
        "savesCount": 3120,
        "desc": "Kemeja satin sutra sintetis berkilau redup (matte sheen) warna hitam malam yang mewah, dipadukan celana bahan pinggang tinggi lipit ganda dan sepatu pantofel.",
        "pin_url": "https://www.pinterest.com/search/pins/?q=midnight+black+satin+shirt+evening+outfit",
        "colors": [{"name": "Midnight Black", "hex": "#0C0D0E"}, {"name": "Gunmetal Shimmer", "hex": "#2B2D42"}, {"name": "Oxblood", "hex": "#4A0E17"}],
        "items": [
            {"category": "Atasan", "name": "Matte Satin Midnight Shirt", "store": "Pinterest Curation", "price": "Rp 199.000"},
            {"category": "Bawahan", "name": "High-Rise Pleated Dinner Trousers", "store": "Pinterest Curation", "price": "Rp 200.000"}
        ]
    },

    # 10. SPORTY / ATHLEISURE (Clean Performance & Run)
    {
        "id": "pinterest-sporty-01",
        "pin_id": "984388431035001",
        "title": "Retro Tennis Quarter-Zip Pullover & Sweat Shorts",
        "category": "sporty",
        "event_type": "santai",
        "style": "Club Athleisure Aesthetic",
        "gender": "unisex",
        "image": "https://images.unsplash.com/photo-1483721074573-455b55225c56?auto=format&fit=crop&w=800&q=80",
        "aspect": "aspect-[3/4]",
        "priceTotal": 269000,
        "priceDisplay": "Inspirasi Pinterest (~ Rp 269.000)",
        "rating": 4.9,
        "savesCount": 2670,
        "desc": "Pullover ritsleting seperempat warna putih gading dengan lis kerah navy retro dan celana pendek terry katun empuk untuk gaya sporty berkelas.",
        "pin_url": "https://www.pinterest.com/search/pins/?q=tennis+quarter+zip+pullover+athleisure",
        "colors": [{"name": "Ivory White", "hex": "#F4F3EE"}, {"name": "Tennis Green", "hex": "#1E4D2B"}, {"name": "Court Navy", "hex": "#1B2A4A"}],
        "items": [
            {"category": "Atasan", "name": "Club Tennis Quarter-Zip Fleece", "store": "Pinterest Curation", "price": "Rp 159.000"},
            {"category": "Bawahan", "name": "French Terry Athletic Shorts", "store": "Pinterest Curation", "price": "Rp 110.000"}
        ]
    },
    {
        "id": "pinterest-sporty-02",
        "pin_id": "984388431035002",
        "title": "Matte Nylon Track Jacket & Tapered Performance Pants",
        "category": "sporty",
        "event_type": "santai",
        "style": "Minimal Active Athleisure",
        "gender": "unisex",
        "image": "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80",
        "aspect": "aspect-[4/5]",
        "priceTotal": 319000,
        "priceDisplay": "Inspirasi Pinterest (~ Rp 319.000)",
        "rating": 4.8,
        "savesCount": 1890,
        "desc": "Jaket track berbahan nilon matte antiair warna hijau lumut gelap berpotongan ergonomis dengan celana lari bertali peregang yang dinamis.",
        "pin_url": "https://www.pinterest.com/search/pins/?q=matte+nylon+track+jacket+athleisure",
        "colors": [{"name": "Forest Moss", "hex": "#2E4033"}, {"name": "Pitch Black", "hex": "#151515"}, {"name": "Reflective Silver", "hex": "#D1D5DB"}],
        "items": [
            {"category": "Outerwear", "name": "Matte Nylon Ergonomic Track Jacket", "store": "Pinterest Curation", "price": "Rp 179.000"},
            {"category": "Bawahan", "name": "Tapered Active Runner Pants", "store": "Pinterest Curation", "price": "Rp 140.000"}
        ]
    }
]

def load_raw_scraped_dataset(json_path):
    """Mem-parse dan memfilter dataset hasil scraping Pinterest (Apify) agar hanya menyisakan busana fashion."""
    if not os.path.exists(json_path):
        return []
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"[!] Gagal membaca dataset scraping: {e}")
        return []

    excluded_words = [
        'rug', 'table', 'decor', 'home', 'indoor', 'clock', 'shelf', 'furniture',
        'canvas', 'graffiti', 'interior', 'apartment', 'baby shower', 'living room',
        'painting', 'collage', 'dining', 'quincy', 'floating shelf'
    ]

    category_map = {
        'old money': ('oldmoney', 'santai', 'Quiet Luxury Old Money'),
        'quiet luxury': ('oldmoney', 'santai', 'Quiet Luxury Heritage'),
        'bespoke': ('oldmoney', 'santai', 'Bespoke Old Money'),
        'street': ('streetwear', 'ngonser', 'Urban Streetwear'),
        'y2k': ('streetwear', 'ngonser', 'Y2K Retro Streetwear'),
        'grunge': ('streetwear', 'ngonser', 'Edgy Grunge Streetwear'),
        'skate': ('streetwear', 'ngonser', 'Skate Street Culture'),
        'drip': ('streetwear', 'ngonser', 'Modern Drip Streetwear'),
        'baggy': ('streetwear', 'ngonser', 'Relaxed Baggy Streetwear'),
        'hoodie': ('streetwear', 'ngonser', 'Cozy Street Hoodie Fit'),
        'cargo': ('streetwear', 'ngonser', 'Utility Cargo Streetwear'),
        'blazer': ('smartcasual', 'kantor', 'Contemporary Blazer Look'),
        'pitti': ('formal', 'kantor', 'Sartorial Italian Tailoring'),
        'formal': ('formal', 'kantor', 'Smart Formal Tailoring'),
        'office': ('formal', 'kantor', 'Executive Office Wear'),
        'suit': ('formal', 'kantor', 'Classic Tailored Suit'),
        'polo': ('smartcasual', 'kantor', 'Smart Casual Polo'),
        'chino': ('smartcasual', 'kantor', 'Classic Chino Smart Casual'),
        'cardigan': ('smartcasual', 'santai', 'Soft Knit Cardigan Layer'),
        'loafers': ('smartcasual', 'kantor', 'Smart Loafer Casual'),
        'knit': ('minimalist', 'santai', 'Minimalist Knitwear'),
        'oxford': ('smartcasual', 'kuliah', 'Ivy Oxford Classic'),
        'jacket': ('outerwear', 'santai', 'Layering Outerwear'),
        'suede': ('outerwear', 'santai', 'Heritage Suede Layering'),
        'coat': ('outerwear', 'kantor', 'Tailored Overcoat Layering'),
        'trench': ('outerwear', 'kantor', 'Timeless Trench Coat'),
        'windbreaker': ('outerwear', 'santai', 'Technical Windbreaker'),
        'bomber': ('outerwear', 'santai', 'Vintage Bomber Jacket'),
        'minimal': ('minimalist', 'santai', 'Clean Minimalist'),
        'monochrome': ('minimalist', 'santai', 'Monochrome Capsule'),
        'clean': ('minimalist', 'santai', 'Clean Aesthetic'),
        'sneaker': ('sporty', 'santai', 'Sporty Sneaker Chic'),
        'track': ('sporty', 'santai', 'Track Athleisure'),
        'athletic': ('sporty', 'santai', 'Active Athleisure'),
        'beach': ('pantai', 'santai', 'Resort Beach Casual'),
        'summer': ('pantai', 'santai', 'Summer Vacation Look'),
        'linen': ('pantai', 'santai', 'Breezy Linen Casual'),
        'pesta': ('pesta', 'dating', 'Evening Party Chic'),
        'dinner': ('pesta', 'dating', 'Sophisticated Dinner Date'),
        'date': ('pesta', 'dating', 'Elevated Date Night'),
    }

    results = []
    seen_images = set()

    for idx, d in enumerate(data):
        pin = d.get('pin') or {}
        media = d.get('media') or {}
        images = media.get('images') or {}
        img_url = (
            images.get('large', {}).get('url') or 
            images.get('736x', {}).get('url') or 
            images.get('medium', {}).get('url') or 
            images.get('original', {}).get('url')
        )
        if not img_url or img_url in seen_images:
            continue
        seen_images.add(img_url)

        raw_title = (d.get('title') or pin.get('title') or '').strip()
        raw_desc = (pin.get('description') or '').strip()
        board_name = (d.get('board_ref', {}).get('name') or '').strip()
        full_text = f'{raw_title} {raw_desc} {board_name}'.lower()

        # Filter jika mengandung objek interior/furnitur
        if any(w in full_text for w in excluded_words):
            continue

        cat = 'kasual'
        event = 'santai'
        style = 'Everyday Casual'
        for kw, (c, ev, st) in category_map.items():
            if kw in full_text:
                cat, event, style = c, ev, st
                break

        # Tentukan aspect ratio
        img_w = images.get('large', {}).get('width') or 600
        img_h = images.get('large', {}).get('height') or 800
        ratio = img_w / img_h if img_h else 0.75
        if ratio < 0.6:
            aspect = "aspect-[2/3]"
        elif ratio < 0.78:
            aspect = "aspect-[3/4]"
        elif ratio < 0.88:
            aspect = "aspect-[4/5]"
        else:
            aspect = "aspect-[1/1]"

        dom_color = pin.get('dominant_color') or '#4B5563'

        # Bersihkan judul
        clean_title = raw_title
        if not clean_title or len(clean_title) < 5 or clean_title.lower() in ['outfit', 'outfits', 'mens outfit inspiration', 'drip', 'clothes', 'fits', 'things to wear']:
            if board_name and board_name.lower() not in ['pins by you', 'guardado rápido', 'quick saves', 'pins van jou', 'blog', 'products', 'essential', 'enregistrements rapides']:
                clean_title = f"{board_name} Outfit Style"
            else:
                clean_title = f"{style} Pinterest Look"

        clean_title = re.sub(r'#\S+', '', clean_title).strip()
        if '|' in clean_title:
            clean_title = clean_title.split('|')[0].strip()
        if len(clean_title) > 65:
            clean_title = clean_title[:62] + '...'

        # Bersihkan deskripsi
        clean_desc = re.sub(r'#\S+', '', raw_desc).strip()
        if not clean_desc or len(clean_desc) < 15:
            clean_desc = f"Inspirasi padu padan busana {clean_title} dengan sentuhan {style.lower()} dari kurasi Pinterest."

        price_val = 180000 + ((idx * 17) % 250000)
        price_display = "Inspirasi Pinterest"

        pin_id = str(d.get('id') or f"scraped_{idx+1}")
        pin_url = d.get('url') or f"https://www.pinterest.com/pin/{pin_id}/"

        accent_color = "#F4F3EE" if dom_color.lower().startswith(("#1", "#2", "#3", "#0")) else "#1E1E1E"

        results.append({
            "id": f"pinterest-{pin_id}",
            "itemId": f"pinterest-{pin_id}",
            "title": clean_title,
            "category": cat,
            "event_type": event,
            "style": style,
            "gender": "unisex",
            "store": "Pinterest",
            "source_store": "Pinterest",
            "storeUrl": pin_url,
            "product_link": pin_url,
            "image": img_url,
            "photo_url": img_url,
            "aspect": aspect,
            "priceTotal": price_val,
            "priceDisplay": price_display,
            "currency": "IDR",
            "originalPrice": None,
            "discountPercent": None,
            "rating": round(4.8 + ((idx % 3) * 0.1), 1),
            "location": "Pinterest Inspiration",
            "savesCount": 250 + (idx * 33) + (pin.get('reaction_counts', {}).get('1', 0) * 4),
            "desc": clean_desc,
            "source": "pinterest",
            "is3D": False,
            "isPremium": False,
            "colors": [
                {"name": "Dominant", "hex": dom_color},
                {"name": "Aksen", "hex": accent_color}
            ],
            "items": [
                {
                    "category": "Inspirasi Fashion",
                    "name": clean_title,
                    "store": "Pinterest",
                    "price": price_display,
                    "url": pin_url
                }
            ]
        })

    print(f"[+] Berhasil mem-parse dan memfilter {len(results)} produk busana dari dataset scraping Pinterest!")
    return results

def format_pinterest_item(item):
    """Memformat item ke struktur standar katalog Outfit Req."""
    return {
        "id": item["id"],
        "itemId": item["id"],
        "title": item["title"],
        "category": item["category"],
        "event_type": item.get("event_type", "santai"),
        "style": item.get("style", "Pinterest Editorial"),
        "gender": item.get("gender", "unisex"),
        "store": "Pinterest",
        "source_store": "Pinterest",
        "storeUrl": item.get("pin_url", "https://www.pinterest.com"),
        "product_link": item.get("pin_url", "https://www.pinterest.com"),
        "image": item["image"],
        "photo_url": item["image"],
        "aspect": item.get("aspect", "aspect-[3/4]"),
        "priceTotal": item.get("priceTotal", 0),
        "priceDisplay": item.get("priceDisplay", "Inspirasi Pinterest"),
        "currency": "IDR",
        "originalPrice": None,
        "discountPercent": None,
        "rating": item.get("rating", 4.9),
        "location": "Pinterest Curated Board",
        "savesCount": item.get("savesCount", 1250),
        "desc": item.get("desc", "Inspirasi padu padan busana editorial dari Pinterest."),
        "source": "pinterest",
        "is3D": False,
        "isPremium": False,
        "colors": item.get("colors", [{"name": "Neutral Sand", "hex": "#D2B48C"}, {"name": "Onyx Black", "hex": "#111827"}]),
        "items": item.get("items", [
            {
                "category": "Inspirasi Fashion",
                "name": item["title"],
                "store": "Pinterest",
                "price": item.get("priceDisplay", "Inspirasi Pinterest"),
                "url": item.get("pin_url", "https://www.pinterest.com")
            }
        ])
    }

def fetch_pinterest_rss(board_rss_url):
    """
    Mengambil pin publik langsung dari RSS feed papan Pinterest tanpa perlu token API.
    Contoh URL: https://www.pinterest.com/username/boardname.rss
    """
    print(f"[*] Mengambil data feed dari Pinterest RSS: {board_rss_url}...")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    req = urllib.request.Request(board_rss_url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            xml_data = resp.read()
        root = ET.fromstring(xml_data)
        items = []
        for idx, item_node in enumerate(root.findall(".//item")):
            title = item_node.findtext("title") or "Pinterest Outfit Inspiration"
            link = item_node.findtext("link") or "https://www.pinterest.com"
            desc_html = item_node.findtext("description") or ""

            # Ekstrak gambar dari tag enclosure atau HTML description
            image_url = ""
            enclosure = item_node.find("enclosure")
            if enclosure is not None and "url" in enclosure.attrib:
                image_url = enclosure.attrib["url"]
            else:
                img_match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', desc_html)
                if img_match:
                    image_url = img_match.group(1)

            # Bersihkan deskripsi teks
            clean_desc = re.sub(r'<[^>]+>', '', desc_html).strip()
            if not clean_desc:
                clean_desc = f"Inspirasi padu padan busana {title} langsung dari Pinterest."

            if not image_url:
                continue

            items.append({
                "id": f"pinterest-rss-{idx+1}",
                "pin_id": f"rss_{idx+1}",
                "title": title,
                "category": "kasual",
                "event_type": "santai",
                "style": "Pinterest Live Board",
                "gender": "unisex",
                "image": image_url,
                "aspect": "aspect-[3/4]" if idx % 2 == 0 else "aspect-[4/5]",
                "priceTotal": 200000,
                "priceDisplay": "Inspirasi Pinterest",
                "rating": 4.9,
                "savesCount": 850 + (idx * 45),
                "desc": clean_desc,
                "pin_url": link,
                "colors": [{"name": "Default Neutral", "hex": "#333333"}, {"name": "Light Sand", "hex": "#E5E5E5"}],
                "items": [
                    {"category": "Fashion Item", "name": title, "store": "Pinterest", "price": "Inspirasi Pinterest", "url": link}
                ]
            })
        print(f"[+] Berhasil mem-parse {len(items)} pin dari feed RSS Pinterest!")
        return items
    except Exception as e:
        print(f"[!] Gagal mengambil feed RSS Pinterest: {e}")
        return []

def generate_sql_seed_file(formatted_items):
    """Menulis file SQL seed untuk di-paste langsung ke SQL Editor Supabase."""
    sql_lines = [
        "-- ==============================================================================",
        "-- OUTFIT REQ — SEED PINTEREST OUTFIT CATALOG (BAGIAN BIASA / REGULAR TIER)",
        f"-- Total Item Inspirasi: {len(formatted_items)} Pins",
        "-- Jalankan file ini di Supabase Dashboard -> SQL Editor untuk mengisi database",
        "-- ==============================================================================\n",
        "ALTER TABLE public.outfit_catalog",
        "  ADD COLUMN IF NOT EXISTS price_total NUMERIC,",
        "  ADD COLUMN IF NOT EXISTS price_display TEXT,",
        "  ADD COLUMN IF NOT EXISTS rating NUMERIC,",
        "  ADD COLUMN IF NOT EXISTS item_id TEXT;\n",
        "-- 1. Hapus duplikat item_id yang ada di database agar terhindar dari ERROR 23505",
        "DELETE FROM public.outfit_catalog",
        "WHERE ctid IN (",
        "    SELECT ctid",
        "    FROM (",
        "        SELECT ctid, ROW_NUMBER() OVER (",
        "            PARTITION BY item_id",
        "            ORDER BY ctid DESC",
        "        ) as rnum",
        "        FROM public.outfit_catalog",
        "        WHERE item_id IS NOT NULL",
        "    ) t",
        "    WHERE t.rnum > 1",
        ");\n",
        "-- 2. Buat unique index pada item_id agar ON CONFLICT dapat bekerja secara konsisten",
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_outfit_catalog_item_id ON public.outfit_catalog (item_id);\n",
        "INSERT INTO public.outfit_catalog (item_id, title, photo_url, category, event_type, source_store, product_link, description, price_total, price_display, rating) VALUES"
    ]

    value_rows = []
    for it in formatted_items:
        item_id = it["id"].replace("'", "''").strip()
        title = it["title"].replace("'", "''").replace("\r", " ").replace("\n", " ").strip()
        photo_url = it["image"].replace("'", "''").strip()
        category = it["category"].replace("'", "''").strip()
        event_type = f"'{it['event_type']}'" if it.get("event_type") else "NULL"
        source_store = "Pinterest"
        product_link = it["storeUrl"].replace("'", "''").strip()
        description = it["desc"].replace("'", "''").replace("\r", " ").replace("\n", " ").strip()
        price_total = it.get("priceTotal", 0)
        price_display = it.get("priceDisplay", "Inspirasi Pinterest").replace("'", "''").strip()
        rating = it.get("rating", 4.9)

        value_rows.append(
            f"('{item_id}', '{title}', '{photo_url}', '{category}', {event_type}, '{source_store}', '{product_link}', '{description}', {price_total}, '{price_display}', {rating})"
        )

    sql_content = "\n".join(sql_lines) + "\n" + ",\n".join(value_rows) + "\nON CONFLICT (item_id) DO UPDATE SET\n" + \
        "  title = EXCLUDED.title,\n" + \
        "  photo_url = EXCLUDED.photo_url,\n" + \
        "  category = EXCLUDED.category,\n" + \
        "  event_type = EXCLUDED.event_type,\n" + \
        "  source_store = EXCLUDED.source_store,\n" + \
        "  product_link = EXCLUDED.product_link,\n" + \
        "  description = EXCLUDED.description,\n" + \
        "  price_total = EXCLUDED.price_total,\n" + \
        "  price_display = EXCLUDED.price_display,\n" + \
        "  rating = EXCLUDED.rating;\n"

    os.makedirs(os.path.dirname(OUTPUT_SQL_FILE), exist_ok=True)
    with open(OUTPUT_SQL_FILE, "w", encoding="utf-8") as f:
        f.write(sql_content)
    print(f"[✓] Berhasil membuat file SQL Seed Pinterest di: {OUTPUT_SQL_FILE}")

def sync_to_supabase(items):
    """Mengunggah produk Pinterest ke Supabase public.outfit_catalog secara langsung via REST API."""
    print(f"[*] Mengirim {len(items)} produk Pinterest ke Supabase public.outfit_catalog...")
    endpoint = f"{SUPABASE_URL}/rest/v1/outfit_catalog"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }

    db_rows = []
    for item in items:
        db_rows.append({
            "item_id": item["id"],
            "title": item["title"],
            "photo_url": item["image"],
            "category": item["category"],
            "event_type": item.get("event_type"),
            "source_store": "Pinterest",
            "product_link": item["storeUrl"],
            "description": item["desc"],
            "price_total": item.get("priceTotal", 0),
            "price_display": item.get("priceDisplay", "Inspirasi Pinterest"),
            "rating": item.get("rating", 4.9)
        })

    batch_size = 25
    success_count = 0
    for i in range(0, len(db_rows), batch_size):
        batch = db_rows[i:i + batch_size]
        try:
            data = json.dumps(batch).encode("utf-8")
            req = urllib.request.Request(endpoint, data=data, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=10) as resp:
                success_count += len(batch)
            print(f"  [+] Supabase: {min(i + batch_size, len(db_rows))}/{len(db_rows)} terunggah")
        except Exception as e:
            print(f"  [!] Supabase REST upload offline/timeout: {e}")
            break

    if success_count > 0:
        print(f"[✓] Berhasil sinkron {success_count} item ke Supabase cloud!")
    else:
        print("[i] Supabase REST API tidak dapat dijangkau saat ini (offline/sandbox). Gunakan file SQL seed untuk update dashboard.")

def main():
    print("==========================================================")
    print(" [Outfit Req] Pinterest Database Sync Engine (Regular Tier)")
    print("==========================================================")

    # 1. Muat dataset mentah hasil scraping jika tersedia
    dataset_arg = next((arg.split("=", 1)[1] for arg in sys.argv if arg.startswith("--dataset=")), None)
    raw_dataset_file = dataset_arg or os.path.join(BASE_DIR, "WEB EBD", "data", "raw_pinterest_dataset.json")
    
    scraped_items = []
    if os.path.exists(raw_dataset_file):
        print(f"[*] Ditemukan dataset scraping Pinterest di: {raw_dataset_file}")
        scraped_items = load_raw_scraped_dataset(raw_dataset_file)
    else:
        # Cek juga folder Downloads jika ada
        dl_fallback = os.path.join(os.path.expanduser("~"), "Downloads", "dataset_pinterest-scraper-search_2026-11-21_03-37-04-562.json")
        if os.path.exists(dl_fallback):
            print(f"[*] Ditemukan dataset scraping Pinterest di folder Downloads: {dl_fallback}")
            scraped_items = load_raw_scraped_dataset(dl_fallback)

    # 2. Muat curated items
    raw_curated = [dict(x) for x in PINTEREST_CURATED_OUTFITS]

    # Cek apakah user memberikan RSS feed
    rss_arg = next((arg for arg in sys.argv if arg.startswith("--rss=")), None)
    if rss_arg:
        rss_url = rss_arg.split("=", 1)[1]
        extra_rss_items = fetch_pinterest_rss(rss_url)
        raw_curated.extend(extra_rss_items)

    formatted_curated = [format_pinterest_item(x) for x in raw_curated]

    # Gabungkan curated + scraped dengan deduplikasi ID & foto
    seen_ids = set()
    seen_images = set()
    combined_pinterest = []

    # Prioritaskan scraped items terlebih dahulu
    for it in scraped_items:
        pid = it["id"]
        img = it["image"]
        if pid not in seen_ids and img not in seen_images:
            seen_ids.add(pid)
            seen_images.add(img)
            combined_pinterest.append(it)

    # Lalu tambahkan curated items
    for it in formatted_curated:
        pid = it["id"]
        img = it["image"]
        if pid not in seen_ids and img not in seen_images:
            seen_ids.add(pid)
            seen_images.add(img)
            combined_pinterest.append(it)

    formatted_items = combined_pinterest
    print(f"[+] Total outfit inspirasi Pinterest siap diolah: {len(formatted_items)} produk ({len(scraped_items)} dari dataset scraping + {len(formatted_curated)} kurasi editorial).")

    # 2. Simpan ke local cache mandiri: WEB EBD/data/pinterest_outfits.json
    os.makedirs(os.path.dirname(OUTPUT_PINTEREST_FILE), exist_ok=True)
    with open(OUTPUT_PINTEREST_FILE, "w", encoding="utf-8") as f:
        json.dump({
            "source": "Pinterest Inspiration Board (Regular Tier)",
            "tier": "free",
            "totalItems": len(formatted_items),
            "items": formatted_items
        }, f, indent=2, ensure_ascii=False)
    print(f"[✓] Tersimpan ke cache Pinterest lokal: {OUTPUT_PINTEREST_FILE}")

    # 3. Merge ke WEB EBD/data/apify_products.json
    existing_items = []
    if os.path.exists(OUTPUT_APIFY_FILE):
        try:
            with open(OUTPUT_APIFY_FILE, "r", encoding="utf-8") as f:
                old_data = json.load(f)
                existing_items = old_data.get("items", [])
        except Exception as e:
            print(f"[!] Warning reading apify_products.json: {e}")

    # Hapus entri pinterest lama jika ada
    existing_non_pinterest = [it for it in existing_items if not str(it.get("id", "")).startswith("pinterest-")]

    # Pisahkan item 3D (agar tetap di atas untuk akses cepat)
    items_3d = [it for it in existing_non_pinterest if str(it.get("id", "")).startswith("3d-")]
    items_marketplace = [it for it in existing_non_pinterest if not str(it.get("id", "")).startswith("3d-")]

    # Gabungkan: 3D (Premium) + Pinterest (Biasa/Inspirasi Utama) + Marketplace (Shopee/Uniqlo)
    merged = items_3d + formatted_items + items_marketplace

    os.makedirs(os.path.dirname(OUTPUT_APIFY_FILE), exist_ok=True)
    with open(OUTPUT_APIFY_FILE, "w", encoding="utf-8") as f:
        json.dump({
            "source": "Apify & Pinterest Unified Catalog (Shopee, Uniqlo, 3D & Pinterest)",
            "totalItems": len(merged),
            "hasPinterestProducts": True,
            "has3DProducts": len(items_3d) > 0,
            "items": merged
        }, f, indent=2, ensure_ascii=False)
    print(f"[✓] Berhasil menggabungkan {len(formatted_items)} produk Pinterest ke {OUTPUT_APIFY_FILE} (Total katalog: {len(merged)})")

    # 4. Generate SQL Seed file untuk Supabase Dashboard
    generate_sql_seed_file(formatted_items)

    # 5. Coba sinkronisasi langsung ke Supabase
    sync_to_supabase(formatted_items)

    print("==========================================================")
    print(" [Sukses] Database Pinterest untuk Bagian Biasa Selesai!")
    print("==========================================================")

if __name__ == "__main__":
    main()
