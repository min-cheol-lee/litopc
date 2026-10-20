"use client";

/**
 * Surface3DCanvas — Three.js WebGL 3D surface renderer (React Three Fiber)
 * Enable via: ?webgl=1 in URL
 *
 * Visual target: Intel 18A-style clean dark metallic semiconductor aesthetic
 * – ACES filmic tone mapping + Bloom post-processing
 * – MeshPhysicalMaterial chrome mask plate
 * – Billboard sprite glow column (no visible geometry lines)
 * – PointLight per aperture for real silicon illumination
 * – Drei MeshReflectorMaterial replaces manual mirror camera
 */

import React, { forwardRef, useImperativeHandle, useRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import type { Surface3DProps, Surface3DHandle, ColormapType, ContourSet, EpePoint } from "../lib/surface3d-types";

// ── Colormap ──────────────────────────────────────────────────────────────────
function evalColorMap(type: ColormapType | string, tRaw: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, tRaw));
  const lerp = (stops: Array<{ t: number; c: number[] }>, v: number): [number, number, number] => {
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i], b = stops[i + 1];
      if (v >= a.t && v <= b.t) {
        const u = (v - a.t) / Math.max(1e-9, b.t - a.t);
        return [Math.round(a.c[0]+(b.c[0]-a.c[0])*u), Math.round(a.c[1]+(b.c[1]-a.c[1])*u), Math.round(a.c[2]+(b.c[2]-a.c[2])*u)];
      }
    }
    const last = stops[stops.length - 1].c; return [last[0], last[1], last[2]];
  };
  switch (type) {
    case "plasma":   return lerp([{t:0,c:[13,8,135]},{t:.25,c:[126,3,168]},{t:.5,c:[203,71,120]},{t:.75,c:[248,149,64]},{t:1,c:[240,249,33]}], t);
    case "viridis":  return lerp([{t:0,c:[68,1,84]},{t:.25,c:[59,82,139]},{t:.5,c:[33,145,140]},{t:.75,c:[94,201,98]},{t:1,c:[253,231,37]}], t);
    case "hot":      return lerp([{t:0,c:[0,0,0]},{t:.33,c:[255,0,0]},{t:.67,c:[255,255,0]},{t:1,c:[255,255,255]}], t);
    case "grayscale":return lerp([{t:0,c:[0,0,0]},{t:1,c:[255,255,255]}], t);
    case "ice":      return lerp([{t:0,c:[4,35,51]},{t:.33,c:[23,93,122]},{t:.67,c:[50,184,190]},{t:1,c:[232,251,255]}], t);
    default:         return lerp([{t:0,c:[14,20,30]},{t:.22,c:[39,67,108]},{t:.45,c:[94,92,230]},{t:.68,c:[191,90,242]},{t:.86,c:[255,69,58]},{t:1,c:[255,214,10]}], t);
  }
}

// ── EPE color ─────────────────────────────────────────────────────────────────
function epeColor(dist: number): THREE.Color {
  const t = Math.min(1, dist / 12);
  if (t < 0.5) return new THREE.Color(0, 1 - t, t * 0.5 + 0.3).lerp(new THREE.Color(1, 0.8, 0), t * 2);
  return new THREE.Color(1, 0.8, 0).lerp(new THREE.Color(1, 0.1, 0.05), (t - 0.5) * 2);
}

// ── Bilinear sample ───────────────────────────────────────────────────────────
function bilinearSample(data: number[], w: number, h: number, fx: number, fy: number): number {
  const x0 = Math.max(0, Math.min(w-1, Math.floor(fx))), y0 = Math.max(0, Math.min(h-1, Math.floor(fy)));
  const x1 = Math.min(x0+1, w-1), y1 = Math.min(y0+1, h-1);
  const ux = fx - Math.floor(fx), uy = fy - Math.floor(fy);
  return data[y0*w+x0]*(1-ux)*(1-uy) + data[y0*w+x1]*ux*(1-uy) + data[y1*w+x0]*(1-ux)*uy + data[y1*w+x1]*ux*uy;
}

function sampleZ(xNm: number, yNm: number, fovNm: number, data: number[], dw: number, dh: number, vmin: number, span: number, heightMax: number): number {
  const v = bilinearSample(data, dw, dh, (xNm / fovNm) * (dw-1), (yNm / fovNm) * (dh-1));
  return Math.max(0, Math.min(1, (v - vmin) / span)) * heightMax;
}

// ── DataTexture colormap ──────────────────────────────────────────────────────
function buildColorTexture(data: number[], w: number, h: number, vmin: number, span: number, colormapType: string): THREE.DataTexture {
  const pixels = new Uint8ClampedArray(w * h * 4);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const di = j*w+i;
      const t  = Math.max(0, Math.min(1, (data[di]-vmin)/span));
      const [r, g, b] = evalColorMap(colormapType, t);
      // Alpha = pow(t, 0.55): low-intensity regions are transparent, matching 2D colormap style.
      // Eliminates the "black background rectangle" artifact — only hot-spots show color.
      const pi = di*4;
      pixels[pi]=r; pixels[pi+1]=g; pixels[pi+2]=b;
      pixels[pi+3] = Math.round(Math.pow(t, 0.55) * 255);
    }
  }
  const tex = new THREE.DataTexture(pixels, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.flipY = true; tex.needsUpdate = true;
  return tex;
}

