/**
 * Clothing Rail Hero — Ruang Kurasi 3D (Desain Murni)
 * Khusus menampilkan estetika gantungan & baju 3D interaktif.
 * Tanpa teks, tanpa label harga, tanpa deskripsi.
 */

const VB_W = 200;
const VB_H = 310;
const HOOK = "M100,36 L100,-0.4 C100,-3.4 102.2,-4.2 103.9,-2.8 C104.9,-2 105.4,-1.2 105.6,-0.2";
const HOOK_HI = "M99.5,30 L99.5,-0.2 C99.5,-2.4 101,-3.2 102.4,-2.6";
const BAR = "M38,57 Q70,38 100,36 Q130,38 162,57";
const BAR_HI = "M40,54.5 Q71,35.5 100,33.5 Q129,35.5 160,54.5";
const CREW = "M80,34 C88,45 112,45 120,34";

const ART = {
  tee: {
    front: {
      body: `${CREW} C132,36 146,40 156,45 C160,48 163,52 164,57 C158,72 152,88 152,102 L153,236 C128,241 72,241 47,236 L48,102 C48,88 42,72 36,57 C37,52 40,48 44,45 C54,40 68,36 80,34 Z`,
      sleeves: ["M44,45 C38,47 33,50 31,55 C24,64 17,76 13,92 C18,100 24,106 30,110 C35,106 42,102 48,102 C47,84 45,62 44,45 Z", "M156,45 C162,47 167,50 169,55 C176,64 183,76 187,92 C182,100 176,106 170,110 C165,106 158,102 152,102 C153,84 155,62 156,45 Z"],
      under: "M80,34 C90,30 110,30 120,34 C112,45 88,45 80,34 Z",
      ribs: ["M80,34 C88,45 112,45 120,34 L124,36 C114,50 86,50 76,36 Z"],
      panels: [],
      seams: ["M80,34 C68,36 54,40 44,45", "M120,34 C132,36 146,40 156,45", "M48,102 C47,84 45,62 44,45", "M152,102 C153,84 155,62 156,45"],
      stitches: ["M14,93 C19,101 25,106 30,109", "M186,93 C181,101 175,106 170,109", "M50,229 C74,233 126,233 150,229"],
      folds: ["M40,56 C58,76 76,94 90,120", "M160,56 C142,76 124,94 110,120", "M70,126 C66,164 72,204 66,234", "M131,128 C135,164 129,204 134,234", "M100,112 C98,160 103,204 100,236", "M31,62 C27,74 23,84 21,96", "M169,62 C173,74 177,84 179,96", "M78,50 C88,58 112,58 122,50"],
    },
    back: {
      body: "M80,34 C90,31 110,31 120,34 C132,36 146,40 156,45 C160,48 163,52 164,57 C158,72 152,88 152,102 L153,236 C128,241 72,241 47,236 L48,102 C48,88 42,72 36,57 C37,52 40,48 44,45 C54,40 68,36 80,34 Z",
      sleeves: ["M44,45 C38,47 33,50 31,55 C24,64 17,76 13,92 C18,100 24,106 30,110 C35,106 42,102 48,102 C47,84 45,62 44,45 Z", "M156,45 C162,47 167,50 169,55 C176,64 183,76 187,92 C182,100 176,106 170,110 C165,106 158,102 152,102 C153,84 155,62 156,45 Z"],
      ribs: ["M80,34 C90,31 110,31 120,34 L121,38 C110,35 90,35 79,38 Z"],
      panels: [],
      seams: ["M80,34 C68,36 54,40 44,45", "M120,34 C132,36 146,40 156,45"],
      stitches: ["M14,93 C19,101 25,106 30,109", "M186,93 C181,101 175,106 170,109", "M50,229 C74,233 126,233 150,229"],
      folds: ["M40,56 C60,74 80,88 96,104", "M160,56 C140,74 120,88 104,104", "M72,120 C68,164 74,204 68,234", "M128,122 C132,164 126,204 132,234", "M100,60 C98,150 102,200 100,236", "M31,62 C27,74 23,84 21,96", "M169,62 C173,74 177,84 179,96"],
    },
  },
  knit: {
    front: {
      body: "M80,34 C88,46 112,46 120,34 L158,46 C162,52 163,60 163,70 L163,226 C140,231 60,231 37,226 L37,70 C37,60 38,52 42,46 Z",
      sleeves: ["M42,46 C32,52 27,62 26,76 L20,216 C26,221 36,222 44,219 L47,98 C46,80 45,62 42,46 Z", "M158,46 C168,52 173,62 174,76 L180,216 C174,221 164,222 156,219 L153,98 C154,80 155,62 158,46 Z"],
      under: "M80,34 C90,30 110,30 120,34 C112,46 88,46 80,34 Z",
      ribs: ["M37,211 L163,211 L163,226 C140,231 60,231 37,226 Z", "M21,203 L45,206 L44,219 C36,222 26,221 20,216 Z", "M179,203 L155,206 L156,219 C164,222 174,221 180,216 Z", "M80,34 C88,46 112,46 120,34 L125,37 C115,53 85,53 75,37 Z"],
      panels: [],
      seams: ["M47,98 C46,80 45,62 42,46", "M153,98 C154,80 155,62 158,46"],
      stitches: [],
      folds: ["M66,60 C62,110 70,160 64,210", "M134,62 C138,112 130,162 136,210", "M100,56 C98,110 102,160 100,210", "M33,80 C31,130 33,170 30,204", "M167,80 C169,130 167,170 170,204"],
    },
    back: {
      body: "M80,34 C90,31 110,31 120,34 L158,46 C162,52 163,60 163,70 L163,226 C140,231 60,231 37,226 L37,70 C37,60 38,52 42,46 Z",
      sleeves: ["M42,46 C32,52 27,62 26,76 L20,216 C26,221 36,222 44,219 L47,98 C46,80 45,62 42,46 Z", "M158,46 C168,52 173,62 174,76 L180,216 C174,221 164,222 156,219 L153,98 C154,80 155,62 158,46 Z"],
      ribs: ["M37,211 L163,211 L163,226 C140,231 60,231 37,226 Z", "M21,203 L45,206 L44,219 C36,222 26,221 20,216 Z", "M179,203 L155,206 L156,219 C164,222 174,221 180,216 Z", "M80,34 C90,31 110,31 120,34 L122,39 C110,35 90,35 78,39 Z"],
      panels: [],
      seams: ["M47,98 C46,80 45,62 42,46", "M153,98 C154,80 155,62 158,46"],
      stitches: [],
      folds: ["M68,60 C64,110 70,160 66,210", "M132,62 C136,112 130,162 134,210", "M100,50 C99,110 101,160 100,210"],
    },
  },
  hoodie: {
    front: {
      body: "M80,36 C88,47 112,47 120,36 L160,48 C164,54 165,62 165,72 L165,228 C141,233 59,233 35,228 L35,72 C35,62 36,54 40,48 Z",
      sleeves: ["M40,48 C30,54 25,64 24,80 L18,218 C24,223 35,224 43,221 L46,100 C45,82 43,64 40,48 Z", "M160,48 C170,54 175,64 176,80 L182,218 C176,223 165,224 157,221 L154,100 C155,82 157,64 160,48 Z"],
      hood: "M72,42 C64,28 68,12 86,8 L114,8 C132,12 136,28 128,42 C116,30 84,30 72,42 Z",
      under: "M78,38 C88,31 112,31 122,38 C112,48 88,48 78,38 Z",
      ribs: ["M35,213 L165,213 L165,228 C141,233 59,233 35,228 Z", "M19,205 L45,208 L43,221 C35,224 24,223 18,218 Z", "M181,205 L155,208 L157,221 C165,224 176,223 182,218 Z"],
      panels: [{ d: "M62,148 L138,148 L150,196 L50,196 Z", t: 0.035 }, { d: "M80,36 C76,46 80,56 92,60 L96,55 C88,52 84,45 85,38 Z", t: -0.12 }, { d: "M120,36 C124,46 120,56 108,60 L104,55 C112,52 116,45 115,38 Z", t: -0.12 }],
      seams: ["M62,148 L52,186", "M138,148 L148,186", "M46,100 C45,82 43,64 40,48", "M154,100 C155,82 157,64 160,48"],
      stitches: ["M64,151 L136,151", "M51,193 L149,193"],
      folds: ["M68,64 C64,110 70,140 66,148", "M132,66 C136,110 130,140 134,148", "M100,62 C98,100 102,130 100,148", "M31,84 C29,130 31,170 28,206", "M169,84 C171,130 169,170 172,206", "M76,198 C74,204 76,208 74,212", "M124,198 C126,204 124,208 126,212"],
      cords: ["M92,50 C91,72 89,88 90,104", "M108,50 C109,72 111,88 110,104"],
    },
    back: {
      body: "M80,36 C90,32 110,32 120,36 L160,48 C164,54 165,62 165,72 L165,228 C141,233 59,233 35,228 L35,72 C35,62 36,54 40,48 Z",
      sleeves: ["M40,48 C30,54 25,64 24,80 L18,218 C24,223 35,224 43,221 L46,100 C45,82 43,64 40,48 Z", "M160,48 C170,54 175,64 176,80 L182,218 C176,223 165,224 157,221 L154,100 C155,82 157,64 160,48 Z"],
      ribs: ["M35,213 L165,213 L165,228 C141,233 59,233 35,228 Z", "M19,205 L45,208 L43,221 C35,224 24,223 18,218 Z", "M181,205 L155,208 L157,221 C165,224 176,223 182,218 Z"],
      panels: [{ d: "M76,36 C66,50 64,82 80,110 C88,120 112,120 120,110 C136,82 134,50 124,36 C112,30 88,30 76,36 Z", t: -0.06 }],
      seams: ["M100,32 L100,118", "M46,100 C45,82 43,64 40,48", "M154,100 C155,82 157,64 160,48"],
      stitches: ["M80,108 C90,116 110,116 120,108"],
      folds: ["M70,120 C66,160 72,190 68,212", "M130,120 C134,160 128,190 132,212", "M31,84 C29,130 31,170 28,206", "M169,84 C171,130 169,170 172,206"],
    },
  },
  shirt: {
    front: {
      body: "M80,34 C88,40 112,40 120,34 L160,47 C164,53 165,60 165,70 L163,232 C150,244 124,242 100,238 C76,242 50,244 37,232 L35,70 C35,60 36,53 40,47 Z",
      sleeves: ["M40,47 C30,53 26,63 25,78 L21,204 L45,206 L47,98 C46,80 44,63 40,47 Z", "M160,47 C170,53 174,63 175,78 L179,204 L155,206 L153,98 C154,80 156,63 160,47 Z"],
      under: "M80,34 C90,29 110,29 120,34 L120,39 C110,34 90,34 80,39 Z",
      ribs: [],
      panels: [
        { d: "M96,46 L104,46 L104,238 L96,238 Z", t: -0.03 },
        { d: "M55,84 L87,84 L87,118 L71,124 L55,118 Z", t: 0.02 },
        { d: "M100,48 L80,34 C78,42 74,52 69,62 L90,64 Z", t: 0.04 },
        { d: "M100,48 L120,34 C122,42 126,52 131,62 L110,64 Z", t: 0.04 }
      ],
      seams: ["M96,64 L96,238", "M104,64 L104,238", "M47,98 C46,80 44,63 40,47", "M153,98 C154,80 156,63 160,47"],
      stitches: ["M57,116 L71,121 L85,116", "M39,230 C54,239 76,238 100,234 C124,238 146,239 161,230"],
      folds: ["M66,128 C62,170 68,200 62,234", "M134,128 C138,170 132,200 138,234", "M31,90 C29,130 31,170 28,200", "M169,90 C171,130 169,170 172,200"],
      buttons: [[100, 72], [100, 102], [100, 132], [100, 162], [100, 192], [100, 222]],
    },
    back: {
      body: "M80,34 C90,30 110,30 120,34 L160,47 C164,53 165,60 165,70 L163,232 C150,244 124,242 100,238 C76,242 50,244 37,232 L35,70 C35,60 36,53 40,47 Z",
      sleeves: ["M40,47 C30,53 26,63 25,78 L21,204 L45,206 L47,98 C46,80 44,63 40,47 Z", "M160,47 C170,53 174,63 175,78 L179,204 L155,206 L153,98 C154,80 156,63 160,47 Z"],
      ribs: [],
      panels: [{ d: "M80,34 C90,30 110,30 120,34 L122,41 C110,36 90,36 78,41 Z", t: 0.03 }],
      seams: ["M36,68 C70,74 130,74 164,68", "M97,72 L97,238", "M103,72 L103,238"],
      stitches: ["M39,230 C54,239 76,238 100,234 C124,238 146,239 161,230"],
      folds: ["M70,90 C66,150 72,200 66,234", "M130,90 C134,150 128,200 134,234"],
    },
  },
  jacket: {
    front: {
      body: "M80,34 C88,40 112,40 120,34 L162,48 C166,54 167,61 167,72 L166,230 L34,230 L33,72 C33,61 34,54 38,48 Z",
      sleeves: ["M38,48 C28,54 24,64 23,80 L19,218 C26,222 37,222 44,219 L46,100 C45,82 42,64 38,48 Z", "M162,48 C172,54 176,64 177,80 L181,218 C174,222 163,222 156,219 L154,100 C155,82 158,64 162,48 Z"],
      under: "M80,34 C90,30 110,30 120,34 L122,40 C110,35 90,35 78,40 Z",
      ribs: [],
      panels: [
        { d: "M100,58 L106,58 L106,230 L100,230 Z", t: -0.07 },
        { d: "M46,152 L88,152 L88,198 L46,198 Z", t: 0.025 },
        { d: "M112,152 L154,152 L154,198 L112,198 Z", t: 0.025 },
        { d: "M100,58 L80,34 C72,40 64,50 58,64 L90,72 Z", t: -0.04 },
        { d: "M100,58 L120,34 C128,40 136,50 142,64 L110,72 Z", t: -0.04 }
      ],
      seams: ["M100,58 L100,230", "M46,100 C45,82 42,64 38,48", "M154,100 C155,82 158,64 162,48"],
      stitches: ["M48,154 L86,154 L86,196 L48,196 Z", "M114,154 L152,154 L152,196 L114,196 Z", "M35,224 L165,224"],
      folds: ["M70,74 C66,110 72,130 68,150", "M130,122 C134,136 130,146 132,150", "M68,200 C66,212 70,220 66,228"],
      buttons: [[106, 84], [106, 118], [106, 152], [106, 186]],
    },
    back: {
      body: "M80,34 C90,30 110,30 120,34 L162,48 C166,54 167,61 167,72 L166,230 L34,230 L33,72 C33,61 34,54 38,48 Z",
      sleeves: ["M38,48 C28,54 24,64 23,80 L19,218 C26,222 37,222 44,219 L46,100 C45,82 42,64 38,48 Z", "M162,48 C172,54 176,64 177,80 L181,218 C174,222 163,222 156,219 L154,100 C155,82 158,64 162,48 Z"],
      ribs: [],
      panels: [],
      seams: ["M36,76 C70,82 130,82 164,76"],
      stitches: ["M35,224 L165,224"],
      folds: ["M70,90 C66,150 72,196 68,228", "M130,90 C134,150 128,196 132,228"],
    },
  },
  coat: {
    front: {
      body: "M80,34 C88,40 112,40 120,34 L164,50 C168,56 169,63 169,74 L174,294 L26,294 L31,74 C31,63 32,56 36,50 Z",
      sleeves: ["M36,50 C26,56 22,66 21,82 L16,240 C23,244 34,244 42,241 L45,104 C44,86 40,66 36,50 Z", "M164,50 C174,56 178,66 179,82 L184,240 C177,244 166,244 158,241 L155,104 C156,86 160,66 164,50 Z"],
      under: "M80,34 C90,28 110,28 120,34 L118,42 C110,37 90,37 82,42 Z",
      ribs: [],
      panels: [
        { d: "M100,128 L106,128 L106,294 L100,294 Z", t: -0.06 },
        { d: "M100,128 L80,34 C74,44 70,56 66,72 L76,78 L70,90 Z", t: 0.045 },
        { d: "M100,128 L120,34 C126,44 130,56 134,72 L124,78 L130,90 Z", t: 0.045 }
      ],
      seams: ["M100,128 L100,294", "M45,104 C44,86 40,66 36,50", "M155,104 C156,86 160,66 164,50"],
      stitches: ["M28,288 L172,288"],
      folds: ["M60,96 C56,170 64,230 54,292", "M140,96 C144,170 136,230 146,292"],
      buttons: [[112, 146], [112, 180], [112, 214]],
    },
    back: {
      body: "M80,34 C90,30 110,30 120,34 L164,50 C168,56 169,63 169,74 L174,294 L26,294 L31,74 C31,63 32,56 36,50 Z",
      sleeves: ["M36,50 C26,56 22,66 21,82 L16,240 C23,244 34,244 42,241 L45,104 C44,86 40,66 36,50 Z", "M164,50 C174,56 178,66 179,82 L184,240 C177,244 166,244 158,241 L155,104 C156,86 160,66 164,50 Z"],
      ribs: [],
      panels: [],
      seams: ["M100,44 L100,294"],
      stitches: ["M28,288 L172,288"],
      folds: ["M62,96 C58,170 66,230 56,292", "M138,96 C142,170 134,230 144,292"],
    },
  },
};

