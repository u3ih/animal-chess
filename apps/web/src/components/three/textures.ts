"use client";

import * as THREE from "three";

/**
 * Procedural canvas textures that give the board the painted "jungle ruins" look of
 * jungle-backdrop.png — mossy stone terraces, turquoise water, weathered stone.
 * Generated once on the client (the Canvas is ssr:false) and cached as module singletons.
 */

function makeCanvas(size: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  return { canvas, ctx };
}

function toTexture(canvas: HTMLCanvasElement, repeat = false): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
  }
  return texture;
}

/** Scatter soft blobs to fake painterly noise/lichen. */
function splotches(
  ctx: CanvasRenderingContext2D,
  size: number,
  count: number,
  colors: string[],
  rMin: number,
  rMax: number,
  alpha: number
) {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = rMin + Math.random() * (rMax - rMin);
    const color = colors[(Math.random() * colors.length) | 0];
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Faint carved grout lines dividing the tile into stone blocks. */
function grout(ctx: CanvasRenderingContext2D, size: number, divisions: number, color: string, width: number) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  const step = size / divisions;
  for (let i = 1; i < divisions; i++) {
    const jitter = (Math.random() - 0.5) * step * 0.18;
    ctx.beginPath();
    ctx.moveTo(i * step + jitter, 0);
    ctx.lineTo(i * step - jitter, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * step + jitter);
    ctx.lineTo(size, i * step - jitter);
    ctx.stroke();
  }
}

/** Mossy grass-on-stone tile top. A few variants so the terrace doesn't look tiled. */
function buildMossStone(seedShift: number): THREE.CanvasTexture {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size);
  ctx.fillStyle = "#5d7d3a";
  ctx.fillRect(0, 0, size, size);
  // weathered stone base bleeding through
  splotches(ctx, size, 26 + seedShift, ["#6f6048", "#54472f", "#7a8a52"], 22, 70, 0.32);
  // moss layers
  splotches(ctx, size, 70, ["#6f9442", "#4f6e2c", "#86a64f"], 10, 40, 0.4);
  splotches(ctx, size, 120, ["#9bbd5d", "#3f5a26"], 3, 14, 0.5);
  grout(ctx, size, 2, "rgba(28, 38, 20, 0.45)", 4);
  // subtle inner-edge shade for raised-block read
  ctx.strokeStyle = "rgba(20, 28, 14, 0.5)";
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, size - 10, size - 10);
  ctx.strokeStyle = "rgba(196, 220, 150, 0.22)";
  ctx.lineWidth = 3;
  ctx.strokeRect(12, 12, size - 24, size - 24);
  return toTexture(canvas);
}

/** Weathered gray stone for walls, bridges, dens. */
function buildStone(): THREE.CanvasTexture {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size);
  ctx.fillStyle = "#8a8270";
  ctx.fillRect(0, 0, size, size);
  splotches(ctx, size, 40, ["#9a927e", "#6f6857", "#736b54"], 18, 60, 0.4);
  splotches(ctx, size, 60, ["#a8a18c", "#5c5645"], 4, 16, 0.45);
  // a touch of moss creeping in
  splotches(ctx, size, 24, ["#6f8b43", "#4f6e2c"], 8, 26, 0.3);
  grout(ctx, size, 4, "rgba(40, 36, 26, 0.5)", 3);
  return toTexture(canvas, true);
}

/** Bright turquoise water with caustic squiggles; tiles + scrolls for flow. */
function buildWater(): THREE.CanvasTexture {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size);
  const base = ctx.createLinearGradient(0, 0, size, size);
  base.addColorStop(0, "#1f6f8f");
  base.addColorStop(0.5, "#2f93a8");
  base.addColorStop(1, "#1c6b88");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  splotches(ctx, size, 30, ["#3aa9bd", "#155a78"], 20, 64, 0.4);
  // caustic highlights (drawn wrapped so the scroll seam is hidden)
  ctx.strokeStyle = "rgba(190, 240, 250, 0.5)";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = 8 + Math.random() * 22;
    const a = Math.random() * Math.PI;
    for (const dx of [-size, 0, size]) {
      ctx.beginPath();
      ctx.moveTo(x + dx, y);
      ctx.quadraticCurveTo(x + dx + len * 0.5, y - 4, x + dx + Math.cos(a) * len, y + Math.sin(a) * len);
      ctx.stroke();
    }
  }
  return toTexture(canvas, true);
}

/** Glowing lightning-bolt glyph (transparent bg) for the electrified trap tiles. */
function buildLightning(): THREE.CanvasTexture {
  const w = 128;
  const h = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");

  const bolt: [number, number][] = [
    [74, 8],
    [38, 126],
    [64, 126],
    [42, 248],
    [98, 112],
    [70, 112]
  ];
  const trace = () => {
    ctx.beginPath();
    ctx.moveTo(bolt[0][0], bolt[0][1]);
    for (let i = 1; i < bolt.length; i++) ctx.lineTo(bolt[i][0], bolt[i][1]);
    ctx.closePath();
  };

  // outer electric glow
  ctx.shadowColor = "#6fe0ff";
  ctx.shadowBlur = 26;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.5, "#cfefff");
  grad.addColorStop(1, "#8fd6ff");
  ctx.fillStyle = grad;
  trace();
  ctx.fill();
  // bright inner core
  ctx.shadowBlur = 8;
  ctx.shadowColor = "#ffffff";
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.lineWidth = 3;
  trace();
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

let mossCache: THREE.CanvasTexture[] | null = null;
let stoneCache: THREE.CanvasTexture | null = null;
let waterCache: THREE.CanvasTexture | null = null;
let lightningCache: THREE.CanvasTexture | null = null;

/** One of three mossy-stone variants, chosen per tile so the terrace reads as hand-laid. */
export function getMossStoneTexture(variant: number): THREE.CanvasTexture {
  if (!mossCache) mossCache = [buildMossStone(0), buildMossStone(8), buildMossStone(16)];
  return mossCache[variant % mossCache.length];
}

export function getStoneTexture(): THREE.CanvasTexture {
  if (!stoneCache) stoneCache = buildStone();
  return stoneCache;
}

export function getWaterTexture(): THREE.CanvasTexture {
  if (!waterCache) waterCache = buildWater();
  return waterCache;
}

export function getLightningTexture(): THREE.CanvasTexture {
  if (!lightningCache) lightningCache = buildLightning();
  return lightningCache;
}