// ── Height-displaced PlaneGeometry ───────────────────────────────────────────
function buildSurfaceGeometry(data: number[], w: number, h: number, vmin: number, span: number, depthScale: number, wSegs: number, hSegs: number): THREE.BufferGeometry {
  const geom = new THREE.PlaneGeometry(1, 1, wSegs, hSegs);
  const pos  = geom.attributes.position as THREE.BufferAttribute;
  const numV = (wSegs+1)*(hSegs+1);
  const heightMax = depthScale * 0.04;
  for (let vi = 0; vi < numV; vi++) {
    const px = pos.getX(vi), py = pos.getY(vi);
    const v  = bilinearSample(data, w, h, (px+0.5)*(w-1), (0.5-py)*(h-1));
    pos.setZ(vi, Math.max(0, Math.min(1, (v-vmin)/span)) * heightMax);
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();
  return geom;
}

const MASK_Z_TOP = 0.69;   // raised 25% more for wider mask-silicon gap
const BASE_Z     = -0.022;

// ── Contour line builder ──────────────────────────────────────────────────────
function buildContourLine(
  contour: ContourSet, fovNm: number,
  data: number[], dw: number, dh: number, vmin: number, span: number, heightMax: number,
  color: number | THREE.Color, lineWidth: number, zOffset: number,
  dashed: boolean, epeData?: EpePoint[], fixedZ?: number,
): THREE.Line {
  const pts = contour.points_nm;
  if (pts.length < 2) return new THREE.Line();
  const positions: number[] = [], colors: number[] = [];
  const useEpe = !!epeData && epeData.length === pts.length;
  for (let i = 0; i <= pts.length; i++) {
    const p = pts[i % pts.length];
    const xN = p.x / fovNm - 0.5, yN = 0.5 - p.y / fovNm;
    const z = fixedZ !== undefined ? fixedZ : sampleZ(p.x, p.y, fovNm, data, dw, dh, vmin, span, heightMax) + zOffset;
    positions.push(xN, yN, z);
    if (useEpe) { const c = epeColor(epeData![i % pts.length].dist); colors.push(c.r, c.g, c.b); }
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  if (useEpe) geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  if (dashed) {
    const mat = new THREE.LineDashedMaterial({ color, dashSize: 0.018, gapSize: 0.010 });
    const line = new THREE.Line(geom, mat); line.computeLineDistances(); return line;
  }
  return new THREE.Line(geom, new THREE.LineBasicMaterial({ color: useEpe ? 0xffffff : color, linewidth: lineWidth, vertexColors: useEpe }));
}

// ── Dispose group (recursive) ─────────────────────────────────────────────────
function disposeGroup(group: THREE.Group) {
  group.traverse((child) => {
    const obj = child as THREE.Mesh & THREE.Line;
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => {
        const mat = m as THREE.MeshPhysicalMaterial;
        mat.map?.dispose();
        mat.alphaMap?.dispose();
        m.dispose();
      });
    }
  });
  group.clear();
}


// ── Directional beam DataTexture ──────────────────────────────────────────────
// For vertical column planes (rotation.x = π/2): V direction → +Z world (silicon→mask).
// V=0 (j=0) = silicon level → transparent. V=1 (j=H-1) = mask level → bright.
// This makes the beam look like it flows DOWN from the aperture.
function makeBeamTex(): THREE.DataTexture {
  const W = 32, H = 64;
  const px = new Uint8ClampedArray(W * H * 4);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const u = (i / (W - 1)) * 2 - 1;  // -1..1 horizontal soft falloff
      const v = j / (H - 1);             // 0=silicon(dim), 1=mask(bright)
      const horiz = Math.exp(-u * u * 3.0);
      const vert  = Math.pow(v, 0.4);    // sqrt-ish: gradual fade from mask down to silicon
      const pi = (j * W + i) * 4;
      px[pi] = px[pi+1] = px[pi+2] = 255;
      px[pi+3] = Math.round(horiz * vert * 255);
    }
  }
  const t = new THREE.DataTexture(px, W, H, THREE.RGBAFormat);
  t.needsUpdate = true; return t;
}

// ── Radial gradient DataTexture ───────────────────────────────────────────────
function makeRadialTex(size = 64): THREE.DataTexture {
  const px = new Uint8ClampedArray(size * size * 4);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const dx = (i/(size-1))*2-1, dy = (j/(size-1))*2-1;
      const a = Math.max(0, Math.exp(-(dx*dx+dy*dy)*3.5));
      const pi = (j*size+i)*4;
      px[pi]=255; px[pi+1]=255; px[pi+2]=255; px[pi+3]=Math.round(a*255);
    }
  }
  const t = new THREE.DataTexture(px, size, size, THREE.RGBAFormat);
  t.needsUpdate = true; return t;
}


const MASK_DEPTH = 0.015; // chrome plate thickness

