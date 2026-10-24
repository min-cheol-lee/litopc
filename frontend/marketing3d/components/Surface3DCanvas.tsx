"use client";

/** Data-driven rendering with local, single-bounce planar reflections. */
import React, { useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree, type ThreeElements } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import type { Surface3DProps, Surface3DHandle, ContourSet, EpePoint, MaskRect } from "../lib/surface3d-types";
import { getSurfacePaletteColor } from "../lib/surface3d-palettes";
import { getSurface3dPivot, SURFACE3D_PLANES } from "../lib/surface3d-view";
import { getCachedIlluminationField, getSurfacePixelRatio, getSurfaceRenderBudget } from "../lib/surface3d-performance";
import { getEpeColor } from "../lib/epe-overlay";
import { mapColormapIntensity } from "../lib/colormap-display";

// Fiber 8 augments global JSX; React 19's types use React.JSX instead.
declare module "react" { namespace JSX { interface IntrinsicElements extends ThreeElements {} } }

const MASK_Z = 0.69;
const MASK_DEPTH = 0.015;
const SURFACE_Z = 0.0015;
const HEIGHT_PER_DEPTH = 0.021;
const FLOOR_Z = -0.115;
let areaLightInitialized = false;

const LEGACY_COLORS: Record<string, number[][]> = {
  plasma: [[13,8,135],[126,3,168],[203,71,120],[248,149,64],[240,249,33]],
  viridis: [[68,1,84],[59,82,139],[33,145,140],[94,201,98],[253,231,37]],
  hot: [[0,0,0],[255,0,0],[255,255,0],[255,255,255]], grayscale: [[0,0,0],[255,255,255]],
  ice: [[4,35,51],[23,93,122],[50,184,190],[232,251,255]],
  apple: [[14,20,30],[39,67,108],[94,92,230],[191,90,242],[255,69,58],[255,214,10]],
};
const LEGACY_BREAKPOINTS = Object.fromEntries(Object.entries(LEGACY_COLORS).map(([name, colors]) => [
  name, name === "apple" ? [0,.22,.45,.68,.86,1] : name === "hot" ? [0,.33,.67,1] : colors.map((_, i) => i / (colors.length - 1)),
]));

function colorMap(type: string, value: number, threshold = 1): [number, number, number] {
  const t = mapColormapIntensity(value, threshold);
  const modern = getSurfacePaletteColor(type, t);
  if (modern) return modern;
  const name = LEGACY_COLORS[type] ? type : "ice";
  const stops = LEGACY_COLORS[name], breakpoints = LEGACY_BREAKPOINTS[name];
  let a = 0;
  while (a < stops.length - 2 && t > breakpoints[a + 1]) a++;
  const u = (t - breakpoints[a]) / (breakpoints[a + 1] - breakpoints[a]);
  const lo = stops[a], hi = stops[a + 1];
  return [lo[0]+(hi[0]-lo[0])*u,lo[1]+(hi[1]-lo[1])*u,lo[2]+(hi[2]-lo[2])*u];
}

function sample(data: number[], w: number, h: number, fx: number, fy: number): number {
  const x = THREE.MathUtils.clamp(fx, 0, w - 1), y = THREE.MathUtils.clamp(fy, 0, h - 1);
  const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1);
  const u = x - x0, v = y - y0;
  return data[y0*w+x0]*(1-u)*(1-v) + data[y0*w+x1]*u*(1-v) + data[y1*w+x0]*(1-u)*v + data[y1*w+x1]*u*v;
}
interface IntensityCache { data: number[]; w: number; h: number; min: number; span: number; height: number; }
function sampleHeight(iv: IntensityCache, x: number, y: number, fov: number): number {
  return THREE.MathUtils.clamp((sample(iv.data, iv.w, iv.h, x/fov*(iv.w-1), y/fov*(iv.h-1))-iv.min)/iv.span, 0, 1) * iv.height;
}

function disposeGroup(group: THREE.Group) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  group.traverse((child) => {
    if (child instanceof Reflector) child.dispose();
    const item = child as THREE.Mesh;
    if (item.geometry) geometries.add(item.geometry);
    if (item.material) for (const m of Array.isArray(item.material) ? item.material : [item.material]) {
      materials.add(m);
      for (const value of Object.values(m)) if (value instanceof THREE.Texture) textures.add(value);
      if (m instanceof THREE.ShaderMaterial) for (const uniform of Object.values(m.uniforms)) {
        if (uniform.value instanceof THREE.Texture) textures.add(uniform.value);
      }
    }
  });
  geometries.forEach((g) => g.dispose()); materials.forEach((m) => m.dispose()); textures.forEach((t) => t.dispose());
  group.clear();
}

/** Union texture keeps overlapping OPC segments from producing internal seams. */
function maskTextures(rects: MaskRect[], subtract: MaskRect[], fov: number, size: number) {
  const pixels = new Uint8Array(size * size * 4); pixels.fill(255);
  const paint = (r: MaskRect, value: number) => {
    const x0 = Math.max(0, Math.floor((r.x/fov + 0.05)/1.1*size));
    const x1 = Math.min(size, Math.ceil(((r.x+r.w)/fov + 0.05)/1.1*size));
    const y0 = Math.max(0, Math.floor((1.05-(r.y+r.h)/fov)/1.1*size));
    const y1 = Math.min(size, Math.ceil((1.05-r.y/fov)/1.1*size));
    for (let y=y0; y<y1; y++) for (let x=x0; x<x1; x++) {
      const i = (y*size+x)*4; pixels[i]=pixels[i+1]=pixels[i+2]=value;
    }
  };
  rects.forEach((r) => paint(r, 0)); subtract.forEach((r) => paint(r, 255));
  const alpha = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  alpha.name = "RenderedMaskAlpha";
  alpha.generateMipmaps = true; alpha.minFilter = THREE.LinearMipmapLinearFilter; alpha.magFilter = THREE.LinearFilter; alpha.needsUpdate = true;
  const rimPixels = new Uint8Array(size*size*4);
  for (let y=1; y<size-1; y++) for (let x=1; x<size-1; x++) {
    const i=(y*size+x)*4;
    if (pixels[i] && (!pixels[i-4] || !pixels[i+4] || !pixels[i-size*4] || !pixels[i+size*4])) {
      rimPixels[i]=rimPixels[i+1]=rimPixels[i+2]=255; rimPixels[i+3]=220;
    }
  }
  const rim = new THREE.DataTexture(rimPixels, size, size, THREE.RGBAFormat);
  rim.name = "RenderedMaskRim";
  rim.generateMipmaps=true; rim.minFilter=THREE.LinearMipmapLinearFilter; rim.needsUpdate=true;
  return { alpha, rim };
}