// 6 Koleksi Desain Pakaian Estetik Berjarak Renggang (Tidak Numpuk)
const GARMENTS = [
  { id: "tee-bone", kind: "tee", color: "#F3EFE6", trim: "#DCD6C8" },
  { id: "shirt-sky", kind: "shirt", color: "#A2C4D9", trim: "#7B9DB3" },
  { id: "knit-olive", kind: "knit", color: "#6B7C52", trim: "#515E3D" },
  { id: "hoodie-heather", kind: "hoodie", color: "#9EA4AA", trim: "#6C727A" },
  { id: "jacket-terracotta", kind: "jacket", color: "#A8533E", trim: "#7D3D2C" },
  { id: "coat-noir", kind: "coat", color: "#222326", trim: "#161719" }
];

function mixColor(color, amount) {
  if (!amount) return color;
  return amount > 0 ? lighten(color, amount) : darken(color, -amount);
}

function lighten(hex, amt) {
  return shadeColor(hex, Math.round(amt * 80));
}
function darken(hex, amt) {
  return shadeColor(hex, -Math.round(amt * 80));
}
function shadeColor(color, percent) {
  let num = parseInt(color.replace("#", ""), 16),
      amt = Math.round(2.55 * percent),
      R = (num >> 16) + amt,
      G = (num >> 8 & 0x00FF) + amt,
      B = (num & 0x0000FF) + amt;
  return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
}