// ── Mask alpha texture — paint aperture union into a DataTexture ──────────────
// Three.js alphaMap reads the GREEN channel (.g in GLSL).
// flipY=false (DataTexture default): row 0 = UV y=0 = world y=-B (bottom).
// Row formula: row = (worldY + B) / (2B) * size  [y increases upward]
function buildMaskAlphaTex(rects: import("../lib/surface3d-types").MaskRect[], fovNm: number, size = 512): THREE.DataTexture {
  const pixels = new Uint8ClampedArray(size * size * 4);
  const B = 0.55;
  pixels.fill(255); // R=G=B=A=255 everywhere — plate fully opaque initially
  for (const r of rects) {
    const cx = (r.x + r.w * 0.5) / fovNm - 0.5;
    const cy = 0.5 - (r.y + r.h * 0.5) / fovNm;
    const hw = r.w / (2 * fovNm), hh = r.h / (2 * fovNm);
    const col0 = Math.max(0, Math.floor((cx - hw + B) / (2 * B) * size));
    const col1 = Math.min(size, Math.ceil( (cx + hw + B) / (2 * B) * size));
    // flipY=false: row 0=bottom (world y=-B), row increases with world y
    const row0 = Math.max(0, Math.floor((cy - hh + B) / (2 * B) * size));
    const row1 = Math.min(size, Math.ceil( (cy + hh + B) / (2 * B) * size));
    for (let row = row0; row < row1; row++) {
      for (let col = col0; col < col1; col++) {
        const idx = (row * size + col) * 4;
        // Zero ALL channels including green (.g) which alphaMap reads
        pixels[idx] = pixels[idx+1] = pixels[idx+2] = pixels[idx+3] = 0;
      }
    }
  }
  // Soft outer boundary fade — eliminates hard-edge line artifacts when plate is tilted.
  // Chrome pixels near the plate boundary fade to transparent over a ~5% transition zone,
  // replacing the abrupt geometry cutoff with a smooth feathered edge.
  const borderPx = Math.round(size * 0.02); // reduced from 5%→2%: sharper aperture edge
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const idx = (row * size + col) * 4;
      if (pixels[idx + 1] === 0) continue; // aperture hole — leave transparent
      const dist = Math.min(row, size - 1 - row, col, size - 1 - col);
      if (dist < borderPx) {
        const fade = dist / borderPx;
        pixels[idx] = pixels[idx+1] = pixels[idx+2] = pixels[idx+3] = Math.round(255 * fade);
      }
    }
  }
  const tex = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  // flipY=false (default for DataTexture) — row 0 at bottom
  tex.needsUpdate = true;
  return tex;
}

// ── Aperture border glow texture ──────────────────────────────────────────────
// Bright pixels only where chrome meets aperture hole (edge band, ~1.5% of size wide).
// Used as an additive-blend overlay on a PlaneGeometry centered at (0,0) — no bounding
// sphere offset, no LineSegments depth-sort issues.
function buildMaskBorderTex(
  rects: import("../lib/surface3d-types").MaskRect[], fovNm: number, size = 512,
): THREE.DataTexture {
  const B = 0.55;
  const pixels = new Uint8ClampedArray(size * size * 4); // all zero (transparent)
  // 1. Build hole grid (1 = aperture, 0 = chrome)
  const isHole = new Uint8Array(size * size);
  for (const r of rects) {
    const cx = (r.x + r.w * 0.5) / fovNm - 0.5;
    const cy = 0.5 - (r.y + r.h * 0.5) / fovNm;
    const hw = r.w / (2 * fovNm), hh = r.h / (2 * fovNm);
    const c0 = Math.max(0, Math.floor((cx - hw + B) / (2 * B) * size));
    const c1 = Math.min(size, Math.ceil( (cx + hw + B) / (2 * B) * size));
    const r0 = Math.max(0, Math.floor((cy - hh + B) / (2 * B) * size));
    const r1 = Math.min(size, Math.ceil( (cy + hh + B) / (2 * B) * size));
    for (let row = r0; row < r1; row++)
      for (let col = c0; col < c1; col++)
        isHole[row * size + col] = 1;
  }
  // 2. For each chrome pixel within edgeW of a hole, write bright edge pixel
  // edgeW ~2px at 512: thin crisp aperture rim
  const edgeW = Math.max(1, Math.round(size * 0.004));
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (isHole[row * size + col]) continue;
      let minDist = edgeW + 1;
      for (let dr = -edgeW; dr <= edgeW; dr++) {
        for (let dc = -edgeW; dc <= edgeW; dc++) {
          const nr = row + dr, nc = col + dc;
          if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
          if (isHole[nr * size + nc]) {
            const d = Math.sqrt(dr * dr + dc * dc);
            if (d < minDist) minDist = d;
          }
        }
      }
      if (minDist <= edgeW) {
        const idx = (row * size + col) * 4;
        const t = 1.0 - minDist / edgeW;
        // pow(0.35) → sharp bright peak at edge, quick falloff
        const v = Math.round(Math.pow(t, 0.35) * 255);
        pixels[idx] = v; pixels[idx + 1] = v; pixels[idx + 2] = v; pixels[idx + 3] = v;
      }
    }
  }
  const tex = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  // LinearFilter: GPU bilinear interpolation smooths the hard pixel grid → no jagged edges
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