const reflectionShader = {
  name: "RestrainedPlanarReflection",
  uniforms: {
    color: { value: new THREE.Color(0xffffff) }, tDiffuse: { value: null }, textureMatrix: { value: new THREE.Matrix4() },
    strength: { value: 0.2 }, alphaMask: { value: null }, hasMask: { value: 0 }, isFloor: { value: 0 },
    texel: { value: new THREE.Vector2(1/1024, 1/1024) },
  },
  vertexShader: `
    uniform mat4 textureMatrix;
    varying vec4 reflectedUv;
    varying vec2 surfaceUv;
    varying float grazing;
    void main() {
      reflectedUv = textureMatrix * vec4(position, 1.0);
      surfaceUv = uv;
      vec3 viewPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
      grazing = 1.0 - abs(dot(normalize(normalMatrix * normal), normalize(-viewPosition)));
      gl_Position = projectionMatrix * vec4(viewPosition, 1.0);
    }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform sampler2D alphaMask;
    uniform vec3 color;
    uniform float strength;
    uniform float hasMask;
    uniform float isFloor;
    uniform vec2 texel;
    varying vec4 reflectedUv;
    varying vec2 surfaceUv;
    varying float grazing;
    void main() {
      if (hasMask > 0.5 && texture2D(alphaMask, surfaceUv).g < 0.5) discard;
      vec2 p = reflectedUv.xy / reflectedUv.w;
      vec3 reflection = texture2D(tDiffuse, p).rgb * 0.44;
      reflection += texture2D(tDiffuse, p + vec2(texel.x, 0.0)).rgb * 0.14;
      reflection += texture2D(tDiffuse, p - vec2(texel.x, 0.0)).rgb * 0.14;
      reflection += texture2D(tDiffuse, p + vec2(0.0, texel.y)).rgb * 0.14;
      reflection += texture2D(tDiffuse, p - vec2(0.0, texel.y)).rgb * 0.14;
      float fade = mix(1.0, 1.0-smoothstep(0.2,0.5,length(surfaceUv-0.5)), isFloor);
      float opacity = strength * (0.72 + 0.28 * pow(grazing, 2.0)) * fade;
      gl_FragColor = vec4(reflection * color, opacity);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};

/** Other mirrors are hidden during each capture, leaving their physical bases.
 * This gives first-bounce scene reflections without recursive rendering. */
function makeReflection(width: number, height: number, resolution: number, strength: number, reflections: Set<Reflector>, alpha?: THREE.Texture, floor = false, excluded: THREE.Object3D[] = []) {
  const reflector = new Reflector(new THREE.PlaneGeometry(width, height), {
    textureWidth: resolution, textureHeight: resolution, clipBias: 0.0004, multisample: 2, shader: reflectionShader,
  });
  const mat = reflector.material as THREE.ShaderMaterial;
  reflector.camera.userData.renderedReflection = true;
  mat.transparent = true; mat.depthWrite = false;
  mat.uniforms.strength.value = strength;
  mat.uniforms.alphaMask.value = alpha || null; mat.uniforms.hasMask.value = alpha ? 1 : 0;
  mat.uniforms.isFloor.value = floor ? 1 : 0; mat.uniforms.texel.value.set(1/resolution, 1/resolution);
  const capture = reflector.onBeforeRender;
  reflector.onBeforeRender = function (renderer, scene, camera, geometry, material, group) {
    const hidden: Reflector[] = [];
    const excludedVisibility = excluded.map((object) => object.visible);
    excluded.forEach((object) => { object.visible = false; });
    reflections.forEach((other) => { if (other !== reflector && other.visible) { other.visible=false; hidden.push(other); } });
    try { capture.call(this, renderer, scene, camera, geometry, material, group); }
    finally {
      hidden.forEach((other) => { other.visible = true; });
      excluded.forEach((object, i) => { object.visible = excludedVisibility[i]; });
    }
  };
  reflections.add(reflector);
  return reflector;
}

function buildMask(props: Surface3DProps, reflections: Set<Reflector>, resolution: number, textureSize: number) {
  const group = new THREE.Group();
  const { alpha, rim } = maskTextures(props.maskAddRects, props.maskSubtractRects, props.fovNm, textureSize);
  const reveal = props.maskOpacityPreset === "REVEAL";
  const euv = (props.wavelengthNm || 193) < 100;
  const material = (underside: boolean) => new THREE.MeshPhysicalMaterial({
    color: 0x8ab0c8, roughness: 0.08, metalness: 0.85,
    clearcoat: 0.70, clearcoatRoughness: 0.08, iridescence: 0.085, iridescenceIOR: 1.55,
    emissive: 0x08111a, emissiveIntensity: 0.12,
    alphaMap: euv ? null : alpha, alphaTest: euv ? 0 : 0.025, transparent: !euv,
    opacity: euv ? 1 : reveal ? (underside ? 0.35 : 0.45) : (underside ? 0.52 : 0.76),
    depthWrite: euv || !reveal, side: underside ? THREE.BackSide : THREE.FrontSide, envMapIntensity: 2.0,
  });
  const top = new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.1), material(false));
  top.name = euv ? "RenderedEuvReflectiveSubstrate" : "RenderedDuvMask";
  top.position.z = euv ? MASK_Z - 0.0005 : MASK_Z;
  group.add(top);
  const bottom = new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.1), material(true));
  bottom.name = "RenderedMaskUnderside";
  bottom.position.z = MASK_Z - MASK_DEPTH;
  group.add(bottom);
  if (euv) {
    // An EUV reticle is a continuous reflective substrate. The dark absorber
    // leaves active regions reflective; it never opens a transmission hole.
    const absorber = new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.1), new THREE.MeshPhysicalMaterial({
      color: 0x27313e, roughness: 0.25, metalness: 0.6, opacity: 1,
      alphaMap: alpha, alphaTest: 0.5, transparent: false, depthWrite: true,
      side: THREE.FrontSide, envMapIntensity: 0.7,
    }));
    absorber.name = "RenderedEuvAbsorber";
    absorber.position.z = MASK_Z;
    group.add(absorber);
  }
  const edgeMaterial = new THREE.MeshPhysicalMaterial({color:0xaec7d7, roughness:0.12,metalness:0.88,clearcoat:0.7,clearcoatRoughness:0.08,envMapIntensity:1.2});
  for (const [x,y,w,h,rx,ry] of [
    [0,-0.55,1.1,MASK_DEPTH,Math.PI/2,0],[0,0.55,1.1,MASK_DEPTH,-Math.PI/2,0],
    [-0.55,0,MASK_DEPTH,1.1,0,-Math.PI/2],[0.55,0,MASK_DEPTH,1.1,0,Math.PI/2],
  ]) {
    const side=new THREE.Mesh(new THREE.PlaneGeometry(w,h),edgeMaterial); side.position.set(x,y,MASK_Z-MASK_DEPTH/2); side.rotation.set(rx,ry,0); group.add(side);
  }
  for (const underside of [false,true]) {
    if (euv && underside) continue;
    const edge=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.1),new THREE.MeshBasicMaterial({map:rim,color:0xc0d8e8,transparent:true,opacity:underside?0.18:0.32,side:underside?THREE.BackSide:THREE.FrontSide,depthWrite:false}));
    edge.position.z=underside?MASK_Z-MASK_DEPTH-0.0003:MASK_Z+0.0003; group.add(edge);
  }
  const mirror=makeReflection(1.1,1.1,resolution,reveal&&!euv?0.06:0.19,reflections,euv?undefined:alpha);
  mirror.rotation.x=Math.PI; mirror.position.z=MASK_Z-MASK_DEPTH-0.0005;
  (mirror.material as THREE.ShaderMaterial).vertexShader=reflectionShader.vertexShader.replace("surfaceUv = uv;", "surfaceUv = vec2(uv.x, 1.0 - uv.y);");
  mirror.renderOrder=2; group.add(mirror);
  return group;
}

/** Continuous illumination: one volume per optical path, never per OPC segment. */
function buildBeams(props: Surface3DProps) {
  const group = new THREE.Group();
  const field = getCachedIlluminationField(props.maskAddRects, props.maskSubtractRects, props.fovNm);
  if (!field) return group;
  const density = new THREE.DataTexture(field.data, field.size, field.size, THREE.RedFormat);
  density.minFilter = density.magFilter = THREE.LinearFilter;
  density.needsUpdate = true;
  const euv=(props.wavelengthNm || 193)<100;
  const slope=euv?Math.tan(6*Math.PI/180):0;
  const volume = (name: string, z0: number, z1: number, incident: boolean, direction = 0) => {
    const halfSize = new THREE.Vector3(field.width / 2, field.height / 2, (z1 - z0) / 2);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        densityMap: { value: density }, halfSize: { value: halfSize }, eyePosition: { value: new THREE.Vector3() },
        incident: { value: incident ? 1 : 0 }, scattering: { value: incident ? .20 : .32 }, sampleSteps: { value: 40 },
        beamColor: { value: new THREE.Color(euv ? 0xc4d7f0 : 0xbdcce5) },
      },
      vertexShader: `varying vec3 localPosition;
        void main(){localPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `
        uniform sampler2D densityMap;
        uniform vec3 halfSize, eyePosition, beamColor;
        uniform float incident, scattering, sampleSteps;
        varying vec3 localPosition;
        void main(){
          bool inside=all(lessThan(abs(eyePosition),halfSize));
          if(inside==gl_FrontFacing) discard;
          vec3 direction=normalize(localPosition-eyePosition);
          vec3 inverseRay=1.0/(mix(vec3(-1.0),vec3(1.0),step(vec3(0.0),direction))*max(abs(direction),vec3(1e-6)));
          vec3 a=(-halfSize-eyePosition)*inverseRay,b=(halfSize-eyePosition)*inverseRay;
          vec3 entry=min(a,b),exit=max(a,b);
          float start=max(0.0,max(entry.x,max(entry.y,entry.z)));
          float end=min(exit.x,min(exit.y,exit.z));
          if(end<=start) discard;
          float stepSize=(end-start)/sampleSteps,opticalDepth=0.0;
          for(int i=0;i<48;i++){
            if(float(i)>=sampleSteps) break;
            vec3 p=eyePosition+direction*(start+(float(i)+.5)*stepSize);
            vec3 uv=p/(2.0*halfSize)+.5;
            vec2 edge=smoothstep(vec2(0.0),vec2(.22),uv.xy)*(1.0-smoothstep(vec2(.78),vec2(1.0),uv.xy));
            float footprint=mix(texture2D(densityMap,uv.xy).r,edge.x*edge.y,incident);
            float ends=smoothstep(0.0,.07,uv.z)*(1.0-smoothstep(.78,1.0,uv.z));
            opticalDepth+=footprint*ends*stepSize*scattering;
          }
          gl_FragColor=vec4(beamColor,1.0-exp(-opticalDepth));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    });
    material.forceSinglePass = true;
    material.userData.liveSteps = 40;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(field.width, field.height, z1 - z0), material);
    const centerZ = (z0 + z1) / 2;
    mesh.name = name;
    mesh.matrixAutoUpdate = false;
    mesh.matrix.set(1, 0, direction * slope, field.centerX + direction * slope * (centerZ - MASK_Z),
      0, 1, 0, field.centerY, 0, 0, 1, centerZ, 0, 0, 0, 1);
    // Planar reflections render with their own cameras; every capture needs
    // its actual eye position in the (possibly sheared) volume's coordinates.
    mesh.onBeforeRender = (_renderer, _scene, camera) => {
      camera.getWorldPosition(material.uniforms.eyePosition.value);
      mesh.worldToLocal(material.uniforms.eyePosition.value);
      const steps = material.userData.liveSteps as number;
      material.uniforms.sampleSteps.value = camera.userData.renderedReflection ? Math.max(12, Math.ceil(steps * .65)) : steps;
      material.uniformsNeedUpdate = true;
    };
    mesh.renderOrder = 3;
    group.add(mesh);
  };
  if (euv) {
    // The incident and reflected paths remain above a reflective EUV mask.
    volume("RenderedIncidentLight", MASK_Z + .003, MASK_Z + .68, true, -1);
    volume("RenderedReflectedLight", MASK_Z + .003, MASK_Z + .68, false, 1);
  } else {
    volume("RenderedIncidentLight", MASK_Z + .003, MASK_Z + .68, true);
    volume("RenderedTransmittedLight", Math.max(.012, SURFACE_Z + props.depthScale * HEIGHT_PER_DEPTH + .005), MASK_Z - MASK_DEPTH - .001, false);
  }
  // One broad emitter avoids the bright specular dots of per-segment lights.
  if (!areaLightInitialized) { RectAreaLightUniformsLib.init(); areaLightInitialized = true; }
  const light = new THREE.RectAreaLight(0xb7cce5, .22, Math.max(.3, field.width), Math.max(.3, field.height));
  light.name = "RenderedIlluminationFill";
  light.position.set(field.centerX, field.centerY, MASK_Z - .04);
  group.add(light);
  return group;
}

function epeColor(dist:number) {
  const rgb = getEpeColor(dist);
  return new THREE.Color().setRGB(rgb[0]/255, rgb[1]/255, rgb[2]/255, THREE.SRGBColorSpace);
}

const geometryIntensity = new WeakMap<THREE.BufferGeometry, Float32Array>();
const geometryColorSettings = new WeakMap<THREE.BufferGeometry, { palette: string; threshold: number }>();

/** Recolor the scalar display without changing its positions, normals or alpha. */
function updateIntensityColors(geometry: THREE.BufferGeometry, palette: string, threshold = 1) {
  const previous = geometryColorSettings.get(geometry);
  if (previous?.palette === palette && previous.threshold === threshold) return;
  const normalized = geometryIntensity.get(geometry);
  if (!normalized) return;
  let colors = geometry.getAttribute("color") as THREE.BufferAttribute | undefined;
  if (!colors) {
    colors = new THREE.Float32BufferAttribute(new Float32Array(normalized.length * 3), 3);
    colors.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("color", colors);
  }
  const color = new THREE.Color();
  for (let i = 0; i < normalized.length; i++) {
    const rgb = colorMap(palette, normalized[i], threshold);
    color.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, THREE.SRGBColorSpace);
    colors.setXYZ(i, color.r, color.g, color.b);
  }
  colors.needsUpdate = true;
  geometryColorSettings.set(geometry, { palette, threshold });
}

function buildIntensityGeometry(iv: IntensityCache, palette: string, limit: number, threshold = 1) {
  const { data, w, h, min, span, height } = iv;
  const geometry = new THREE.PlaneGeometry(1, 1, Math.min(limit, Math.max(1, w - 1)), Math.min(limit, Math.max(1, h - 1)));
  const positions = geometry.attributes.position as THREE.BufferAttribute;
  const normalized = new Float32Array(positions.count);
  for (let i = 0; i < positions.count; i++) {
    const t = THREE.MathUtils.clamp((sample(data, w, h, (positions.getX(i) + .5) * (w - 1), (.5 - positions.getY(i)) * (h - 1)) - min) / span, 0, 1);
    positions.setZ(i, t * height);
    normalized[i] = t;
  }
  geometryIntensity.set(geometry, normalized);
  updateIntensityColors(geometry, palette, threshold);
  geometry.computeVertexNormals();
  return geometry;
}
/** Fade the data overlay without resampling the field or its transparency map. */
function updateIntensityOpacity(surface: THREE.Group, showAerial: boolean, value = 1) {
  const opacity = Number.isFinite(value) ? THREE.MathUtils.clamp(value, 0, 1) : 1;
  surface.visible = showAerial && opacity > 0;
  surface.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      material.opacity = opacity;
      // The alpha test follows opacity, retaining the same low-field cutoff
      // while fading. Keep its shader branch enabled even while hidden at 0.
      material.alphaTest = .035 * Math.max(opacity, Number.EPSILON);
    }
  });
}

function contourLine(contour:ContourSet, props:Surface3DProps, iv:IntensityCache|null, color:number|THREE.Color, dashed=false, epe?:EpePoint[], fixedZ?:number, opacity=1) {
  const positions:number[]=[], colors:number[]=[];
  const points=contour.points_nm, useEpe=epe?.length===points.length;
  if (points.length<2) return new THREE.Line();
  for (let i=0;i<=points.length;i++) {
    const p=points[i%points.length];
    const z=fixedZ ?? (SURFACE_Z+(props.showAerial&&iv?sampleHeight(iv,p.x,p.y,props.fovNm):0)+0.0025);
    positions.push(p.x/props.fovNm-.5,.5-p.y/props.fovNm,z);
    if(useEpe){const c=epeColor(epe![i%points.length].dist);colors.push(c.r,c.g,c.b);}
  }
  const geom=new THREE.BufferGeometry();geom.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
  if(useEpe)geom.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));
  const material=dashed?new THREE.LineDashedMaterial({color,dashSize:.012,gapSize:.008,transparent:opacity<1,opacity}):new THREE.LineBasicMaterial({color:useEpe?0xffffff:color,vertexColors:useEpe,transparent:opacity<1,opacity});
  material.toneMapped = !useEpe;
  const line=new THREE.Line(geom,material);if(dashed)line.computeLineDistances();return line;
}

const SceneInner=React.forwardRef<Surface3DHandle,Surface3DProps & { onDprChange: (ratio: number) => void; transparent?: boolean; onFirstFrame?: () => void }>((props,ref)=>{
  const {gl,camera,scene,invalidate,size}=useThree();
  const outer=useRef<THREE.Group>(null);
  const chip=useMemo(()=>new THREE.Group(),[]), surface=useMemo(()=>new THREE.Group(),[]), contours=useMemo(()=>new THREE.Group(),[]), mask=useMemo(()=>new THREE.Group(),[]), beams=useMemo(()=>new THREE.Group(),[]), ground=useMemo(()=>new THREE.Group(),[]);
  const reflections=useMemo(()=>new Set<Reflector>(),[]);
  const intensity=useRef<IntensityCache|null>(null);
  const desiredDpr = getSurfacePixelRatio(size.width, size.height, typeof window === "undefined" ? 1 : window.devicePixelRatio || 1, props.qualityMode);
  const budget = getSurfaceRenderBudget(size.width, size.height, desiredDpr, props.qualityMode);
  const resolution = budget.maskTextureSize === 1024 ? 512 : 1024;
  const drawnFrames=useRef(0);
  useFrame(()=>{
    if(drawnFrames.current>=3)return;
    drawnFrames.current++;
    if(drawnFrames.current<3)invalidate();else props.onFirstFrame?.();
  });

  useEffect(() => {
    props.onDprChange(desiredDpr);
  }, [desiredDpr, props.onDprChange]);

  useEffect(()=>{
    gl.toneMapping=THREE.ACESFilmicToneMapping; gl.toneMappingExposure=1.02;gl.outputColorSpace=THREE.SRGBColorSpace;
    if(props.transparent){scene.background=null;return;}
    scene.background=new THREE.Color(0x03070c);
    const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShaderMaterial({
      vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader:`varying vec2 vUv;
        void main(){vec2 p=(vUv-.5)*32.0;float g=exp(-dot(p-vec2(.1,-.1),p-vec2(.1,-.1))*.8);float shoulder=exp(-dot(p-vec2(-.5,.25),p-vec2(-.5,.25))*2.0);float grain=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)/1100.0;vec3 col=vec3(.0022,.004,.007)+vec3(.004,.010,.020)*g+vec3(.002,.005,.007)*shoulder;gl_FragColor=vec4(col+grain,1.0);
        #include <colorspace_fragment>
        }`, depthWrite:false,toneMapped:false,
    }));
    backdrop.position.z=-6;backdrop.renderOrder=-100;scene.add(backdrop);
    return()=>{scene.remove(backdrop);backdrop.geometry.dispose();(backdrop.material as THREE.Material).dispose();};
  },[gl,scene,props.transparent]);

  useEffect(()=>{
    if(!outer.current)return;
    outer.current.rotation.order="ZXY";
    outer.current.rotation.set(-props.elevationDeg*Math.PI/180,props.rollDeg*Math.PI/180,props.azimuthDeg*Math.PI/180,"ZXY");
    const pivot=getSurface3dPivot("rendered");
    outer.current.position.set(props.offsetX*.5,props.offsetY*.5,props.offsetZ*.35+pivot);
    chip.position.z=-pivot;invalidate();
  },[props.azimuthDeg,props.elevationDeg,props.rollDeg,props.offsetX,props.offsetY,props.offsetZ,chip,invalidate]);
  useEffect(()=>{
    const zb=.52+.48*Math.pow(THREE.MathUtils.clamp(props.zoomScale,.15,16),.9);
    camera.position.z=3.5/zb;camera.updateProjectionMatrix();invalidate();
  },[props.zoomScale,camera,invalidate]);

  useEffect(()=>{
    disposeGroup(surface);
    const {intensityData:data,intensityW:w,intensityH:h}=props;
    if(!w||!h||data.length<w*h){intensity.current=null;return;}
    let min=Infinity,max=-Infinity;for(const value of data){if(Number.isFinite(value)){min=Math.min(min,value);max=Math.max(max,value);}}
    if(!Number.isFinite(min)){intensity.current=null;return;}
    const span=Math.max(1e-9,max-min),height=Math.max(0,props.depthScale)*HEIGHT_PER_DEPTH;
    intensity.current={data,w,h,min,span,height};
    const geo = buildIntensityGeometry(intensity.current, props.colormapType, budget.geometrySegments, props.colormapThreshold ?? 1);
    const rgba=new Uint8Array(w*h*4);
    for(let i=0;i<w*h;i++){
      const t=THREE.MathUtils.clamp((data[i]-min)/span,0,1),a=Math.round(THREE.MathUtils.smoothstep(t,.012,.2)*255);
      rgba[i*4]=rgba[i*4+1]=rgba[i*4+2]=a;rgba[i*4+3]=255;
    }
    const alpha=new THREE.DataTexture(rgba,w,h,THREE.RGBAFormat);alpha.flipY=true;alpha.minFilter=THREE.LinearFilter;alpha.magFilter=THREE.LinearFilter;alpha.needsUpdate=true;
    const mat=new THREE.MeshPhysicalMaterial({color:0xc0cbd6,vertexColors:true,specularIntensity:0,roughness:.65,metalness:0,clearcoat:0,emissive:0x45515d,emissiveIntensity:.015,alphaMap:alpha,transparent:true,depthWrite:true,alphaTest:.035,envMapIntensity:.1,side:THREE.DoubleSide});
    const mesh=new THREE.Mesh(geo,mat);mesh.name="RenderedIntensitySurface";mesh.position.z=SURFACE_Z;surface.add(mesh);
    updateIntensityOpacity(surface, props.showAerial, props.colormapOpacity);
    invalidate();
  },[props.intensityData,props.intensityW,props.intensityH,props.depthScale,budget.geometrySegments,surface,invalidate]);
  useEffect(() => {
    const mesh = surface.children.find((object) => object instanceof THREE.Mesh) as THREE.Mesh | undefined;
    if (mesh) updateIntensityColors(mesh.geometry, props.colormapType, props.colormapThreshold ?? 1);
    invalidate();
  }, [props.colormapType, props.colormapThreshold, props.intensityData, props.intensityW, props.intensityH, props.depthScale, budget.geometrySegments, surface, invalidate]);
  useEffect(() => {
    updateIntensityOpacity(surface, props.showAerial, props.colormapOpacity);
    invalidate();
  }, [props.showAerial, props.colormapOpacity, surface, invalidate]);

  useEffect(()=>{
    disposeGroup(contours);const iv=intensity.current;
    const color=props.contourStyle==="GOLD"?0xd8bd87:props.contourStyle==="NEON"?0xa7e2df:props.contourStyle==="MINIMAL"?0xc3ced8:0xe8edf2;
    const opacity=props.contourStyle==="MINIMAL"?.62:.95;
    const add=(sets:ContourSet[],c:number|THREE.Color,dashed=false,epe?:EpePoint[][]|null,fixedZ?:number,alpha=opacity)=>sets.forEach((set,i)=>contours.add(contourLine(set,props,iv,c,dashed,epe?.[i],fixedZ,alpha)));
    const colorEpe = !!props.epeContours && (props.epeMode === "COLOR" || props.epeMode === "BOTH");
    if(props.showMainContour || colorEpe)add(props.contours,color,false,colorEpe?props.epeContours:null,undefined,colorEpe ? 1 : opacity);
    if(props.showTargetOverlay)add(props.targetContours,props.targetColor??0xcc4a5c,true,null,undefined,.9);
    if(props.compareActive){add(props.compareAContours,0x91b6dc,true);add(props.compareBContours,0xc9abc9,true);}
    for (const set of props.sweepContourSets) {
      let fixedZ: number | undefined;
      if (set.plane === "mask") {
        fixedZ = MASK_Z + (set.baseZ === undefined ? 0.002 : set.baseZ - SURFACE3D_PLANES.classic.maskTopZ);
      } else if (set.plane === "silicon") {
        fixedZ = set.baseZ === undefined ? 0.002 : set.baseZ - SURFACE3D_PLANES.classic.siliconCenterZ;
      }
      add(set.contours, new THREE.Color(set.color), !!set.dash, null, fixedZ, set.opacity);
    }
    if(props.epeContours&&(props.epeMode==="ARROWS"||props.epeMode==="BOTH")) {
      const positions: number[] = [], colors: number[] = [];
      const worldPerPixel = 2 * camera.position.z * Math.tan((camera as THREE.PerspectiveCamera).fov * Math.PI / 360) / Math.max(1, size.height);
      const headLength = Math.min(.025, worldPerPixel * 3.2);
      const point = (x: number, y: number) => new THREE.Vector3(x, y, SURFACE_Z + (props.showAerial && iv ? sampleHeight(iv, (x + .5) * props.fovNm, (.5 - y) * props.fovNm, props.fovNm) : 0) + .0045);
      const addSegment = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Color) => {
        positions.push(a.x,a.y,a.z,b.x,b.y,b.z);
        colors.push(c.r,c.g,c.b,c.r,c.g,c.b);
      };
      for(const segments of props.epeContours) {
        const stride=Math.max(1,Math.floor(segments.length/24));
        for(let i=0;i<segments.length;i+=stride) {
          const s=segments[i]; if(s.dist < .05) continue;
          const ax=s.p.x/props.fovNm-.5, ay=.5-s.p.y/props.fovNm;
          const bx=s.nearest.x/props.fovNm-.5, by=.5-s.nearest.y/props.fovNm;
          const length=Math.hypot(bx-ax,by-ay); if(length < 1e-9) continue;
          const dx=(bx-ax)/length, dy=(by-ay)/length, c=epeColor(s.dist);
          const markerHead = Math.min(headLength, length * .45);
          const tip=point(bx,by), start=point(ax,ay);
          addSegment(start,tip,c);
          addSegment(tip,point(bx-dx*markerHead-dy*markerHead*.48,by-dy*markerHead+dx*markerHead*.48),c);
          addSegment(tip,point(bx-dx*markerHead+dy*markerHead*.48,by-dy*markerHead-dx*markerHead*.48),c);
        }
      }
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
      geometry.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));
      const vectors=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.95,toneMapped:false}));
      vectors.name="RenderedEpeVectors";
      vectors.userData.arrowCount = positions.length / 18;
      contours.add(vectors);
    }
    invalidate();
  },[props.contours,props.targetContours,props.finalMaskContours,props.showMainContour,props.showTargetOverlay,props.compareActive,props.compareAContours,props.compareBContours,props.sweepContourSets,props.epeContours,props.epeMode,props.fovNm,props.intensityData,props.depthScale,props.showAerial,props.contourStyle,props.zoomScale,size.height,camera,contours,invalidate,props.targetColor]);

  useEffect(()=>{
    mask.traverse((child)=>{if(child instanceof Reflector)reflections.delete(child);});disposeGroup(mask);
    if(props.maskAddRects.length)mask.add(buildMask(props,reflections,resolution,budget.maskTextureSize));invalidate();
    return()=>{mask.traverse((child)=>{if(child instanceof Reflector)reflections.delete(child);});disposeGroup(mask);};
  },[props.maskAddRects,props.maskSubtractRects,props.fovNm,props.maskOpacityPreset,budget.maskTextureSize,props.wavelengthNm,mask,reflections,resolution,invalidate]);
  useEffect(() => {
    disposeGroup(beams);
    if (props.showLightEffect !== false && props.maskAddRects.length) {
      beams.add(buildBeams(props));
    }
    invalidate();
    return () => disposeGroup(beams);
  }, [props.maskAddRects, props.maskSubtractRects, props.fovNm, props.showLightEffect, props.wavelengthNm, props.depthScale, beams, invalidate]);
  useEffect(() => {
    beams.traverse((object) => {
      const material = (object as THREE.Mesh).material;
      if (material instanceof THREE.ShaderMaterial && material.uniforms.sampleSteps) material.userData.liveSteps = budget.lightSteps;
    });
    invalidate();
  }, [budget.lightSteps, props.maskAddRects, props.maskSubtractRects, props.fovNm, props.showLightEffect, props.wavelengthNm, props.depthScale, beams, invalidate]);
  useEffect(()=>{
    ground.traverse((child)=>{if(child instanceof Reflector)reflections.delete(child);});disposeGroup(ground);
    const silicon=new THREE.Mesh(new THREE.BoxGeometry(1.05,1.05,MASK_DEPTH),new THREE.MeshPhysicalMaterial({color:props.waferColor??0x1e2f42,emissive:0x030911,emissiveIntensity:.22,roughness:.09,metalness:.72,clearcoat:.55,clearcoatRoughness:.07,envMapIntensity:.5}));
    silicon.name="RenderedSilicon";silicon.position.z=-MASK_DEPTH/2;ground.add(silicon);
    // The aerial surface and its labels are data overlays, not solid wafer
    // geometry. Reflect the mask and lights without duplicating that field.
    const siliconMirror=makeReflection(1.049,1.049,resolution,.24,reflections,undefined,false,[surface,contours]);siliconMirror.name="RenderedSiliconReflection";siliconMirror.position.z=.0004;siliconMirror.renderOrder=-1;ground.add(siliconMirror);
    const floor=makeReflection(5.4,5.4,resolution,.17,reflections,undefined,true);floor.name="RenderedFloorReflection";floor.position.z=FLOOR_Z;floor.renderOrder=0;ground.add(floor);invalidate();
    return()=>{ground.traverse((child)=>{if(child instanceof Reflector)reflections.delete(child);});disposeGroup(ground);};
  },[ground,reflections,resolution,invalidate,props.waferColor]);
  useEffect(() => {
    reflections.forEach((reflector) => {
      const target = reflector.getRenderTarget();
      if (target.width !== budget.reflectionSize) target.setSize(budget.reflectionSize, budget.reflectionSize);
      (reflector.material as THREE.ShaderMaterial).uniforms.texel.value.set(1 / budget.reflectionSize, 1 / budget.reflectionSize);
    });
    invalidate();
  }, [budget.reflectionSize, props.maskAddRects, props.maskSubtractRects, props.maskOpacityPreset, props.wavelengthNm, props.fovNm, reflections, invalidate]);
  useEffect(()=>()=>{disposeGroup(surface);disposeGroup(contours);},[surface,contours]);

  useImperativeHandle(ref, () => ({
    async exportPng(sizePx: number): Promise<Blob | null> {
      const context = gl.getContext();
      const maximum = context.getParameter(context.MAX_RENDERBUFFER_SIZE) as number;
      const size = Math.floor(Math.max(1, sizePx));
      if (size > maximum) throw new Error(`This GPU supports PNG sizes up to ${maximum} px.`);

      const oldSize = gl.getSize(new THREE.Vector2());
      const oldRatio = gl.getPixelRatio();
      const perspective = camera as THREE.PerspectiveCamera;
      const oldAspect = perspective.aspect;
      const reflectionSizes = new Map<Reflector, THREE.Vector2>();
      const lightSteps = new Map<THREE.ShaderMaterial, number>();
      const restoreTextures: Array<() => void> = [];
      const surfaceMesh = surface.children.find((object) => object instanceof THREE.Mesh) as THREE.Mesh | undefined;
      const liveGeometry = surfaceMesh?.geometry;
      let exportGeometry: THREE.BufferGeometry | null = null;
      let exportMask: ReturnType<typeof maskTextures> | null = null;
      try {
        // A mini preview has a lighter live mesh; exported pixels always use
        // the full data geometry and full-size aperture textures.
        if (surfaceMesh && intensity.current) {
          exportGeometry = buildIntensityGeometry(intensity.current, props.colormapType, 384, props.colormapThreshold ?? 1);
          surfaceMesh.geometry = exportGeometry;
        }
        if (budget.maskTextureSize < 2048 && props.maskAddRects.length) {
          exportMask = maskTextures(props.maskAddRects, props.maskSubtractRects, props.fovNm, 2048);
          const replacement = (texture: THREE.Texture) => texture.name === "RenderedMaskAlpha" ? exportMask!.alpha : texture.name === "RenderedMaskRim" ? exportMask!.rim : null;
          mask.traverse((object) => {
            const entry = (object as THREE.Mesh).material;
            if (!entry) return;
            for (const material of Array.isArray(entry) ? entry : [entry]) {
              const physical = material as THREE.MeshPhysicalMaterial;
              for (const key of ["map", "alphaMap"] as const) {
                const old = physical[key], next = old && replacement(old);
                if (next) { physical[key] = next; restoreTextures.push(() => { physical[key] = old; }); }
              }
              if (material instanceof THREE.ShaderMaterial) for (const uniform of Object.values(material.uniforms)) {
                const old = uniform.value;
                if (!(old instanceof THREE.Texture)) continue;
                const next = replacement(old);
                if (next) { uniform.value = next; material.uniformsNeedUpdate = true; restoreTextures.push(() => { uniform.value = old; material.uniformsNeedUpdate = true; }); }
              }
            }
          });
        }
        beams.traverse((object) => {
          const material = (object as THREE.Mesh).material;
          if (!(material instanceof THREE.ShaderMaterial) || !material.uniforms.sampleSteps) return;
          lightSteps.set(material, material.userData.liveSteps);
          material.userData.liveSteps = 48;
        });
        reflections.forEach((reflector) => {
          const target = reflector.getRenderTarget();
          reflectionSizes.set(reflector, new THREE.Vector2(target.width, target.height));
          const reflectionSize = Math.min(2048, size);
          target.setSize(reflectionSize, reflectionSize);
          (reflector.material as THREE.ShaderMaterial).uniforms.texel.value.set(1 / reflectionSize, 1 / reflectionSize);
        });
        gl.setPixelRatio(1);
        gl.setSize(size, size, false);
        perspective.aspect = 1;
        perspective.updateProjectionMatrix();
        scene.updateMatrixWorld(true);
        gl.render(scene, camera);
        // Snapshot immediately; the live renderer need not preserve its buffer.
        return await new Promise<Blob | null>((resolve) => gl.domElement.toBlob(resolve, "image/png"));
      } finally {
        restoreTextures.forEach((restore) => restore());
        exportMask?.alpha.dispose(); exportMask?.rim.dispose();
        if (surfaceMesh && liveGeometry) surfaceMesh.geometry = liveGeometry;
        exportGeometry?.dispose();
        lightSteps.forEach((steps, material) => { material.userData.liveSteps = steps; });
        gl.setPixelRatio(oldRatio);
        gl.setSize(oldSize.x, oldSize.y, false);
        perspective.aspect = oldAspect;
        perspective.updateProjectionMatrix();
        reflectionSizes.forEach((saved, reflector) => {
          reflector.getRenderTarget().setSize(saved.x, saved.y);
          (reflector.material as THREE.ShaderMaterial).uniforms.texel.value.set(1 / saved.x, 1 / saved.y);
        });
        gl.render(scene, camera);
        invalidate();
      }
    },
  }), [gl, camera, scene, reflections, invalidate, surface, mask, beams, props.colormapType, props.colormapThreshold, props.maskAddRects, props.maskSubtractRects, props.fovNm, budget.maskTextureSize]);

  return <>
    <ambientLight color={0xb9c9dc} intensity={0.28}/>
    <hemisphereLight args={[0xc3d3e5,0x14202c,0.45]}/>
    <directionalLight color={0xf0f4ff} intensity={2.2} position={[-2,1.5,3]}/>
    <directionalLight color={0xa2bfdf} intensity={1.1} position={[2,-1,1.2]}/>
    <directionalLight color={0xd2dde8} intensity={0.55} position={[0,1,-2]}/>
    <group ref={outer} name="RenderedPivot">
      <primitive object={chip} name="RenderedChip">
        <primitive object={ground} name="RenderedGround"/>
        <primitive object={surface} name="RenderedSurface"/>
        <primitive object={contours} name="RenderedContours"/>
        <primitive object={mask} name="RenderedMask"/>
        <primitive object={beams} name="RenderedBeams"/>
      </primitive>
    </group>
  </>;
});
SceneInner.displayName="RenderedScene";

/** Warm the local studio after the portal commits, then keep its cubemap.
 * Camera movement does not change the stationary studio environment. */
const StudioEnvironment = React.memo(function StudioEnvironment() {
  const invalidate = useThree((state) => state.invalidate);
  const [settled, setSettled] = useState(false);
  const frames = useRef(0);
  useEffect(() => { invalidate(); }, [invalidate]);
  useFrame(() => {
    if (settled) return;
    frames.current++;
    if (frames.current >= 2) setSettled(true);
    else invalidate();
  });
  return <Environment resolution={256} frames={settled ? 1 : 2} background={false} environmentIntensity={0.85}>
    <Lightformer form="rect" intensity={2.4} color="#edf3fa" position={[-2,1.8,3]} scale={[6,3.5,1]} target={[0,0,0]}/>
    <Lightformer form="rect" intensity={1.7} color="#afcbe6" position={[2,-1,1.5]} scale={[.8,4,1]} target={[0,0,.3]}/>
    <Lightformer form="rect" intensity={1.25} color="#bfd0df" position={[0,1,-2]} scale={[3.5,1.5,1]} target={[0,0,0]}/>
    <Lightformer form="rect" intensity={1.8} color="#edf3f8" position={[-2.5,3.6,-1.2]} scale={[4,1.5,1]} target={[0,0,0]}/>
    <Lightformer form="rect" intensity={0.65} color="#c5d6e4" position={[3,2,-0.8]} scale={[2.5,2,1]} target={[0,0,0]}/>
    <Lightformer form="rect" intensity={0.45} color="#adbed0" position={[-3,-2,0.5]} scale={[2,3,1]} target={[0,0,0]}/>
  </Environment>;
});

const Surface3DCanvas=React.forwardRef<Surface3DHandle,Surface3DProps&{className?:string;style?:React.CSSProperties;transparent?:boolean;onFirstFrame?:()=>void}>((props,ref)=>{
  const [dpr, setDpr] = useState(2);
  return <Canvas
    gl={{antialias:true,powerPreference:"high-performance",toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1.02}}
    camera={{position:[0,0,3.5],fov:38,near:.015,far:100}}
    style={{display:"block",width:"100%",height:"100%",...props.style}} className={props.className} dpr={dpr} frameloop="demand"
  >
    <StudioEnvironment/>
    <SceneInner ref={props.rendererRef ?? ref} {...props} onDprChange={setDpr}/>
  </Canvas>;
});
Surface3DCanvas.displayName="Surface3DCanvas";
export default Surface3DCanvas;