function buildSVGDefs(uid) {
  return `
    <defs>
      <!-- Wood Hanger Gradient (Warm Sienna Oak) -->
      <linearGradient id="${uid}-wood" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#C07747"/>
        <stop offset="45%" stop-color="#8C4922"/>
        <stop offset="100%" stop-color="#5E3013"/>
      </linearGradient>
      
      <!-- Chrome Hook Gradient -->
      <linearGradient id="${uid}-chrome" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%" stop-color="#A1A1AA"/>
        <stop offset="35%" stop-color="#FFFFFF"/>
        <stop offset="70%" stop-color="#71717A"/>
        <stop offset="100%" stop-color="#D4D4D8"/>
      </linearGradient>

      <!-- Soft Fabric Volume & Shading -->
      <linearGradient id="${uid}-volume" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%" stop-color="#000000" stop-opacity="0.22"/>
        <stop offset="25%" stop-color="#000000" stop-opacity="0.04"/>
        <stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.08"/>
        <stop offset="75%" stop-color="#000000" stop-opacity="0.04"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.25"/>
      </linearGradient>

      <linearGradient id="${uid}-drape" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.14"/>
        <stop offset="30%" stop-color="#000000" stop-opacity="0"/>
        <stop offset="85%" stop-color="#000000" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.28"/>
      </linearGradient>
    </defs>
  `;
}