// ── Chrome mask plate — texture-based cutouts (no ShapeGeometry holes) ────────
// Uses alphaTest on PlaneGeometry so overlapping apertures merge automatically.
function buildMaskPlate(
  rects: import("../lib/surface3d-types").MaskRect[], fovNm: number,
): THREE.Group {
  const group = new THREE.Group();
  const B = 0.55;

  const alphaTex = buildMaskAlphaTex(rects, fovNm);

  // Top face — polished photomask chrome plate.
  // Very high metalness + low roughness = mirror-like silver with directional hotspots.
  // Iridescence adds a subtle thin-film interference shimmer (EUV-grade optic aesthetic).
  const topMat = new THREE.MeshPhysicalMaterial({
    color: 0x8ab0c8,           // same teal-chrome base as bottom face
    emissive: new THREE.Color(0x0c1a28),
    emissiveIntensity: 0.35,
    roughness: 0.08,           // match bottom face roughness
    metalness: 0.85,
    clearcoat: 0.7,
    clearcoatRoughness: 0.08,
    iridescence: 0.20,
    iridescenceIOR: 1.6,
    transparent: true,
    opacity: 0.76,
    alphaMap: alphaTex,
    side: THREE.FrontSide,
    depthWrite: false,
    envMapIntensity: 2.0,
  });
  const topMesh = new THREE.Mesh(new THREE.PlaneGeometry(2 * B, 2 * B), topMat);
  topMesh.position.z = MASK_Z_TOP;
  group.add(topMesh);

  // Bottom face — slightly darker chrome underside with subtle teal tone
  const botMat = new THREE.MeshPhysicalMaterial({
    color: 0x8ab0c8,
    emissive: new THREE.Color(0x0c1a28),
    emissiveIntensity: 0.35,
    roughness: 0.08,
    metalness: 0.85,
    clearcoat: 0.7,
    clearcoatRoughness: 0.08,
    iridescence: 0.20,
    iridescenceIOR: 1.6,
    transparent: true,
    opacity: 0.52,
    alphaMap: alphaTex,
    side: THREE.BackSide,   // BackSide: visible from below (mirror cam + user tilt)
    depthWrite: false,
    envMapIntensity: 2.0,
  });
  const botMesh = new THREE.Mesh(new THREE.PlaneGeometry(2 * B, 2 * B), botMat);
  botMesh.position.z = MASK_Z_TOP - MASK_DEPTH;
  group.add(botMesh);

  // Outer frame LineLoop removed — a 1.1×1.1 rectangle viewed at elevation/azimuth tilt
  // projects its far corners toward the silicon layer in screen space, creating a "floating
  // frame" artifact between the layers. No line geometry is used for the mask boundary.

  // Aperture border glow (top face) — crisp bright rim around each aperture opening.
  // PlaneGeometry centered at (0,0) → no bounding sphere offset → always correct depth.
  const borderTex = buildMaskBorderTex(rects, fovNm);
  const borderTopMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2 * B, 2 * B),
    new THREE.MeshBasicMaterial({
      map: borderTex,
      color: new THREE.Color(0.88, 0.96, 1.0),
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.70,
      depthWrite: false,
    }),
  );
  borderTopMesh.position.z = MASK_Z_TOP + 0.001;
  borderTopMesh.renderOrder = 0;
  group.add(borderTopMesh);

  // Aperture border glow (bottom face)
  const borderBotMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2 * B, 2 * B),
    new THREE.MeshBasicMaterial({
      map: borderTex,
      color: new THREE.Color(0.55, 0.75, 0.90),
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.45,
      depthWrite: false,
    }),
  );
  borderBotMesh.position.z = MASK_Z_TOP - MASK_DEPTH - 0.001;
  borderBotMesh.renderOrder = 0;
  group.add(borderBotMesh);

  // Outer box frame — 12 edges (top rect + bottom rect + 4 vertical pillars).
  // Gives the mask plate a "one-body" 3D slab look.
  // frustumCulled=false: prevents incorrect frustum rejection when plate is tilted.
  const topZ = MASK_Z_TOP, botZ = MASK_Z_TOP - MASK_DEPTH;
  const frameVerts = new Float32Array([
    // Top rectangle
    -B, -B, topZ,  B, -B, topZ,
     B, -B, topZ,  B,  B, topZ,
     B,  B, topZ, -B,  B, topZ,
    -B,  B, topZ, -B, -B, topZ,
    // Bottom rectangle
    -B, -B, botZ,  B, -B, botZ,
     B, -B, botZ,  B,  B, botZ,
     B,  B, botZ, -B,  B, botZ,
    -B,  B, botZ, -B, -B, botZ,
    // 4 vertical pillars
    -B, -B, topZ, -B, -B, botZ,
     B, -B, topZ,  B, -B, botZ,
     B,  B, topZ,  B,  B, botZ,
    -B,  B, topZ, -B,  B, botZ,
  ]);
  const frameGeo = new THREE.BufferGeometry();
  frameGeo.setAttribute('position', new THREE.Float32BufferAttribute(frameVerts, 3));
  const frameLine = new THREE.LineSegments(frameGeo, new THREE.LineBasicMaterial({
    color: 0x9bbcd4,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  }));
  frameLine.frustumCulled = false;
  frameLine.renderOrder = 0;
  group.add(frameLine);

  // ── 4 side wall panels — solid opaque chrome, visible at any side-view angle ──
  // Solid (transparent:false, depthWrite:true) so they render before transparent faces
  // and establish proper depth for the transparent top/bottom to composite over them.
  const sideMat = new THREE.MeshPhysicalMaterial({
    color: 0xd0e4f0,
    emissive: new THREE.Color(0x0c1a28),
    emissiveIntensity: 0.45,
    roughness: 0.04,
    metalness: 0.95,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    iridescence: 0.32,
    iridescenceIOR: 1.75,
    transparent: true,
    opacity: 0.80,
    depthWrite: false,
    side: THREE.DoubleSide,
    envMapIntensity: 2.0,
  });
  const midZ = MASK_Z_TOP - MASK_DEPTH / 2;
  // Front (-Y): PlaneGeometry(2B width=X, MASK_DEPTH height→Z after rot)
  // renderOrder default (0) — solid panels render before transparent faces
  const frontP = new THREE.Mesh(new THREE.PlaneGeometry(2 * B, MASK_DEPTH), sideMat);
  frontP.rotation.x = Math.PI / 2; frontP.position.set(0, -B, midZ);
  group.add(frontP);
  const backP = new THREE.Mesh(new THREE.PlaneGeometry(2 * B, MASK_DEPTH), sideMat);
  backP.rotation.x = -Math.PI / 2; backP.position.set(0, B, midZ);
  group.add(backP);
  const leftP = new THREE.Mesh(new THREE.PlaneGeometry(MASK_DEPTH, 2 * B), sideMat);
  leftP.rotation.y = -Math.PI / 2; leftP.position.set(-B, 0, midZ);
  group.add(leftP);
  const rightP = new THREE.Mesh(new THREE.PlaneGeometry(MASK_DEPTH, 2 * B), sideMat);
  rightP.rotation.y = Math.PI / 2; rightP.position.set(B, 0, midZ);
  group.add(rightP);

  return group;
}

