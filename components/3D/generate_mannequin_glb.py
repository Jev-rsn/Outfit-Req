#!/usr/bin/env python3
"""
Membuat 3 file .glb dengan MORPH TARGET YANG SAMA (sinkron):
  mannequin.glb  : tubuh   (chest, waist, hip, shoulder)
  tshirt.glb     : atasan  (chest, waist, hip, shoulder, size)
  pants.glb      : celana  (chest, waist, hip, shoulder, size)

Cara pakai:  python3 generate_mannequin_glb.py [folder_output]
Kebutuhan :  numpy

Ini aset PLACEHOLDER prosedural. Untuk produksi, ganti dengan hasil Blender/SMPL
asalkan nama morph target-nya tetap sama; kode viewer tidak perlu diubah.
Semua ukuran dalam cm, tinggi dasar 170 cm.
"""
import json, math, os, struct, sys
import numpy as np

SEG = 32
SX, SZ = 1.18, 0.82            # penampang torso berbentuk elips
H = 170.0
TAU = 2 * math.pi
BASE = dict(C=92.0, P=76.0, hip=94.0, B=42.0)
# nama morph : (parameter, rentang cm pada bobot 1.0)
MORPHS = [("chest", "C", 20.0), ("waist", "P", 25.0), ("hip", "hip", 20.0), ("shoulder", "B", 8.0)]


def catmull(pts, n):
    P = np.array(pts, float); m = len(P)
    ext = np.vstack([2 * P[0] - P[1], P, 2 * P[-1] - P[-2]])
    out = []
    for k in range(n):
        t = k * (m - 1) / (n - 1)
        i = min(int(t), m - 2); u = t - i
        p0, p1, p2, p3 = ext[i], ext[i + 1], ext[i + 2], ext[i + 3]
        out.append(0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u ** 2
                          + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3))
    return np.array(out)


def lathe(rows, n, sx=1.0, sz=1.0, ox=0.0, oz=0.0):
    """rows = [(y, r)]; hasil n cincin x (SEG+1) titik."""
    rows = sorted(rows, key=lambda r: r[0])
    ring = catmull(rows, n)
    v = []
    for y, r in ring:
        r = max(r, 0.1)
        for j in range(SEG + 1):
            th = TAU * j / SEG
            v.append((ox + r * math.sin(th) * sx, y, oz + r * math.cos(th) * sz))
    return np.array(v, float)


def build(p, kind, ease=0.0):
    C, Pw, hip, B = p["C"], p["P"], p["hip"], p["B"]
    hipR, waistR, chestR = hip / TAU, Pw / TAU, C / TAU
    armR = 4.4
    shR = max(8.0, (B / 2 - armR * 0.9) / SX)
    neckR = max(4.6, H * 0.026)
    ySh, yCr = 0.80 * H, 0.47 * H
    rows = [(.47, hipR * .88, 0), (.52, hipR, .97), (.56, hipR * .93, .97), (.62, waistR, .96),
            (.67, waistR + (chestR - waistR) * .7, .98), (.72, chestR, 1), (.76, chestR * .94, .93),
            (.80, shR, 0), (.822, shR * .55 + neckR * .45, 0), (.838, neckR * 1.15, 0), (.852, neckR, 0)]
    legTop = hipR * .62; ankle = max(2.8, legTop * .34); lx = hipR * SX * .5

    def legrows(a):
        return [(.03 * H, ankle * .95 + a), (.045 * H, ankle + a), (.12 * H, legTop * .45 + a),
                (.20 * H, legTop * .68 + a), (.285 * H, legTop * .64 + a), (.38 * H, legTop * .93 + a),
                (yCr + .015 * H, legTop + a)]

    def arm(s, local, n):
        v = lathe([(ySh + dy, r) for dy, r in local], n, ox=s * B / 2)
        th, px, py = s * .09, s * B / 2, ySh
        dx, dy = v[:, 0] - px, v[:, 1] - py
        v[:, 0] = px + dx * math.cos(th) - dy * math.sin(th)
        v[:, 1] = py + dx * math.sin(th) + dy * math.cos(th)
        return v

    parts = []
    if kind == "body":
        parts.append(lathe([(f * H, r) for f, r, _ in rows], 40, SX, SZ))
        for s in (-1, 1):
            parts.append(lathe(legrows(0), 36, ox=s * lx))
            foot = [(.025 * H + .028 * H * math.sin(a), math.cos(a))
                    for a in np.linspace(-math.pi / 2, math.pi / 2, 9)]
            parts.append(lathe(foot, 10, sx=ankle * 1.25, sz=.075 * H, ox=s * lx, oz=.035 * H))
            ar = armR
            parts.append(arm(s, [(.005 * H, ar * .6), (-.012 * H, ar * .98), (-.06 * H, ar), (-.15 * H, ar * .86),
                                 (-.18 * H, ar * .78), (-.215 * H, ar * .8), (-.29 * H, ar * .56),
                                 (-.325 * H, ar * .62), (-.35 * H, ar * .4), (-.36 * H, ar * .12)], 26))
        parts.append(lathe([(.83 * H, neckR), (.895 * H, neckR * 1.05)], 4))
        head = [(.93 * H + .0739 * H * math.sin(a), .0581 * H * math.cos(a))
                for a in np.linspace(-math.pi / 2, math.pi / 2, 12)]
        parts.append(lathe(head, 14, sz=1.114, oz=.004 * H))
    elif kind == "top":
        e = 2.0 + ease
        g = [(f * H, (r + e) if k else (r + e + .4)) for f, r, k in rows[1:9]]
        g.append((.836 * H, neckR + 1.6 + ease))
        parts.append(lathe(g, 40, SX, SZ))
        sl = armR * 1.08 + e
        for s in (-1, 1):
            parts.append(arm(s, [(.004 * H, sl * .6), (-.012 * H, sl), (-.06 * H, sl), (-.15 * H, sl * .93)], 10))
    else:  # pants
        e = 1.5 + ease
        parts.append(lathe([(.47 * H, hipR * .9 + e), (.52 * H, hipR + e), (.56 * H, hipR * .93 + e),
                            (.64 * H, waistR + e)], 14, SX, SZ))
        for s in (-1, 1):
            parts.append(lathe(legrows(e)[1:], 36, ox=s * lx))
    return parts