function renderGarmentSVG(item, side = "front", uid = "rail") {
  const kind = item.kind || "tee";
  const artEntry = ART[kind] || ART.tee;
  const art = side === "front" ? artEntry.front : artEntry.back;
  const color = item.color || "#EEEEEE";
  const trim = item.trim || mixColor(color, -0.15);

  const panelsHTML = (art.panels || []).map(p => `
    <path d="${p.d}" fill="${mixColor(color, p.t)}" />
  `).join("");

  const ribsHTML = (art.ribs || []).map(d => `
    <path d="${d}" fill="${trim}" />
  `).join("");

  const foldsHTML = (art.folds || []).map(d => `
    <path d="${d}" fill="none" stroke="rgba(0,0,0,0.18)" stroke-width="2.5" stroke-linecap="round" />
    <path d="${d}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.2" stroke-linecap="round" transform="translate(1.5, 0)" />
  `).join("");

  const seamsHTML = (art.seams || []).map(d => `
    <path d="${d}" fill="none" stroke="rgba(0,0,0,0.24)" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round" />
  `).join("");

  const stitchesHTML = (art.stitches || []).map(d => `
    <path d="${d}" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="0.7" stroke-dasharray="2 1.6" stroke-linecap="round" />
  `).join("");

  const buttonsHTML = (art.buttons || []).map(([x, y]) => `
    <circle cx="${x}" cy="${y}" r="2.8" fill="${trim}" stroke="rgba(0,0,0,0.3)" stroke-width="0.6"/>
    <circle cx="${x - 0.7}" cy="${y - 0.7}" r="0.8" fill="#FFFFFF" opacity="0.6"/>
  `).join("");

  const cordsHTML = (art.cords || []).map(d => `
    <path d="${d}" fill="none" stroke="${trim}" stroke-width="1.8" stroke-linecap="round" />
  `).join("");

  return `
    <svg viewBox="0 0 ${VB_W} ${VB_H}" class="w-full h-full drop-shadow-lg overflow-visible" style="filter: drop-shadow(0 10px 18px rgba(0,0,0,0.18));">
      ${buildSVGDefs(uid)}

      <!-- Contoured Oak Wooden Hanger -->
      <g>
        <!-- Chrome Hook with highlights -->
        <path d="${HOOK}" fill="none" stroke="rgba(0,0,0,0.3)" stroke-width="3.6" stroke-linecap="round" transform="translate(1, 1.5)" />
        <path d="${HOOK}" fill="none" stroke="url(#${uid}-chrome)" stroke-width="2.8" stroke-linecap="round" />
        <path d="${HOOK_HI}" fill="none" stroke="#FFFFFF" stroke-width="0.8" stroke-linecap="round" opacity="0.8" />
        <rect x="96" y="27" width="8" height="9" rx="2" fill="url(#${uid}-chrome)" />
        <rect x="97.5" y="28.5" width="2" height="6" rx="1" fill="#FFFFFF" opacity="0.6" />

        <!-- Arched Warm Wood Shoulder Bar -->
        <path d="${BAR}" fill="none" stroke="rgba(0,0,0,0.22)" stroke-width="9" stroke-linecap="round" transform="translate(0.8, 1.8)" />
        <path d="${BAR}" fill="none" stroke="url(#${uid}-wood)" stroke-width="8" stroke-linecap="round" />
        <path d="${BAR_HI}" fill="none" stroke="#FFFFFF" stroke-width="1" stroke-linecap="round" opacity="0.35" />
      </g>

      <!-- Garment Under Collar / Inside -->
      ${art.under ? `<path d="${art.under}" fill="${darken(color, 25)}" />` : ""}
      ${art.hood ? `<path d="${art.hood}" fill="${darken(color, 15)}" />` : ""}

      <!-- Garment Body Silhouette -->
      <path d="${art.body}" fill="${color}" stroke="rgba(0,0,0,0.12)" stroke-width="0.8" />
      ${(art.sleeves || []).map(d => `<path d="${d}" fill="${color}" stroke="rgba(0,0,0,0.12)" stroke-width="0.8" />`).join("")}

      <!-- Fabric Volume Shading & Drape Overlays -->
      <g opacity="0.65" style="mix-blend-mode: multiply;">
        <path d="${art.body}" fill="url(#${uid}-volume)" />
        <path d="${art.body}" fill="url(#${uid}-drape)" />
      </g>

      <!-- Panels & Details -->
      ${panelsHTML}
      ${ribsHTML}
      ${foldsHTML}
      ${seamsHTML}
      ${stitchesHTML}
      ${cordsHTML}
      ${buttonsHTML}
    </svg>
  `;
}