// ── Aperture light effect: horizontal disc + 6-plane cylinder glow ────────────
function buildApertureEffect(cx: number, cy: number, hw: number, hh: number, numRects = 1): THREE.Group {
  const group = new THREE.Group();
  const spotTex = makeRadialTex(128);
  const sz = Math.max(hw, hh);
  const B = 0.55;
  const sourceZ = 4.5;
  const pSz = Math.min(sz, 0.008);
  let seed = ((Math.round(cx * 73856093) ^ Math.round(cy * 19349663)) >>> 0) | 1;
  const rnd = () => {
    seed = Math.imul(seed ^ (seed >>> 15), seed | 1);
    seed ^= seed + Math.imul(seed ^ (seed >>> 7), seed | 61);
    return ((seed ^ (seed >>> 14)) >>> 0) / 0x100000000;
  };
  const STREAK_BASE = 0.035;
  const STREAK_PROB = 0.12;
  const buildPts = (count: number, sizeMul: number, opacity: number, aboveFrac: number, addStreaks: boolean) => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sPos: number[] = [], sCol: number[] = [];
    for (let i = 0; i < count; i++) {
      const above = rnd() < aboveFrac;
      let px: number, py: number, pz: number, brightness: number;
      if (above) {
        const u = rnd();
        pz = MASK_Z_TOP + u * (sourceZ - MASK_Z_TOP);
        px = (rnd() * 2 - 1) * B; py = (rnd() * 2 - 1) * B;
        brightness = 0.38 + u * 0.55;
      } else {
        const u = rnd();
        pz = Math.min(MASK_Z_TOP - MASK_DEPTH - 0.005, u * (MASK_Z_TOP - MASK_DEPTH));
        px = Math.max(-B, Math.min(B, cx + (rnd() * 2 - 1) * hw * (1.0 + (1 - u) * 0.6)));
        py = Math.max(-B, Math.min(B, cy + (rnd() * 2 - 1) * hh * (1.0 + (1 - u) * 0.6)));
        brightness = 0.38 + rnd() * 0.40;
      }
      pos[i*3]=px; pos[i*3+1]=py; pos[i*3+2]=pz;
      const r=brightness*0.58, g=brightness*0.74, b=brightness;
      col[i*3]=r; col[i*3+1]=g; col[i*3+2]=b;
      if (addStreaks && rnd() < STREAK_PROB) {
        const sl = STREAK_BASE * (0.4 + rnd() * 1.6);
        sPos.push(px,py,pz, px,py,pz+sl); sCol.push(r,g,b, 0,0,0);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color',    new THREE.Float32BufferAttribute(col, 3));
    group.add(new THREE.Points(geo, new THREE.PointsMaterial({
      size: pSz*sizeMul, map: spotTex, vertexColors: true, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity, sizeAttenuation: true,
    })));
    if (addStreaks && sPos.length > 0) {
      const sg = new THREE.BufferGeometry();
      sg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(sPos), 3));
      sg.setAttribute('color',    new THREE.Float32BufferAttribute(new Float32Array(sCol), 3));
      group.add(new THREE.LineSegments(sg, new THREE.LineBasicMaterial({
        vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: opacity*0.60,
      })));
    }
  };
  const aboveLarge = Math.max(2,  Math.round(750  / numRects));
  const aboveSmall = Math.max(10, Math.round(3600 / numRects));
  const areaFrac   = Math.min(0.15, Math.max(0.005, (hw * hh) / (B * B)));
  const belowLarge = Math.max(2,  Math.round(750  * areaFrac * 0.38));
  const belowSmall = Math.max(5,  Math.round(3600 * areaFrac * 0.38));
  buildPts(aboveLarge, 1.10, 0.15, 1.00, false);
  buildPts(belowLarge, 1.00, 0.11, 0.00, false);
  buildPts(aboveSmall, 0.32, 0.32, 1.00, true);
  buildPts(belowSmall, 0.32, 0.24, 0.00, true);
  const footDisc = new THREE.Mesh(
    new THREE.PlaneGeometry(sz * 1.5, sz * 1.5),
    new THREE.MeshBasicMaterial({ map: spotTex, color: 0x4477cc, transparent: true,
      blending: THREE.AdditiveBlending, opacity: 0.12, depthWrite: false }),
  );
  footDisc.position.set(cx, cy, 0.002);
  group.add(footDisc);
  return group;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const FLOOR_Z = -1.6;