def topology(parts):
    idx, uv, off = [], [], 0
    for v in parts:
        n = len(v) // (SEG + 1)
        for i in range(n):
            for j in range(SEG + 1):
                uv.append((j / SEG, i / (n - 1)))
        for i in range(n - 1):
            for j in range(SEG):
                a = off + i * (SEG + 1) + j; b = a + 1; c = a + SEG + 1; d = c + 1
                idx += [a, b, c, b, d, c]
        off += len(v)
    return np.array(idx, np.uint32), np.array(uv, np.float32)


def normals(v, idx):
    nrm = np.zeros_like(v)
    t = idx.reshape(-1, 3)
    fn = np.cross(v[t[:, 1]] - v[t[:, 0]], v[t[:, 2]] - v[t[:, 0]])
    for k in range(3):
        np.add.at(nrm, t[:, k], fn)
    ln = np.linalg.norm(nrm, axis=1, keepdims=True); ln[ln == 0] = 1
    return (nrm / ln).astype(np.float32)


def write_glb(path, name, verts, nrm, uv, idx, targets, color, rough):
    chunks, views, accs = [], [], []

    def add(arr, target, ctype, typ, mm=False):
        raw = arr.tobytes(); off = sum(len(c) for c in chunks)
        chunks.append(raw)
        views.append({"buffer": 0, "byteOffset": off, "byteLength": len(raw), "target": target})
        a = {"bufferView": len(views) - 1, "componentType": ctype, "count": len(arr), "type": typ}
        if mm:
            a["min"] = arr.min(axis=0).tolist(); a["max"] = arr.max(axis=0).tolist()
        accs.append(a); return len(accs) - 1

    f32 = lambda a: np.ascontiguousarray(a, np.float32)
    i_idx = add(idx, 34963, 5125, "SCALAR")
    i_pos = add(f32(verts), 34962, 5126, "VEC3", True)
    i_nor = add(f32(nrm), 34962, 5126, "VEC3")
    i_uv = add(f32(uv), 34962, 5126, "VEC2")
    tg = [{"POSITION": add(f32(d), 34962, 5126, "VEC3", True)} for _, d in targets]
    gltf = {
        "asset": {"version": "2.0", "generator": "generate_mannequin_glb.py"},
        "scene": 0, "scenes": [{"nodes": [0]}], "nodes": [{"mesh": 0, "name": name}],
        "meshes": [{"name": name, "weights": [0.0] * len(tg),
                    "extras": {"targetNames": [n for n, _ in targets]},
                    "primitives": [{"attributes": {"POSITION": i_pos, "NORMAL": i_nor, "TEXCOORD_0": i_uv},
                                    "indices": i_idx, "material": 0, "targets": tg}]}],
        "materials": [{"name": name, "doubleSided": True,
                       "pbrMetallicRoughness": {"baseColorFactor": color, "metallicFactor": 0.0,
                                                "roughnessFactor": rough}}],
        "accessors": accs, "bufferViews": views, "buffers": [{"byteLength": sum(len(c) for c in chunks)}]}
    js = json.dumps(gltf, separators=(",", ":")).encode()
    js += b" " * (-len(js) % 4)
    bn = b"".join(chunks)
    total = 12 + 8 + len(js) + 8 + len(bn)
    with open(path, "wb") as f:
        f.write(struct.pack("<4sII", b"glTF", 2, total))
        f.write(struct.pack("<I4s", len(js), b"JSON")); f.write(js)
        f.write(struct.pack("<I4s", len(bn), b"BIN\x00")); f.write(bn)
    return total


def main(out):
    os.makedirs(out, exist_ok=True)
    jobs = [("body", "mannequin", [.80, .74, .70, 1], .5, False),
            ("top", "tshirt", [1, 1, 1, 1], .9, True),
            ("pants", "pants", [1, 1, 1, 1], .9, True)]
    for kind, name, color, rough, has_size in jobs:
        base_parts = build(BASE, kind)
        idx, uv = topology(base_parts)
        base = np.vstack(base_parts)
        targets = []
        for mname, key, rng in MORPHS:
            p2 = dict(BASE); p2[key] += rng
            targets.append((mname, np.vstack(build(p2, kind)) - base))
        if has_size:
            targets.append(("size", np.vstack(build(BASE, kind, ease=1.0)) - base))
        size = write_glb(os.path.join(out, name + ".glb"), name, base, normals(base, idx), uv, idx,
                         targets, color, rough)
        print(f"{name}.glb  {size/1024:.0f} KB  morph: {[n for n, _ in targets]}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "glb")