export class ClothingRailHero {
  constructor(container) {
    this.container = container;
    this.items = GARMENTS;
    this.activeIndex = 0;
    this.slots = [];
    this.positions = [];
    this.flipped = new Array(this.items.length).fill(false);
    this.sim = {
      x: [],
      turn: [],
      drag: -1
    };
    this.autoplay = true;
    this.autoplayTimer = null;
    this._init();
  }

  _init() {
    this.container.innerHTML = `
      <!-- Standing Boutique Rack Frame (Menyerupai frame ruang kurasi 3D) -->
      <div class="rail-stand-frame">
        <div class="rail-upright rail-upright-left">
          <div class="rail-upright-post"></div>
          <div class="rail-upright-foot"></div>
        </div>
        <div class="rail-metal-bar"></div>
        <div class="rail-upright rail-upright-right">
          <div class="rail-upright-post"></div>
          <div class="rail-upright-foot"></div>
        </div>
      </div>
      
      <!-- Hanger Slots Track -->
      <div id="rail-items-track" class="rail-items-track"></div>
    `;

    this.track = this.container.querySelector("#rail-items-track");
    this._setupSlots();
    this._bindEvents();
    this._startAutoplay();
  }

  _setupSlots() {
    this.track.innerHTML = "";
    this.slots = [];
    const count = this.items.length;
    const width = this.container.clientWidth || 660;

    // Jarak yang pas & proporsional, tidak saling bertumpuk
    const spacing = Math.min(115, Math.max(75, (width - 130) / (count - 1)));
    const startX = (width - (count - 1) * spacing) / 2 - 58;

    this.items.forEach((item, i) => {
      const slot = document.createElement("button");
      slot.type = "button";
      slot.className = "rail-garment-slot";
      slot.setAttribute("data-index", i);
      slot.setAttribute("aria-label", "Pilihan Baju");

      const targetX = startX + i * spacing;
      this.positions[i] = targetX;
      this.sim.x[i] = targetX;
      this.sim.turn[i] = i === this.activeIndex ? 0 : -62;

      slot.style.transform = `translate3d(${targetX.toFixed(1)}px, 0, 0)`;
      slot.style.zIndex = i === this.activeIndex ? 35 : 12 + i;

      slot.innerHTML = `
        <div class="rail-garment-swing">
          <div class="rail-garment-turn" style="transform: perspective(1000px) rotateY(${this.sim.turn[i]}deg); opacity: ${i === this.activeIndex ? 1 : 0.88};">
            <div class="rail-card-flipper">
              <div class="rail-face rail-face-front">
                ${renderGarmentSVG(item, "front", `rail-slot-${i}-f`)}
              </div>
              <div class="rail-face rail-face-back">
                ${renderGarmentSVG(item, "back", `rail-slot-${i}-b`)}
              </div>
            </div>
          </div>
        </div>
      `;

      this.track.appendChild(slot);
      this.slots.push(slot);
    });
  }