interface IntensityCache { data: number[]; w: number; h: number; vmin: number; span: number; heightMax: number; }

// ── SceneInner — R3F inner component ─────────────────────────────────────────
const SceneInner = React.forwardRef<Surface3DHandle, Surface3DProps & { className?: string; style?: React.CSSProperties }>((props, ref) => {
  const { gl, camera, scene } = useThree();

  // Setup renderer once
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.1;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    scene.background = new THREE.Color(0x000307);
  }, [gl, scene]);  // scene kept for background init

  // Background: subtle nebula dust + radial glow backdrop + atmosphere sphere
  useEffect(() => {
    scene.fog = new THREE.FogExp2(0x000307, 0.09);

    // Radial blue-glow backdrop — ShaderMaterial computes gradient analytically in GLSL,
    // eliminating all integer-quantization banding (Uint8 textures only have ~52 steps for blue).
    const bgMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 9),
      new THREE.ShaderMaterial({
        vertexShader: `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: `
          varying vec2 vUv;
          void main() {
            vec2 d = vUv * 2.0 - 1.0;
            float r2 = dot(d, d);
            // Wide ambient glow + tight center highlight — all floating-point, zero banding
            float wide = exp(-r2 * 0.85) * 0.36;
            float core = exp(-r2 * 4.0) * 0.20;
            gl_FragColor = vec4(
              wide * 0.014 + core * 0.06,
              wide * 0.042 + core * 0.14,
              wide * 0.21  + core * 0.55,
              1.0
            );
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    bgMesh.position.z = -2.5;
    scene.add(bgMesh);

    // Static nebula dust — tiny circular points, very faint
    const dotTex = makeRadialTex(32);
    const N = 520;
    const nPos = new Float32Array(N * 3);
    const nCol = new Float32Array(N * 3);
    let sd = 31337;
    const rn = () => { sd = Math.imul(sd ^ (sd>>>15), sd|1); sd ^= sd + Math.imul(sd^(sd>>>7), sd|61); return ((sd^(sd>>>14))>>>0)/0x100000000; };
    for (let i = 0; i < N; i++) {
      nPos[i*3]   = (rn()*2-1)*3.5;
      nPos[i*3+1] = (rn()*2-1)*3.5;
      nPos[i*3+2] = (rn()*2-1)*2.0 - 0.8;
      const b = 0.03 + rn()*0.09;
      nCol[i*3]=b*0.3; nCol[i*3+1]=b*0.5; nCol[i*3+2]=b;
    }
    const nebulaGeo = new THREE.BufferGeometry();
    nebulaGeo.setAttribute('position', new THREE.Float32BufferAttribute(nPos, 3));
    nebulaGeo.setAttribute('color',    new THREE.Float32BufferAttribute(nCol, 3));
    const nebulaPts = new THREE.Points(nebulaGeo, new THREE.PointsMaterial({
      size: 0.014, map: dotTex, vertexColors: true, transparent: true, opacity: 0.28,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    }));
    scene.add(nebulaPts);

    // Atmospheric glow — single large sphere (radius >> viewport) so the rim falls
    // completely off-screen. Camera is INSIDE looking outward: center of screen sees the
    // forward-facing surface (rim≈0, dark) while screen edges see oblique angles (rim→1,
    // bright). Result: seamless vignette glow with zero visible boundary.
    const atmoVert = `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `;
    const atmoSphere = new THREE.Mesh(
      new THREE.SphereGeometry(6.0, 64, 64),
      new THREE.ShaderMaterial({
        vertexShader: atmoVert,
        fragmentShader: `
          varying vec3 vNormal;
          varying vec3 vViewDir;
          void main() {
            float rim = 1.0 - abs(dot(vNormal, vViewDir));
            float glow = pow(rim, 1.8);
            gl_FragColor = vec4(glow * 0.008, glow * 0.028, glow * 0.14, 1.0);
          }
        `,
        transparent: true, blending: THREE.AdditiveBlending,
        side: THREE.BackSide, depthWrite: false,
      }),
    );
    atmoSphere.position.set(0, 0, 0);
    scene.add(atmoSphere);

    return () => {
      scene.fog = null;
      scene.remove(bgMesh);
      bgMesh.geometry.dispose(); (bgMesh.material as THREE.Material).dispose();
      scene.remove(nebulaPts);
      nebulaGeo.dispose(); dotTex.dispose(); (nebulaPts.material as THREE.Material).dispose();
      scene.remove(atmoSphere);
      atmoSphere.geometry.dispose(); (atmoSphere.material as THREE.Material).dispose();
    };
  }, [scene]);

  // Export handle
  useImperativeHandle(ref, () => ({
    async exportPng(sizePx: number): Promise<Blob | null> {
      return new Promise((resolve) => {
        gl.domElement.toBlob((blob) => resolve(blob), "image/png");
      });
    },
  }));

  const groupRef = useRef<THREE.Group>(null);
  const intensityRef = useRef<IntensityCache | null>(null);

  // Stable group objects (not recreated on re-render)
  const contourGroup = useMemo(() => new THREE.Group(), []);
  const maskGroup = useMemo(() => new THREE.Group(), []);
  const surfaceHolder = useMemo(() => new THREE.Group(), []);
  const surfaceRef = useRef<THREE.Mesh | null>(null);

  // Camera rotation/position from props
  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.rotation.order = "ZXY";
    groupRef.current.rotation.z = (props.azimuthDeg   * Math.PI) / 180;
    groupRef.current.rotation.x = -(props.elevationDeg * Math.PI) / 180;
    groupRef.current.rotation.y = (props.rollDeg       * Math.PI) / 180;
    groupRef.current.position.x =  props.offsetX * 0.50;
    groupRef.current.position.y =  props.offsetY * 0.50;
    groupRef.current.position.z =  props.offsetZ * 0.35;
  }, [props.azimuthDeg, props.elevationDeg, props.rollDeg, props.offsetX, props.offsetY, props.offsetZ]);

  // Zoom
  useEffect(() => {
    // Base distance 3.5 (was 2.8): compensates for MASK_Z_TOP 0.55→0.69 which made the chip
    // stack taller. Chip now appears ~80% of previous size at same zoomScale, so the zoom level
    // where 3D looks good is closer to where 2D also looks good (no need to zoom out as far).
    const zb = 0.52 + 0.48 * Math.pow(Math.max(0.15, Math.min(16, props.zoomScale)), 0.9);
    (camera as THREE.PerspectiveCamera).position.z = 3.5 / zb;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  }, [props.zoomScale, camera]);

  // Surface
  useEffect(() => {
    if (surfaceRef.current) {
      surfaceHolder.remove(surfaceRef.current);
      (surfaceRef.current.geometry as THREE.BufferGeometry).dispose();
      const m = surfaceRef.current.material as THREE.MeshStandardMaterial;
      m.map?.dispose(); m.emissiveMap?.dispose(); m.dispose();
      surfaceRef.current = null;
    }
    const { intensityData: data, intensityW: w, intensityH: h, depthScale, qualityMode, colormapType } = props;
    if (!data.length || !w || !h) { intensityRef.current = null; return; }
    let vmin = Infinity, vmax = -Infinity;
    for (const v of data) { if (v < vmin) vmin = v; if (v > vmax) vmax = v; }
    const span = Math.max(1e-9, vmax - vmin);
    const quality = qualityMode === "FULL" ? 96 : 48;
    const wSegs = Math.min(quality, Math.max(1, w - 1));
    const hSegs = Math.min(quality, Math.max(1, h - 1));
    const heightMax = depthScale * 0.04;
    // Store actual heightMax so contour lines follow the displaced surface
    intensityRef.current = { data, w, h, vmin, span, heightMax };
    const geom = buildSurfaceGeometry(data, w, h, vmin, span, depthScale, wSegs, hSegs);
    // Build emissive map: brighter pixels at peaks so they glow more
    const emPx = new Uint8ClampedArray(w * h * 4);
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const t = Math.max(0, Math.min(1, (data[j*w+i]-vmin)/span));
        const v = Math.round(Math.pow(t, 0.55) * 255);
        const pi = (j*w+i)*4;
        emPx[pi]=v; emPx[pi+1]=v; emPx[pi+2]=v; emPx[pi+3]=255;
      }
    }
    const emissiveTex = new THREE.DataTexture(emPx, w, h, THREE.RGBAFormat);
    emissiveTex.flipY = true; emissiveTex.needsUpdate = true;
    // Vertex colors from selected colormap — peaks use colormap top color as emissive
    const posAttr = geom.attributes.position as THREE.BufferAttribute;
    const numV = posAttr.count;
    const colArr = new Float32Array(numV * 3);
    for (let vi = 0; vi < numV; vi++) {
      const t = heightMax > 0 ? Math.max(0, Math.min(1, posAttr.getZ(vi) / heightMax)) : 0;
      const [r255, g255, b255] = evalColorMap(colormapType, t);
      colArr[vi*3] = r255/255; colArr[vi*3+1] = g255/255; colArr[vi*3+2] = b255/255;
    }
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colArr, 3));
    // Use colormap peak color as emissive so peaks glow in the right hue
    const [er, eg, eb] = evalColorMap(colormapType, 1.0);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xffffff),
      emissive: new THREE.Color(er/255, eg/255, eb/255),
      emissiveIntensity: 0.22,  // start value; useFrame pulses this
      emissiveMap: emissiveTex,
      roughness: 0.12,
      metalness: 0.60,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.z = 0.002;
    surfaceHolder.add(mesh);
    surfaceRef.current = mesh;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.intensityData, props.intensityW, props.intensityH, props.depthScale, props.qualityMode, props.colormapType]);

  // Contours
  useEffect(() => {
    disposeGroup(contourGroup);
    const iv = intensityRef.current;
    if (!iv) return;
    const { data, w: dw, h: dh, vmin, span, heightMax } = iv;
    const { fovNm } = props;
    const zOff = 0.005;
    const addContours = (contours: ContourSet[], color: number, dashed = false, epe?: EpePoint[][] | null) => {
      contours.forEach((c, ci) =>
        contourGroup.add(buildContourLine(c, fovNm, data, dw, dh, vmin, span, heightMax, color, 1, zOff, dashed, epe?.[ci]))
      );
    };
    if (props.showMainContour && props.contours.length) {
      const useEpe = props.epeContours && (props.epeMode === "COLOR" || props.epeMode === "BOTH");
      addContours(props.contours, 0xffffff, false, useEpe ? props.epeContours : null);
    }
    if (props.showTargetOverlay && props.targetContours.length) addContours(props.targetContours, 0x00eedd, true);
    if (props.compareActive) {
      addContours(props.compareAContours, 0x55aaff, true);
      addContours(props.compareBContours, 0xee55ff, true);
    }
    for (const set of props.sweepContourSets)
      addContours(set.contours, new THREE.Color(set.color).getHex(), !!set.dash);
    if (props.epeContours && (props.epeMode === "ARROWS" || props.epeMode === "BOTH")) {
      for (const segs of props.epeContours) {
        const step = Math.max(1, Math.floor(segs.length / 20));
        for (let i = 0; i < segs.length; i += step) {
          const seg = segs[i];
          if (seg.dist < 0.5) continue;
          const ax = seg.p.x/fovNm-0.5, ay = 0.5-seg.p.y/fovNm;
          const bx = seg.nearest.x/fovNm-0.5, by = 0.5-seg.nearest.y/fovNm;
          const az2 = sampleZ(seg.p.x, seg.p.y, fovNm, data, dw, dh, vmin, span, heightMax) + zOff;
          const bz  = sampleZ(seg.nearest.x, seg.nearest.y, fovNm, data, dw, dh, vmin, span, heightMax) + zOff;
          const g   = new THREE.BufferGeometry();
          g.setAttribute("position", new THREE.Float32BufferAttribute([ax,ay,az2,bx,by,bz], 3));
          contourGroup.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: epeColor(seg.dist) })));
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.contours, props.targetContours, props.finalMaskContours, props.showMainContour,
      props.showTargetOverlay, props.compareActive, props.compareAContours, props.compareBContours,
      props.sweepContourSets, props.epeContours, props.epeMode, props.fovNm, props.intensityData]);

  // Mask + aperture effects
  useEffect(() => {
    disposeGroup(maskGroup);
    const { maskAddRects, fovNm, showLightEffect } = props;
    if (!maskAddRects.length) return;
    maskGroup.add(buildMaskPlate(maskAddRects, fovNm));
    if (showLightEffect !== false) {
      for (const r of maskAddRects) {
        const cx = (r.x + r.w * 0.5) / fovNm - 0.5;
        const cy = 0.5 - (r.y + r.h * 0.5) / fovNm;
        const hw = r.w / (2 * fovNm);
        const hh = r.h / (2 * fovNm);
        maskGroup.add(buildApertureEffect(cx, cy, hw, hh, maskAddRects.length));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.maskAddRects, props.fovNm, props.showLightEffect]);

  // Cinematic emissive pulse — peaks slowly breathe with glow (ad-like feel)
  useFrame(({ clock }) => {
    if (surfaceRef.current) {
      const mat = surfaceRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.28 + 0.22 * Math.sin(clock.elapsedTime * 0.7);
    }
  });

  const waferColor = useMemo(() => new THREE.Color(0x1e2f42), []);
  const waferEmissive = useMemo(() => new THREE.Color(0x060e1c), []);

  return (
    <>
      {/* Cosmic lighting — deep void with blue peak illumination */}
      <ambientLight color={0x000510} intensity={0.3} />
      <pointLight color={0x3388ff} intensity={2.0 * Math.max(0.5, props.depthScale / 5)} distance={0} decay={2}
        position={[0, 0, 0.5]} />
      <hemisphereLight args={[0x001133, 0x000000, 0.5]} />

      {/* Main chip group */}
      <group ref={groupRef}>
        {/* Silicon wafer */}
        <mesh position-z={-(MASK_DEPTH / 2)}>
          <boxGeometry args={[1.05, 1.05, MASK_DEPTH]} />
          <meshPhysicalMaterial
            color={waferColor}
            emissive={waferEmissive}
            emissiveIntensity={0.5}
            roughness={0.08}
            metalness={0.72}
            clearcoat={0.50}
            clearcoatRoughness={0.06}
            transparent={true}
            opacity={0.88}
            depthWrite={false}
            envMapIntensity={1.4}
          />
        </mesh>


        {/* Imperative geometry groups */}
        <primitive object={surfaceHolder} />
        <primitive object={contourGroup} />
        <primitive object={maskGroup} />
      </group>
    </>
  );
});

SceneInner.displayName = "SceneInner";

// ── Surface3DCanvas — outer component wrapping R3F Canvas ─────────────────────
const Surface3DCanvas = React.forwardRef<
  Surface3DHandle,
  Surface3DProps & { className?: string; style?: React.CSSProperties }
>((props, ref) => {
  return (
    <Canvas
      gl={{ antialias: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      camera={{ position: [0, 0, 3.5], fov: 38, near: 0.01, far: 500 }}
      style={{ display: "block", width: "100%", height: "100%", ...props.style }}
      className={props.className}
      dpr={[1, 2]}
    >
      <color attach="background" args={["#000307"]} />
      <Environment preset="studio" background={false} environmentIntensity={0.1} />
      <SceneInner ref={ref} {...props} />
    </Canvas>
  );
});

Surface3DCanvas.displayName = "Surface3DCanvas";

export default Surface3DCanvas;
