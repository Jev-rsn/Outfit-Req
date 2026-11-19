#!/usr/bin/env python3
"""
Menggabungkan products_catalog.json, fabric_normals.js, dan Three.js viewer
menjadi satu file gunakan-viewer (1).html yang 100% self-contained tanpa ketergantungan file lokal eksternal.
"""
import json, re

with open('products_catalog.json', 'r', encoding='utf-8') as f:
    catalog = json.load(f)

with open('fabric_normals.js', 'r', encoding='utf-8') as f:
    normals_js = f.read()

# Ekstrak objek JSON dari fabric_normals.js
normals_match = re.search(r'window\.FABRIC_NORMALS\s*=\s*(\{.*?\});', normals_js, re.DOTALL)
if normals_match:
    normals = json.loads(normals_match.group(1))
else:
    normals = {}

html_content = f'''<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Gunakan: Visualisasi Body 3D Realistis</title>
<style>
:root{{
  --bg:#FFFFFF;--stage:#F4F1EA;--ink:#141316;--mut:#625c64;--line:#ded6cc;
  --brand:#6D001A;--onbrand:#FFFFFF;--panel:#FFFFFF;--gold:#B38728;
  --success:#1f8247;--warn:#d47e17;--danger:#bd3030;
  box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)
}}
@media (prefers-color-scheme:dark){{
  :root:not([data-theme="light"]){{
    --bg:#121013;--stage:#1a171a;--ink:#f6f1eb;--mut:#a49ba1;--line:#383136;
    --brand:#d84a6e;--onbrand:#121013;--panel:#1a1619;
  }}
}}
:root[data-theme="dark"]{{
  --bg:#121013;--stage:#1a171a;--ink:#f6f1eb;--mut:#a49ba1;--line:#383136;
  --brand:#d84a6e;--onbrand:#121013;--panel:#1a1619;
}}
*{{box-sizing:border-box}}
html,body{{height:100%;margin:0}}
body{{background:var(--bg);color:var(--ink);font-family:"Segoe UI",system-ui,-apple-system,sans-serif;font-size:13.5px}}
.app{{display:grid;grid-template-columns:1fr 400px;height:100%}}
#stage{{
  position:relative;
  background:radial-gradient(ellipse at 50% 45%, #FCFAF7 0%, #F1EDE5 65%, #E2DDD3 100%);
  min-height:50vh;
  overflow:hidden
}}
#stage canvas{{display:block;width:100%;height:100%}}

/* Floating Badges */
.stage-overlay{{position:absolute;left:14px;top:14px;right:14px;display:flex;justify-content:space-between;align-items:flex-start;pointer-events:none}}
.fit-tags{{display:flex;gap:8px;flex-wrap:wrap;pointer-events:auto}}
.chip{{background:rgba(255,255,255,0.92);border:1px solid var(--line);border-radius:999px;padding:6px 14px;font-size:12px;box-shadow:0 3px 12px rgba(0,0,0,0.06);backdrop-filter:blur(8px);display:inline-flex;align-items:center;gap:6px;transition:all .2s ease}}
.chip b{{color:var(--brand)}}
.chip-status{{width:8px;height:8px;border-radius:50%;display:inline-block}}
.status-pas{{background:var(--success)}}
.status-ketat{{background:var(--danger)}}
.status-longgar{{background:var(--warn)}}

.studio-badge{{background:rgba(18,17,20,0.85);color:#fff;border-radius:6px;padding:5px 11px;font-size:11px;letter-spacing:0.5px;font-weight:600;display:flex;align-items:center;gap:6px;backdrop-filter:blur(6px)}}
.studio-badge span{{color:#FFD700}}

.hint{{position:absolute;left:14px;bottom:14px;color:var(--mut);font-size:11.5px;pointer-events:none;background:rgba(255,255,255,0.88);padding:5px 12px;border-radius:8px;backdrop-filter:blur(8px);box-shadow:0 2px 8px rgba(0,0,0,0.04)}}

/* Aside Sidebar */
aside{{overflow-y:auto;padding:20px 22px;border-left:1px solid var(--line);background:var(--bg)}}
h1{{font-size:21px;margin:0 0 4px;color:var(--brand);display:flex;align-items:center;gap:8px}}
.badge-prem{{font-size:10px;background:var(--brand);color:var(--onbrand);padding:2px 7px;border-radius:4px;letter-spacing:0.6px;font-weight:700}}
.sub{{color:var(--mut);margin:0 0 16px;font-size:12px;line-height:1.45}}

fieldset{{border:1px solid var(--line);border-radius:10px;margin:0 0 14px;padding:12px 14px;background:var(--panel)}}
legend{{padding:0 8px;font-weight:700;color:var(--ink);font-size:12px;text-transform:uppercase;letter-spacing:0.5px}}

.row{{display:grid;grid-template-columns:84px 1fr 52px;align-items:center;gap:8px;margin:6px 0}}
.row label{{font-size:12.5px;color:var(--ink)}}
.row output{{text-align:right;color:var(--mut);font-variant-numeric:tabular-nums;font-weight:600}}
input[type=range]{{width:100%;accent-color:var(--brand);cursor:pointer}}

button,select{{font:inherit;color:var(--ink);background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:6px 10px;cursor:pointer;transition:all .15s ease}}
button:focus-visible,select:focus-visible,input:focus-visible{{outline:2px solid var(--brand);outline-offset:2px}}
button.on{{background:var(--brand);color:var(--onbrand);border-color:var(--brand)}}

/* Product cards with real catalog photos */
.prods-grid{{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:10px 0 6px}}
.prod-card{{display:flex;flex-direction:column;border:1.5px solid var(--line);border-radius:8px;background:var(--panel);padding:6px;cursor:pointer;text-align:left;position:relative;transition:border-color .2s,box-shadow .2s,transform .2s cubic-bezier(0.34, 1.56, 0.64, 1)}}
.prod-card:hover{{border-color:var(--brand);transform:translateY(-2px)}}
.prod-card.on{{border-color:var(--brand);box-shadow:0 0 0 2px var(--brand);background:rgba(109,0,26,0.03);transform:scale(1.02)}}
.prod-card .img-box{{width:100%;aspect-ratio:1/1;border-radius:6px;overflow:hidden;background:#f5f5f5;margin-bottom:6px;display:flex;align-items:center;justify-content:center}}
.prod-card img{{width:100%;height:100%;object-fit:cover;display:block;transition:transform .3s ease}}
.prod-card:hover img{{transform:scale(1.04)}}
.prod-card .p-name{{font-size:11.5px;font-weight:600;line-height:1.25;color:var(--ink);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:29px}}
.prod-card .p-price{{font-size:11.5px;color:var(--brand);font-weight:700;margin-top:2px}}
.prod-desc-box{{font-size:11.5px;color:var(--mut);background:rgba(0,0,0,0.02);border-radius:6px;padding:8px 10px;margin-top:6px;line-height:1.45;border-left:3px solid var(--brand);transition:all .2s ease}}

.line{{display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap}}
.note{{font-size:11.5px;color:var(--mut);margin:8px 0 0;line-height:1.5}}
.btn-action{{padding:7px 12px;font-weight:600;border-radius:7px;font-size:12px}}

/* Toggle Tabs */
.seg-control{{display:flex;border:1px solid var(--line);border-radius:8px;overflow:hidden;margin-top:6px;background:var(--panel)}}
.seg-control button{{flex:1;border:0;border-radius:0;padding:6px 8px;font-size:11.5px;font-weight:600;background:transparent;color:var(--mut)}}
.seg-control button.on{{background:var(--brand);color:#fff}}

@media (max-width:760px){{
  .app{{grid-template-columns:1fr;grid-template-rows:55vh auto;height:auto}}
  aside{{border-left:0;border-top:1px solid var(--line)}}
}}
</style>
</head>
<body>
<div class="app">
  <div id="stage">
    <div class="stage-overlay">
      <div class="fit-tags">
        <span class="chip"><span id="dotTop" class="chip-status status-pas"></span>Atasan: <b id="fitTop">-</b></span>
        <span class="chip"><span id="dotBot" class="chip-status status-pas"></span>Celana: <b id="fitBot">-</b></span>
      </div>
      <div class="studio-badge"><span>★</span> PBR REAL-TIME 3D</div>
    </div>
    <div class="hint">🖱️ Seret untuk memutar 360° • Scroll untuk zoom • Klik ganda untuk reset</div>
  </div>

  <aside>
    <h1>Gunakan <span class="badge-prem">PREMIUM 3D</span></h1>
    <p class="sub">Visualisasi 3D Realistis dengan <b>Hybrid UV Projection</b>, normal map lipatan kain, microfiber sheen, dan studio softbox lighting.</p>

    <!-- Pilihan Tampilan & Studio -->
    <fieldset>
      <legend>Tampilan & Lighting Studio</legend>
      <div class="row"><label>Lighting</label>
        <div class="seg-control" id="lightPreset" style="grid-column:span 2">
          <button type="button" class="on" data-val="softbox">Softbox Studio</button>
          <button type="button" data-val="editorial">Editorial Rim</button>
          <button type="button" data-val="bright">Clean Retail</button>
        </div>
      </div>
      <div class="row"><label>Manekin</label>
        <div class="seg-control" id="mannequinStyle" style="grid-column:span 2">
          <button type="button" class="on" data-val="ivory">Ivory Butik</button>
          <button type="button" data-val="skin">Kulit Natural</button>
          <button type="button" data-val="charcoal">Charcoal Matte</button>
        </div>
      </div>
      <div class="row" style="margin-top:8px">
        <label>Detail Kain</label>
        <div style="grid-column:span 2;display:flex;align-items:center;gap:12px">
          <label style="font-size:12px;cursor:pointer"><input type="checkbox" id="wrinklesOn" checked> Lipatan & Tekstur Tenun 3D</label>
        </div>
      </div>
    </fieldset>

    <!-- Data Tubuh -->
    <fieldset>
      <legend>Ukuran Tubuh Pengguna</legend>
      <div class="row"><label for="H">Tinggi</label><input id="H" type="range" min="145" max="195" value="170"><output></output></div>
      <div class="row"><label for="W">Berat</label><input id="W" type="range" min="40" max="130" value="65"><output></output></div>
      <div class="row"><label for="C">Lingkar dada</label><input id="C" type="range" min="76" max="130" value="92"><output></output></div>
      <div class="row"><label for="P">Lingkar pinggang</label><input id="P" type="range" min="60" max="125" value="76"><output></output></div>
      <div class="row"><label for="B">Lebar bahu</label><input id="B" type="range" min="34" max="56" value="42"><output></output></div>
      <div class="line"><button id="est" type="button" class="btn-action" style="width:100%">Estimasi Otomatis dari TB & BB</button></div>
    </fieldset>

    <!-- Atasan -->
    <fieldset>
      <legend>Atasan (Foto Produk Asli)</legend>
      <div class="line" style="justify-content:space-between">
        <label style="font-weight:600;cursor:pointer"><input type="checkbox" id="topOn" checked> Tampilkan Atasan</label>
        <label>Size: <select id="topSize"></select></label>
      </div>
      <div class="prods-grid" id="topProds"></div>
      <div class="prod-desc-box" id="topDesc">-</div>
    </fieldset>

    <!-- Celana -->
    <fieldset>
      <legend>Celana (Foto Produk Asli)</legend>
      <div class="line" style="justify-content:space-between">
        <label style="font-weight:600;cursor:pointer"><input type="checkbox" id="botOn" checked> Tampilkan Celana</label>
        <label>Size: <select id="botSize"></select></label>
      </div>
      <div class="prods-grid" id="botProds"></div>
      <div class="prod-desc-box" id="botDesc">-</div>
    </fieldset>

    <!-- Kontrol Kamera -->
    <div class="line">
      <button id="spin" type="button" class="btn-action">Putar 360°</button>
      <button id="reset" type="button" class="btn-action">Reset Kamera</button>
    </div>
    <p class="note">Transisi produk berjalan halus secara real-time. Manekin tetap stabil dan pakaian berganti seketika saat kartu produk ditekan.</p>
  </aside>
</div>

<!-- Three.js CDN -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>

<!-- Embedded Inline Catalogs (100% Bebas CORS & Self-Contained) -->
<script>
window.PRODUCT_CATALOG = {json.dumps(catalog, ensure_ascii=False)};
window.FABRIC_NORMALS = {json.dumps(normals, ensure_ascii=False)};
</script>

<script>
(function(){{
"use strict";
const stage = document.getElementById('stage');
const SC = 0.01; // 1 cm = 0.01 unit scene

/* ---------- DATA UKURAN PAKAIAN ---------- */
const TOP_SIZES = {{XS:86, S:92, M:98, L:104, XL:110, "2XL":116, "3XL":122}};
const BOT_SIZES = {{XS:68, S:74, M:80, L:86, XL:92, "2XL":98, "3XL":104}};

const catalog = window.PRODUCT_CATALOG;
const normals = window.FABRIC_NORMALS;

const state = {{
  H: 170, W: 65, C: 92, P: 76, B: 42,
  top: 0, bot: 0,
  topSize: "M", botSize: "L",
  topOn: true, botOn: true,
  mannequin: "ivory",
  light: "softbox",
  wrinkles: true
}};

/* ---------- Scene & Renderer Setup ---------- */
let renderer;
try {{
  renderer = new THREE.WebGLRenderer({{antialias: true, alpha: true, powerPreference: "high-performance"}});
}} catch(e) {{
  stage.innerHTML = '<p style="padding:24px">Perangkat tidak mendukung WebGL.</p>';
  return;
}}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);

/* ---------- Studio Lighting System ---------- */
const hemiLight = new THREE.HemisphereLight(0xfff6ee, 0x8a847e, 0.65);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xfff8f2, 1.15);
keyLight.position.set(1.6, 2.8, 2.5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.bias = -0.0003;
keyLight.shadow.camera.left = -1.2;
keyLight.shadow.camera.right = 1.2;
keyLight.shadow.camera.top = 2.4;
keyLight.shadow.camera.bottom = -0.5;
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 8;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xd8e6ff, 0.45);
fillLight.position.set(-2.2, 1.8, 2.0);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffeed6, 0.85);
rimLight.position.set(-1.8, 2.5, -2.8);
scene.add(rimLight);

const topLight = new THREE.DirectionalLight(0xffffff, 0.35);
topLight.position.set(0, 4.0, 0.5);
scene.add(topLight);

function setLightingPreset(preset){{
  state.light = preset;
  if(preset === 'softbox'){{
    hemiLight.color.set(0xfff6ee); hemiLight.intensity = 0.65;
    keyLight.color.set(0xfff8f2); keyLight.intensity = 1.15;
    fillLight.color.set(0xd8e6ff); fillLight.intensity = 0.45;
    rimLight.intensity = 0.85;
  }} else if(preset === 'editorial'){{
    hemiLight.intensity = 0.40;
    keyLight.intensity = 1.35;
    fillLight.intensity = 0.30;
    rimLight.color.set(0xffd8b0); rimLight.intensity = 1.4;
  }} else if(preset === 'bright'){{
    hemiLight.intensity = 0.85;
    keyLight.intensity = 1.05;
    fillLight.intensity = 0.65;
    rimLight.intensity = 0.5;
  }}
}}

/* Floor Shadow & Studio Pedestal */
const floorGroup = new THREE.Group();
const floorGeo = new THREE.CircleGeometry(2.4, 64);
const floorShadowMat = new THREE.ShadowMaterial({{opacity: 0.24}});
const floorMesh = new THREE.Mesh(floorGeo, floorShadowMat);
floorMesh.rotation.x = -Math.PI / 2;
floorMesh.position.y = -0.01;
floorMesh.receiveShadow = true;
floorGroup.add(floorMesh);

const padMat = new THREE.MeshStandardMaterial({{color: 0xded9cf, roughness: 0.5, metalness: 0.08}});
const padMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.40, 0.02, 48), padMat);
padMesh.position.y = -0.01;
padMesh.receiveShadow = true;
floorGroup.add(padMesh);
scene.add(floorGroup);

/* Controls */
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 1.2;
controls.maxDistance = 4.8;
controls.autoRotateSpeed = 2.0;

/* Main Hierarchical 3D Groups */
const world = new THREE.Group();
world.scale.setScalar(SC);
scene.add(world);

const mannequinGroup = new THREE.Group();
const topGroup = new THREE.Group();
const botGroup = new THREE.Group();
world.add(mannequinGroup);
world.add(topGroup);
world.add(botGroup);

function resetCam(){{
  const h = state.H * SC;
  controls.target.set(0, h * 0.52, 0);
  camera.position.set(0, h * 0.56, h * 2.35);
  controls.update();
}}

function resize(){{
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}}
new ResizeObserver(resize).observe(stage);
stage.addEventListener('dblclick', resetCam);

/* ---------- Texture & Pre-compiled Materials Engine ---------- */
const texLoader = new THREE.TextureLoader();

function loadTexture(src, isRepeat, rx, ry, ox){{
  if(!src) return null;
  const tx = texLoader.load(src, function(texture){{
    texture.needsUpdate = true;
    if(renderer) renderer.render(scene, camera);
  }});
  tx.encoding = THREE.sRGBEncoding;
  if(isRepeat){{
    tx.wrapS = THREE.RepeatWrapping;
    tx.wrapT = THREE.RepeatWrapping;
    tx.repeat.set(rx || 1, ry || 1);
  }} else {{
    tx.wrapS = THREE.RepeatWrapping;
    tx.wrapT = THREE.ClampToEdgeWrapping;
    tx.repeat.set(rx || 1, ry || 1);
  }}
  if(ox !== undefined) tx.offset.x = ox;
  return tx;
}}

// Pre-load normal maps
const normalTextures = {{}};
Object.keys(normals).forEach(k => {{
  const isTiling = k.startsWith('fabric_');
  normalTextures[k] = loadTexture(normals[k], isTiling, isTiling ? 3 : 1, isTiling ? 3 : 1, 0);
}});

// Stand materials
const chromeMat = new THREE.MeshStandardMaterial({{color: 0xdcdcdc, metalness: 0.95, roughness: 0.12}});
const castIronMat = new THREE.MeshStandardMaterial({{color: 0x222224, metalness: 0.4, roughness: 0.5}});

// Mannequin Materials (Warm Ivory dengan kontras jelas)
const mannequinMaterials = {{
  ivory: new THREE.MeshPhysicalMaterial({{
    color: 0xddd7ce, roughness: 0.42, metalness: 0.02,
    clearcoat: 0.25, clearcoatRoughness: 0.35
  }}),
  skin: new THREE.MeshPhysicalMaterial({{
    color: 0xc8a896, roughness: 0.48, metalness: 0.0,
    clearcoat: 0.25, clearcoatRoughness: 0.38
  }}),
  charcoal: new THREE.MeshPhysicalMaterial({{
    color: 0x242326, roughness: 0.36, metalness: 0.05,
    clearcoat: 0.55, clearcoatRoughness: 0.3
  }})
}};

function getMannequinMaterial(){{
  return mannequinMaterials[state.mannequin] || mannequinMaterials.ivory;
}}

// Pre-create all product materials with correct textures
const topMaterials = [];
catalog.tops.forEach((p, idx) => {{
  const fType = p.fabric_type || 'cotton';
  const torsoDiffuse = loadTexture(p.torso_b64 || p.torso_url, false, -1, 1, 0.75);
  const sleeveDiffuse = loadTexture(p.sleeve_b64 || p.sleeve_url, true, 2, 2, 0);

  const torsoMat = new THREE.MeshPhysicalMaterial({{
    color: torsoDiffuse ? 0xffffff : (p.color_hex || 0xffffff),
    map: torsoDiffuse,
    normalMap: normalTextures.top_wrinkles || null,
    normalScale: new THREE.Vector2(0.9, 0.9),
    roughness: 0.85,
    metalness: 0.02,
    sheen: 0.72,
    sheenColor: new THREE.Color(0xffffff),
    sheenRoughness: 0.55,
    side: THREE.DoubleSide
  }});

  const sleeveMat = new THREE.MeshPhysicalMaterial({{
    color: sleeveDiffuse ? 0xffffff : (p.color_hex || 0xffffff),
    map: sleeveDiffuse,
    normalMap: normalTextures['fabric_' + fType] || normalTextures.fabric_cotton || null,
    normalScale: new THREE.Vector2(1.0, 1.0),
    roughness: 0.85,
    metalness: 0.02,
    sheen: 0.72,
    sheenColor: new THREE.Color(0xffffff),
    sheenRoughness: 0.55,
    side: THREE.DoubleSide
  }});

  topMaterials.push({{torso: torsoMat, sleeve: sleeveMat}});
}});

const botMaterials = [];
catalog.bottoms.forEach((p, idx) => {{
  const fType = p.fabric_type || 'denim';
  const waistDiffuse = loadTexture(p.waist_b64 || p.waist_url, false, -1, 1, 0.75);
  const legDiffuse = loadTexture(p.leg_b64 || p.leg_url, true, 2, 3, 0);

  const waistMat = new THREE.MeshPhysicalMaterial({{
    color: waistDiffuse ? 0xffffff : (p.color_hex || 0xffffff),
    map: waistDiffuse,
    normalMap: normalTextures.pants_wrinkles || null,
    normalScale: new THREE.Vector2(0.95, 0.95),
    roughness: 0.86,
    metalness: 0.02,
    sheen: 0.72,
    sheenColor: new THREE.Color(0xffffff),
    sheenRoughness: 0.55,
    side: THREE.DoubleSide
  }});

  const legMat = new THREE.MeshPhysicalMaterial({{
    color: legDiffuse ? 0xffffff : (p.color_hex || 0xffffff),
    map: legDiffuse,
    normalMap: normalTextures['fabric_' + fType] || normalTextures.fabric_denim || null,
    normalScale: new THREE.Vector2(1.1, 1.1),
    roughness: 0.86,
    metalness: 0.02,
    sheen: 0.72,
    sheenColor: new THREE.Color(0xffffff),
    sheenRoughness: 0.55,
    side: THREE.DoubleSide
  }});

  botMaterials.push({{waist: waistMat, leg: legMat}});
}});

/* ---------- Geometry Helpers ---------- */
const rad = c => c / (2 * Math.PI);
const SX = 1.18, SZ = 0.82;

function createLatheMesh(pts, mat, sx, sz){{
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], 0)));
  const v = curve.getPoints(52).map(p => new THREE.Vector2(Math.max(p.x, 0.1), p.y));
  const m = new THREE.Mesh(new THREE.LatheGeometry(v, 52), mat);
  m.scale.set(sx || 1, 1, sz || 1);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}}

function createCylMesh(rt, rb, y0, y1, x, mat){{
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, y1 - y0, 32, 1, true), mat);
  m.position.set(x, (y0 + y1) / 2, 0);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}}

function createTorusRing(rMajor, rMinor, y, mat, sx, sz){{
  const m = new THREE.Mesh(new THREE.TorusGeometry(rMajor, rMinor, 16, 48), mat);
  m.rotation.x = Math.PI / 2;
  m.position.y = y;
  m.scale.set(sx || 1, sz || 1, 1);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}}

function fitStatus(diff, tightLimit, looseLimit){{
  if(diff < tightLimit) return {{label: "Ketat (Slim)", class: "status-ketat"}};
  if(diff > looseLimit) return {{label: "Longgar (Relaxed)", class: "status-longgar"}};
  return {{label: "Pas (Ideal)", class: "status-pas"}};
}}

/* ---------- Persistent 3D Mesh References ---------- */
let torsoSkinMesh, leftLegSkinMesh, rightLegSkinMesh;
let leftFootMesh, rightFootMesh, neckMesh, headGroup;
let leftArmSkinGroup, rightArmSkinGroup;
let poleMesh, standBaseMesh, standPlateMesh;

let topTorsoMesh, topCollarMesh, topHemMesh;
let leftSleeveGroup, rightSleeveGroup;
let leftSleeveTube, leftSleeveCap, leftSleeveCuff;
let rightSleeveTube, rightSleeveCap, rightSleeveCuff;

let botWaistMesh, botWaistRimMesh;
let botLeftLegMesh, botRightLegMesh;
let botLeftCuffMesh, botRightCuffMesh;

function clearGroup(g){{
  while(g.children.length){{
    const o = g.children.pop();
    o.traverse(n => {{
      if(n.geometry) n.geometry.dispose();
    }});
  }}
}}

/* ---------- Full Geometries Builder ---------- */
function buildAllGeometries(){{
  clearGroup(mannequinGroup);
  clearGroup(topGroup);
  clearGroup(botGroup);

  const {{H, W, C, P, B}} = state;
  const hip = Math.max(C, P + 18);
  const bmi = W / Math.pow(H / 100, 2);
  const armR = Math.min(6, Math.max(3.6, 4.2 + (bmi - 22) * 0.15));
  const chestR = rad(C), waistR = rad(P), hipR = rad(hip);
  const shR = Math.max(8, (B / 2 - armR * 0.9) / SX);
  const neckR = Math.max(4.6, H * 0.026);
  const yCr = 0.47 * H, yHip = 0.52 * H, ySh = 0.80 * H, yNk = 0.84 * H;
  const e = 0.55;

  const skinMat = getMannequinMaterial();
  const curTopMat = topMaterials[state.top] || topMaterials[0];
  const curBotMat = botMaterials[state.bot] || botMaterials[0];

  // 1. Manekin Torso
  const rows = [
    [0.47, hipR * 0.88, 0],
    [0.52, hipR, 0.97],
    [0.56, hipR * 0.93, 0.97],
    [0.62, waistR, 0.96],
    [0.67, waistR + (chestR - waistR) * 0.72, 0.98],
    [0.72, chestR, 1.0],
    [0.76, chestR * 0.94, 0.93],
    [0.795, shR * 0.96, 0.4],
    [0.812, shR, 0],
    [0.828, shR * 0.52 + neckR * 0.48, 0],
    [0.838, neckR * 1.15, 0],
    [0.852, neckR, 0]
  ];
  torsoSkinMesh = createLatheMesh(rows.map(r => [r[1], r[0] * H]), skinMat, SX, SZ);
  mannequinGroup.add(torsoSkinMesh);

  // 2. Kaki Manekin
  const legTop = hipR * 0.62, ankle = Math.max(2.8, legTop * 0.34), lx = hipR * SX * 0.5;
  const legPts = add => [
    [legTop + add, yCr + 0.015 * H],
    [legTop * 0.93 + add, 0.38 * H],
    [legTop * 0.64 + add, 0.285 * H],
    [legTop * 0.68 + add, 0.20 * H],
    [legTop * 0.45 + add, 0.12 * H],
    [ankle + add, 0.045 * H],
    [ankle * 0.95 + add, 0.03 * H]
  ];

  leftLegSkinMesh = createLatheMesh(legPts(0), skinMat);
  leftLegSkinMesh.position.x = -lx;
  mannequinGroup.add(leftLegSkinMesh);

  rightLegSkinMesh = createLatheMesh(legPts(0), skinMat);
  rightLegSkinMesh.position.x = lx;
  mannequinGroup.add(rightLegSkinMesh);

  leftFootMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), skinMat);
  leftFootMesh.scale.set(ankle * 1.25, 0.028 * H, 0.075 * H);
  leftFootMesh.position.set(-lx, 0.025 * H, 0.035 * H);
  leftFootMesh.castShadow = true; leftFootMesh.receiveShadow = true;
  mannequinGroup.add(leftFootMesh);

  rightFootMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), skinMat);
  rightFootMesh.scale.set(ankle * 1.25, 0.028 * H, 0.075 * H);
  rightFootMesh.position.set(lx, 0.025 * H, 0.035 * H);
  rightFootMesh.castShadow = true; rightFootMesh.receiveShadow = true;
  mannequinGroup.add(rightFootMesh);

  // 3. Leher, Kepala Manekin & Stand Studio
  neckMesh = createCylMesh(neckR, neckR * 1.05, yNk - 0.01 * H, yNk + 0.045 * H, 0, skinMat);
  mannequinGroup.add(neckMesh);

  headGroup = new THREE.Group();
  headGroup.position.set(0, 0.93 * H, 0.005 * H);

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.065 * H, 40, 32), skinMat);
  cranium.scale.set(0.86, 1.12, 0.96);
  cranium.castShadow = true; cranium.receiveShadow = true;
  headGroup.add(cranium);

  const jaw = new THREE.Mesh(new THREE.ConeGeometry(0.042 * H, 0.05 * H, 32), skinMat);
  jaw.rotation.x = Math.PI;
  jaw.position.set(0, -0.038 * H, 0.012 * H);
  jaw.scale.set(0.85, 1, 0.7);
  jaw.castShadow = true; jaw.receiveShadow = true;
  headGroup.add(jaw);

  headGroup.add(createTorusRing(neckR * 1.08, 0.45, -0.065 * H, chromeMat));
  mannequinGroup.add(headGroup);

  const poleHeight = 0.55 * H;
  poleMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, poleHeight, 32), chromeMat);
  poleMesh.position.set(0, poleHeight / 2 - 0.8, -0.08 * H);
  poleMesh.castShadow = true; poleMesh.receiveShadow = true;
  mannequinGroup.add(poleMesh);

  standBaseMesh = new THREE.Mesh(new THREE.CylinderGeometry(19, 20, 2.2, 48), castIronMat);
  standBaseMesh.position.set(0, -1.0, 0);
  standBaseMesh.receiveShadow = true;
  mannequinGroup.add(standBaseMesh);

  standPlateMesh = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 0.3, 48), chromeMat);
  standPlateMesh.position.set(0, 0.2, 0);
  standPlateMesh.receiveShadow = true;
  mannequinGroup.add(standPlateMesh);

  // Lengan Kulit Manekin
  function createArm(side){{
    const g = new THREE.Group();
    g.position.set(side * B / 2, ySh, 0);
    g.rotation.z = side * 0.09;

    const armSkin = createLatheMesh([
      [armR * 0.98, -0.012 * H], [armR, -0.06 * H], [armR * 0.86, -0.15 * H],
      [armR * 0.78, -0.18 * H], [armR * 0.8, -0.215 * H], [armR * 0.56, -0.29 * H],
      [armR * 0.5, -0.31 * H]
    ], skinMat);
    g.add(armSkin);

    const shJoint = new THREE.Mesh(new THREE.SphereGeometry(armR, 24, 16), skinMat);
    shJoint.position.y = -0.012 * H;
    shJoint.castShadow = true; shJoint.receiveShadow = true;
    g.add(shJoint);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 16), skinMat);
    hand.scale.set(armR * 0.62, armR * 1.15, armR * 0.42);
    hand.position.y = -0.335 * H;
    hand.castShadow = true; hand.receiveShadow = true;
    g.add(hand);

    return g;
  }}
  leftArmSkinGroup = createArm(-1);
  rightArmSkinGroup = createArm(1);
  mannequinGroup.add(leftArmSkinGroup);
  mannequinGroup.add(rightArmSkinGroup);

  // 4. Pakaian Atasan (Top Group)
  const sizeC = TOP_SIZES[state.topSize], sizeR = rad(sizeC), dTop = sizeC - C;
  const topStatus = fitStatus(dTop, 2, 14);
  document.getElementById('fitTop').textContent = `${{topStatus.label}} (${{dTop > 0 ? '+' : ''}}${{dTop}} cm)`;
  document.getElementById('dotTop').className = `chip-status ${{topStatus.class}}`;

  const gp = rows.slice(1, 10).map(r => [r[2] ? Math.max(r[1] + e, sizeR * r[2]) : r[1] + e + 0.4, r[0] * H]);
  gp.push([neckR + 1.6, 0.836 * H]);
  topTorsoMesh = createLatheMesh(gp, curTopMat.torso, SX, SZ);
  topGroup.add(topTorsoMesh);

  topCollarMesh = createTorusRing(neckR + 1.8, 0.55, 0.838 * H, curTopMat.sleeve, SX * 1.02, SZ * 1.02);
  topGroup.add(topCollarMesh);

  const hemR = rows[1][1] + e + 0.4;
  topHemMesh = createTorusRing(hemR, 0.45, rows[1][0] * H, curTopMat.sleeve, SX, SZ);
  topGroup.add(topHemMesh);

  const sl = Math.max(armR * 1.08 + e, armR + (sizeC - C) * 0.05);

  function createSleeve(side){{
    const g = new THREE.Group();
    g.position.set(side * B / 2, ySh, 0);
    g.rotation.z = side * 0.09;

    const tube = new THREE.Mesh(new THREE.CylinderGeometry(sl, sl * 0.93, 0.138 * H, 32, 1, true), curTopMat.sleeve);
    tube.position.y = -0.081 * H;
    tube.castShadow = true; tube.receiveShadow = true;
    g.add(tube);

    const cap = new THREE.Mesh(new THREE.SphereGeometry(sl, 24, 16), curTopMat.sleeve);
    cap.position.y = -0.012 * H;
    cap.scale.y = 0.9;
    cap.castShadow = true; cap.receiveShadow = true;
    g.add(cap);

    const cuff = createTorusRing(sl * 0.93, 0.45, -0.15 * H, curTopMat.sleeve);
    g.add(cuff);

    return {{group: g, tube, cap, cuff}};
  }}

  const lSl = createSleeve(-1);
  leftSleeveGroup = lSl.group; leftSleeveTube = lSl.tube; leftSleeveCap = lSl.cap; leftSleeveCuff = lSl.cuff;
  topGroup.add(leftSleeveGroup);

  const rSl = createSleeve(1);
  rightSleeveGroup = rSl.group; rightSleeveTube = rSl.tube; rightSleeveCap = rSl.cap; rightSleeveCuff = rSl.cuff;
  topGroup.add(rightSleeveGroup);

  topGroup.visible = state.topOn;

  // 5. Pakaian Celana (Bot Group)
  const sizeP = BOT_SIZES[state.botSize], dBot = sizeP - P;
  const botStatus = fitStatus(dBot, 1, 12);
  document.getElementById('fitBot').textContent = `${{botStatus.label}} (${{dBot > 0 ? '+' : ''}}${{dBot}} cm)`;
  document.getElementById('dotBot').className = `chip-status ${{botStatus.class}}`;

  const loose = Math.max(0, sizeP - P) * 0.035;
  const wR = Math.max(waistR + e, rad(sizeP));

  botWaistMesh = createLatheMesh([
    [wR, 0.64 * H],
    [Math.max(hipR * 0.93 + e, (wR + hipR) / 2), 0.56 * H],
    [Math.max(hipR + e, wR * 1.04), yHip],
    [hipR * 0.9 + e, yCr]
  ], curBotMat.waist, SX, SZ);
  botGroup.add(botWaistMesh);

  botWaistRimMesh = createTorusRing(wR + 0.4, 0.5, 0.64 * H, curBotMat.waist, SX, SZ);
  botGroup.add(botWaistRimMesh);

  botLeftLegMesh = createLatheMesh(legPts(e + loose).slice(0, 6), curBotMat.leg);
  botLeftLegMesh.position.x = -lx;
  botGroup.add(botLeftLegMesh);

  botRightLegMesh = createLatheMesh(legPts(e + loose).slice(0, 6), curBotMat.leg);
  botRightLegMesh.position.x = lx;
  botGroup.add(botRightLegMesh);

  const cuffR = ankle + e + loose;
  botLeftCuffMesh = createTorusRing(cuffR + 0.3, 0.45, 0.045 * H, curBotMat.leg);
  botLeftCuffMesh.position.x = -lx;
  botGroup.add(botLeftCuffMesh);

  botRightCuffMesh = createTorusRing(cuffR + 0.3, 0.45, 0.045 * H, curBotMat.leg);
  botRightCuffMesh.position.x = lx;
  botGroup.add(botRightCuffMesh);

  botGroup.visible = state.botOn;
}}

/* ---------- Smooth Subtle Breath Animation saat Ganti Produk ---------- */
function triggerSmoothTransition(targetGroup){{
  const startTime = performance.now();
  const duration = 260;
  const minScale = 0.95;

  function step(now){{
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1.0);
    const ease = 1 - Math.pow(1 - t, 3);
    const s = minScale + (1.0 - minScale) * ease;
    // Scale horizontal (X dan Z) agar baju tampak bernafas halus tanpa tergeser vertikal
    targetGroup.scale.set(s, 1.0, s);

    if(t < 1.0){{
      requestAnimationFrame(step);
    }} else {{
      targetGroup.scale.set(1, 1, 1);
    }}
  }}
  requestAnimationFrame(step);
}}

/* ---------- Instant Material Swapping (100% Reliable & Visible) ---------- */
function switchTopProduct(idx){{
  state.top = idx;
  const mats = topMaterials[idx];
  if(!mats) return;

  if(topTorsoMesh){{
    topTorsoMesh.material = mats.torso;
    topTorsoMesh.material.needsUpdate = true;
    if(topTorsoMesh.material.map) topTorsoMesh.material.map.needsUpdate = true;
  }}
  if(topCollarMesh){{
    topCollarMesh.material = mats.sleeve;
    topCollarMesh.material.needsUpdate = true;
  }}
  if(topHemMesh){{
    topHemMesh.material = mats.sleeve;
    topHemMesh.material.needsUpdate = true;
  }}

  const sleeveMeshes = [leftSleeveTube, leftSleeveCap, leftSleeveCuff, rightSleeveTube, rightSleeveCap, rightSleeveCuff];
  sleeveMeshes.forEach(m => {{
    if(m){{
      m.material = mats.sleeve;
      m.material.needsUpdate = true;
      if(m.material.map) m.material.map.needsUpdate = true;
    }}
  }});

  triggerSmoothTransition(topGroup);
  updateDesc('top');
  renderer.render(scene, camera);
}}

function switchBottomProduct(idx){{
  state.bot = idx;
  const mats = botMaterials[idx];
  if(!mats) return;

  if(botWaistMesh){{
    botWaistMesh.material = mats.waist;
    botWaistMesh.material.needsUpdate = true;
    if(botWaistMesh.material.map) botWaistMesh.material.map.needsUpdate = true;
  }}
  if(botWaistRimMesh){{
    botWaistRimMesh.material = mats.waist;
    botWaistRimMesh.material.needsUpdate = true;
  }}

  const legMeshes = [botLeftLegMesh, botRightLegMesh, botLeftCuffMesh, botRightCuffMesh];
  legMeshes.forEach(m => {{
    if(m){{
      m.material = mats.leg;
      m.material.needsUpdate = true;
      if(m.material.map) m.material.map.needsUpdate = true;
    }}
  }});

  triggerSmoothTransition(botGroup);
  updateDesc('bot');
  renderer.render(scene, camera);
}}

function updateMannequinFinish(){{
  const newSkinMat = getMannequinMaterial();
  mannequinGroup.traverse(o => {{
    if(o.isMesh && o.material !== chromeMat && o.material !== castIronMat){{
      o.material = newSkinMat;
      o.material.needsUpdate = true;
    }}
  }});
  renderer.render(scene, camera);
}}

function updateWrinklesToggling(){{
  const scale = state.wrinkles ? 0.95 : 0.001;
  topMaterials.forEach(m => {{
    if(m.torso.normalScale) m.torso.normalScale.set(scale, scale);
    if(m.sleeve.normalScale) m.sleeve.normalScale.set(scale, scale);
    m.torso.needsUpdate = true;
    m.sleeve.needsUpdate = true;
  }});
  botMaterials.forEach(m => {{
    if(m.waist.normalScale) m.waist.normalScale.set(scale, scale);
    if(m.leg.normalScale) m.leg.normalScale.set(scale, scale);
    m.waist.needsUpdate = true;
    m.leg.needsUpdate = true;
  }});
  renderer.render(scene, camera);
}}

/* ---------- UI Controller & Event Handlers ---------- */
const sliders = {{H: 'H', W: 'W', C: 'C', P: 'P', B: 'B'}};
const unit = {{H: ' cm', W: ' kg', C: ' cm', P: ' cm', B: ' cm'}};

function syncOut(id){{
  const el = document.getElementById(id);
  el.nextElementSibling.textContent = el.value + unit[id];
}}

Object.keys(sliders).forEach(id => {{
  const el = document.getElementById(id);
  syncOut(id);
  el.addEventListener('input', () => {{
    state[id] = +el.value;
    syncOut(id);
    buildAllGeometries();
  }});
}});

function setSlider(id, v){{
  const el = document.getElementById(id);
  el.value = Math.round(v);
  state[id] = +el.value;
  syncOut(id);
}}

document.getElementById('est').addEventListener('click', () => {{
  const bmi = state.W / Math.pow(state.H / 100, 2), d = bmi - 22;
  setSlider('C', 88 + d * 2.6 + (state.H - 170) * 0.3);
  setSlider('P', 74 + d * 3.0 + (state.H - 170) * 0.15);
  setSlider('B', state.H * 0.245 + d * 0.2);
  buildAllGeometries();
}});

function fillSizes(id, obj, key){{
  const s = document.getElementById(id);
  Object.keys(obj).forEach(k => {{
    const o = document.createElement('option');
    o.value = o.textContent = k;
    s.appendChild(o);
  }});
  s.value = state[key];
  s.addEventListener('change', () => {{
    state[key] = s.value;
    buildAllGeometries();
  }});
}}
fillSizes('topSize', TOP_SIZES, 'topSize');
fillSizes('botSize', BOT_SIZES, 'botSize');

function updateDesc(kind){{
  if(kind === 'top'){{
    const p = catalog.tops[state.top];
    document.getElementById('topDesc').innerHTML = `<b>${{p.name}}</b> (${{p.price}})<br>${{p.desc}}`;
  }} else {{
    const p = catalog.bottoms[state.bot];
    document.getElementById('botDesc').innerHTML = `<b>${{p.name}}</b> (${{p.price}})<br>${{p.desc}}`;
  }}
}}

function fillProds(boxId, kind, list){{
  const box = document.getElementById(boxId);
  box.innerHTML = '';
  list.forEach((p, i) => {{
    const card = document.createElement('div');
    card.className = 'prod-card' + (i === state[kind] ? ' on' : '');
    const thumbSrc = p.thumb_b64 || p.thumb_url;
    card.innerHTML = `
      <div class="img-box"><img src="${{thumbSrc}}" alt="${{p.name}}"></div>
      <div class="p-name">${{p.name}}</div>
      <div class="p-price">${{p.price}}</div>
    `;
    card.onclick = function(e){{
      e.preventDefault();
      [...box.children].forEach(c => c.classList.remove('on'));
      card.classList.add('on');
      if(kind === 'top'){{
        switchTopProduct(i);
      }} else {{
        switchBottomProduct(i);
      }}
    }};
    box.appendChild(card);
  }});
  updateDesc(kind);
}}

fillProds('topProds', 'top', catalog.tops);
fillProds('botProds', 'bot', catalog.bottoms);

// Lighting presets
document.querySelectorAll('#lightPreset button').forEach(btn => {{
  btn.addEventListener('click', () => {{
    document.querySelectorAll('#lightPreset button').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    setLightingPreset(btn.dataset.val);
  }});
}});

// Mannequin finish styles
document.querySelectorAll('#mannequinStyle button').forEach(btn => {{
  btn.addEventListener('click', () => {{
    document.querySelectorAll('#mannequinStyle button').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    state.mannequin = btn.dataset.val;
    updateMannequinFinish();
  }});
}});

document.getElementById('wrinklesOn').addEventListener('change', e => {{
  state.wrinkles = e.target.checked;
  updateWrinklesToggling();
}});

// Checkboxes: Hanya toggle visibility tanpa menghapus manekin!
document.getElementById('topOn').addEventListener('change', e => {{
  state.topOn = e.target.checked;
  topGroup.visible = state.topOn;
  const dTop = TOP_SIZES[state.topSize] - state.C;
  const topStatus = fitStatus(dTop, 2, 14);
  document.getElementById('fitTop').textContent = state.topOn ? `${{topStatus.label}} (${{dTop > 0 ? '+' : ''}}${{dTop}} cm)` : "-";
  document.getElementById('dotTop').className = `chip-status ${{state.topOn ? topStatus.class : ''}}`;
}});

document.getElementById('botOn').addEventListener('change', e => {{
  state.botOn = e.target.checked;
  botGroup.visible = state.botOn;
  const dBot = BOT_SIZES[state.botSize] - state.P;
  const botStatus = fitStatus(dBot, 1, 12);
  document.getElementById('fitBot').textContent = state.botOn ? `${{botStatus.label}} (${{dBot > 0 ? '+' : ''}}${{dBot}} cm)` : "-";
  document.getElementById('dotBot').className = `chip-status ${{state.botOn ? botStatus.class : ''}}`;
}});

const spin = document.getElementById('spin');
spin.addEventListener('click', () => {{
  controls.autoRotate = !controls.autoRotate;
  spin.classList.toggle('on', controls.autoRotate);
}});
document.getElementById('reset').addEventListener('click', resetCam);

/* ---------- Eksekusi Awal ---------- */
resize();
buildAllGeometries();
resetCam();

(function loop(){{
  requestAnimationFrame(loop);
  controls.update();
  renderer.render(scene, camera);
}})();

window.__VIEWER__ = {{
  state,
  topGroup,
  botGroup,
  mannequinGroup,
  switchTopProduct,
  switchBottomProduct,
  topMaterials,
  botMaterials
}};
}})();
</script>
</body>
</html>
'''

with open('gunakan-viewer (1).html', 'w', encoding='utf-8') as f:
    f.write(html_content)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print(f"Selesai! gunakan-viewer (1).html dan index.html berhasil dikompilasi ({len(html_content)} bytes).")