  _bindEvents() {
    this.slots.forEach((slot, i) => {
      // Hover: putar ke depan & berikan ayunan pegas
      slot.addEventListener("mouseenter", () => {
        this.stopAutoplay();
        this._setActive(i);
        this._impulse(i, (i % 2 === 0 ? 1 : -1) * 8);
      });

      // Click: Jika sedang aktif, balik tampak depan / belakang (180° flip).
      // Jika belum aktif, aktifkan dan putar ke depan.
      slot.addEventListener("click", () => {
        this.stopAutoplay();
        if (this.activeIndex === i) {
          this._toggleFlip(i);
        } else {
          this._setActive(i);
          this._impulse(i, (i % 2 === 0 ? 1 : -1) * 12);
        }
      });

      // Pointer drag physics (geser baju di sepanjang rel)
      let isDragging = false;
      let startX = 0;
      let initSlotX = 0;

      slot.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        this.stopAutoplay();
        isDragging = true;
        startX = e.clientX;
        initSlotX = this.sim.x[i];
        this.sim.drag = i;
        slot.setPointerCapture(e.pointerId);
      });

      slot.addEventListener("pointermove", (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const newX = initSlotX + dx;
        this.sim.x[i] = newX;
        slot.style.transform = `translate3d(${newX.toFixed(1)}px, 0, 0)`;

        // Efek miring/ayun saat ditarik
        const swingAngle = Math.max(-14, Math.min(14, dx * 0.18));
        const swingEl = slot.querySelector(".rail-garment-swing");
        if (swingEl) swingEl.style.transform = `rotate(${swingAngle}deg)`;
      });

      const onEndDrag = (e) => {
        if (!isDragging) return;
        isDragging = false;
        this.sim.drag = -1;
        try { slot.releasePointerCapture(e.pointerId); } catch(err){}
        const swingEl = slot.querySelector(".rail-garment-swing");
        if (swingEl) {
          swingEl.style.transition = "transform 0.4s ease-out";
          swingEl.style.transform = "rotate(0deg)";
          setTimeout(() => { swingEl.style.transition = ""; }, 400);
        }
        this._setActive(i);
      };

      slot.addEventListener("pointerup", onEndDrag);
      slot.addEventListener("pointercancel", onEndDrag);
    });

    // Resize
    window.addEventListener("resize", () => {
      this._setupSlots();
      this._setActive(this.activeIndex);
    });
  }

  _setActive(index) {
    this.activeIndex = index;
    this.slots.forEach((slot, i) => {
      const turnEl = slot.querySelector(".rail-garment-turn");
      const isCurrent = i === index;
      slot.style.zIndex = isCurrent ? 35 : 12 + i;
      if (turnEl) {
        turnEl.style.transform = `perspective(1000px) rotateY(${isCurrent ? 0 : -62}deg)`;
        turnEl.style.opacity = isCurrent ? "1" : "0.85";
      }
    });
  }

  _toggleFlip(i) {
    this.flipped[i] = !this.flipped[i];
    const slot = this.slots[i];
    if (!slot) return;
    const flipper = slot.querySelector(".rail-card-flipper");
    if (flipper) {
      flipper.style.transform = `rotateY(${this.flipped[i] ? 180 : 0}deg)`;
    }
    this._impulse(i, (this.flipped[i] ? 1 : -1) * 7);
  }

  _impulse(i, deg) {
    const slot = this.slots[i];
    if (!slot) return;
    const swingEl = slot.querySelector(".rail-garment-swing");
    if (swingEl) {
      swingEl.style.transition = "transform 0.16s ease-out";
      swingEl.style.transform = `rotate(${deg}deg)`;
      setTimeout(() => {
        swingEl.style.transition = "transform 0.55s cubic-bezier(0.2, 0.8, 0.3, 1)";
        swingEl.style.transform = "rotate(0deg)";
        setTimeout(() => { swingEl.style.transition = ""; }, 550);
      }, 160);
    }
  }

  _startAutoplay() {
    this.autoplay = true;
    clearInterval(this.autoplayTimer);
    this.autoplayTimer = setInterval(() => {
      const next = (this.activeIndex + 1) % this.items.length;
      this._setActive(next);
      this._impulse(next, (next % 2 === 0 ? 1 : -1) * 9);
    }, 2800);
  }

  startAutoplay() {
    this._startAutoplay();
  }

  stopAutoplay() {
    this.autoplay = false;
    clearInterval(this.autoplayTimer);
  }
}
