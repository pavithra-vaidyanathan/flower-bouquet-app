"use client";

import { useEffect, useRef, useState } from "react";

/**
 * BouquetCanvas — packed, wrapped bouquet from chosen flowers.
 * Auto-crops to the flower content (no dead space) and renders transparent.
 *
 * Images: /public/flowers/<name>.png , /public/bouquet/wrap.png
 *
 * ── TUNABLES ──────────────────────────────────────────────────────── */
const CANVAS_W = 800;
const CANVAS_H = 1000;
const WRAP_W = 440;
const BG_COLOR = "";            // "" = transparent (no box). set a hex to fill.

const DOME_RISE = 150;
const DOME_SIDE_DROP = 30;
const DOME_HALF_W = 205;
const OVERFLOW_CEILING = 320;

const STEP_X = 30;
const STEP_Y = 28;
const SCATTER = 130;
const FEATHER = 2.5;

const GLOBAL_FLOWER_SCALE = 1.3;  // bigger blooms
const CROP_PADDING = 24;          // px of breathing room around the auto-crop

const EDGE_ZONE = 0.5;
const EDGE_TUCK = 0.7;

const FLOWER_SIZES: Record<string, number> = {
  peony: 120, dahlia: 118, rose: 110, poppy: 108,
  hydrangea: 104, sunflower: 100, tulip: 86, white_lily: 96,
  iris: 92, cherry_blossom: 78, daisy: 78, lavender: 84,
};
const DEFAULT_SIZE = 100;

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

type Processed = { canvas: HTMLCanvasElement; w: number; h: number };

function processImage(img: HTMLImageElement): Processed {
  const tmp = document.createElement("canvas");
  tmp.width = img.naturalWidth; tmp.height = img.naturalHeight;
  const tctx = tmp.getContext("2d")!;
  tctx.drawImage(img, 0, 0);
  const data = tctx.getImageData(0, 0, tmp.width, tmp.height);
  const px = data.data;
  let minX = tmp.width, minY = tmp.height, maxX = 0, maxY = 0, found = false;
  for (let y = 0; y < tmp.height; y++) {
    for (let x = 0; x < tmp.width; x++) {
      const i = (y * tmp.width + x) * 4;
      const b = px[i] + px[i + 1] + px[i + 2];
      if (b < 80) px[i + 3] = 0;
      else if (px[i + 3] > 30) {
        found = true;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  tctx.putImageData(data, 0, 0);
  if (!found) return { canvas: tmp, w: tmp.width, h: tmp.height };
  const pad = 6;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(tmp.width - 1, maxX + pad); maxY = Math.min(tmp.height - 1, maxY + pad);
  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  const out = document.createElement("canvas");
  out.width = cw; out.height = ch;
  out.getContext("2d")!.drawImage(tmp, minX, minY, cw, ch, 0, 0, cw, ch);
  return { canvas: out, w: cw, h: ch };
}

type WrapGeo = {
  proc: Processed; scaledW: number; scaledH: number;
  rowBounds: Map<number, [number, number]>; maxWidthRow: number; ribbonRow: number;
};

function analyzeWrap(proc: Processed): WrapGeo {
  const scaledW = WRAP_W;
  const scaledH = Math.round(proc.h * (WRAP_W / proc.w));
  const c = document.createElement("canvas");
  c.width = scaledW; c.height = scaledH;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(proc.canvas, 0, 0, scaledW, scaledH);
  const px = ctx.getImageData(0, 0, scaledW, scaledH).data;
  const rowBounds = new Map<number, [number, number]>();
  let maxWidth = 0, maxWidthRow = 0, ribbonTop = -1;
  for (let y = 0; y < scaledH; y++) {
    let l = -1, r = -1, red = false;
    for (let x = 0; x < scaledW; x++) {
      const i = (y * scaledW + x) * 4;
      if (px[i + 3] > 30) {
        if (l === -1) l = x;
        r = x;
        if (px[i] > 120 && px[i + 1] < 85 && px[i + 2] < 85) red = true;
      }
    }
    if (l !== -1) {
      rowBounds.set(y, [l, r]);
      if (r - l > maxWidth) { maxWidth = r - l; maxWidthRow = y; }
    }
    if (red && ribbonTop === -1) ribbonTop = y;
  }
  const ribbonRow = ribbonTop !== -1 ? ribbonTop : Math.round(scaledH * 0.65);
  return { proc, scaledW, scaledH, rowBounds, maxWidthRow, ribbonRow };
}

function fitLine(pts: [number, number][]) {
  const n = pts.length;
  if (n < 2) return { m: 0, b: pts.length ? pts[0][0] : 0 };
  let sy = 0, sx = 0, syy = 0, sxy = 0;
  for (const [x, y] of pts) { sy += y; sx += x; syy += y * y; sxy += x * y; }
  const denom = n * syy - sy * sy || 1;
  const m = (n * sxy - sy * sx) / denom;
  const b = (sx - m * sy) / n;
  return { m, b };
}

export default function BouquetCanvas({
  flowers, seed = 42, className,
}: { flowers: string[]; seed?: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    async function render() {
      setStatus("loading");
      try {
        const chosen = (flowers && flowers.length ? flowers : ["rose"]).filter(Boolean);
        const wrapImg = await loadImage("/bouquet/wrap.png");
        const wrap = analyzeWrap(processImage(wrapImg));

        const uniq = Array.from(new Set(chosen));
        const proc: Record<string, Processed> = {};
        await Promise.all(uniq.map(async (n) => {
          proc[n] = processImage(await loadImage(`/flowers/${n}.png`));
        }));
        if (cancelled) return;

        // draw everything to an OFFSCREEN full canvas, then auto-crop to content
        const full = document.createElement("canvas");
        full.width = CANVAS_W; full.height = CANVAS_H;
        const fctx = full.getContext("2d")!;
        if (BG_COLOR) { fctx.fillStyle = BG_COLOR; fctx.fillRect(0, 0, CANVAS_W, CANVAS_H); }

        const rand = mulberry32(seed);
        const cx = CANVAS_W / 2;
        const wrapX = Math.round((CANVAS_W - wrap.scaledW) / 2);
        const wrapY = CANVAS_H - wrap.scaledH - 10;
        const armTopY = wrapY + wrap.maxWidthRow;
        const ribbonY = wrapY + wrap.ribbonRow;
        const domePeakY = armTopY - DOME_RISE;
        const domeSideY = armTopY - DOME_SIDE_DROP;
        const fillBottom = ribbonY - 5;

        const domeTopAtX = (x: number) => {
          const dx = Math.min(Math.abs(x - cx) / DOME_HALF_W, 1);
          const arch = Math.cos((dx * Math.PI) / 2);
          return domeSideY - (domeSideY - domePeakY) * arch;
        };

        const leftPts: [number, number][] = [];
        const rightPts: [number, number][] = [];
        for (const [row, [l, r]] of Array.from(wrap.rowBounds)) {
          if (row >= wrap.maxWidthRow && row < wrap.ribbonRow) {
            leftPts.push([wrapX + l, wrapY + row]);
            rightPts.push([wrapX + r, wrapY + row]);
          }
        }
        const fitL = fitLine(leftPts);
        const fitR = fitLine(rightPts);
        const armAngleL = (Math.atan2(1, fitL.m) * 180) / Math.PI - 90;
        const armAngleR = (Math.atan2(1, fitR.m) * 180) / Math.PI - 90;

        const boundsAtRow = (y: number): [number, number] => {
          const rw = Math.round(y - wrapY);
          if (y >= armTopY && wrap.rowBounds.has(rw)) {
            const [l, r] = wrap.rowBounds.get(rw)!;
            return [wrapX + l + 12, wrapX + r - 12];
          }
          return [cx - DOME_HALF_W, cx + DOME_HALF_W];
        };

        const pick = () => chosen[Math.floor(rand() * chosen.length)];

        type P = { x: number; y: number; scale: number; name: string; edge: number };
        const places: P[] = [];
        let rowIdx = 0;
        for (let y = domePeakY - 20; y <= fillBottom; y += STEP_Y, rowIdx++) {
          const [xL, xR] = boundsAtRow(y);
          if (xR <= xL) continue;
          const off = rowIdx % 2 ? STEP_X / 2 : 0;
          for (let x = xL + off; x <= xR; x += STEP_X) {
            if (y >= domeTopAtX(x) - 10) {
              const span = Math.max(1, (xR - xL) / 2);
              const edge = Math.max(-1, Math.min(1, (x - (xL + xR) / 2) / span));
              const depth = (y - domePeakY) / Math.max(1, fillBottom - domePeakY);
              places.push({
                x: x + (rand() - 0.5) * 16, y: y + (rand() - 0.5) * 14,
                scale: 0.72 + depth * 0.3, name: pick(), edge,
              });
            }
          }
        }
        for (let k = 0; k < SCATTER; k++) {
          const x = cx + (rand() - 0.5) * 2 * DOME_HALF_W;
          const y = domePeakY + rand() * (fillBottom - domePeakY);
          if (y < domeTopAtX(x)) continue;
          const [xL, xR] = boundsAtRow(y);
          if (x < xL || x > xR) continue;
          const edge = Math.max(-1, Math.min(1, (x - cx) / DOME_HALF_W));
          places.push({ x, y, scale: 0.6 + rand() * 0.25, name: pick(), edge });
        }
        places.sort((a, b) => a.y - b.y);

        const layer = document.createElement("canvas");
        layer.width = CANVAS_W; layer.height = CANVAS_H;
        const lctx = layer.getContext("2d")!;
        for (const p of places) {
          const pr = proc[p.name]; if (!pr) continue;
          const size = Math.max(34, (FLOWER_SIZES[p.name] ?? DEFAULT_SIZE) * p.scale * GLOBAL_FLOWER_SCALE);
          const h = size * (pr.h / pr.w);
          let deg = (rand() - 0.5) * 70;
          if (p.edge < -EDGE_ZONE) deg = armAngleL * EDGE_TUCK + (rand() - 0.5) * 24;
          else if (p.edge > EDGE_ZONE) deg = armAngleR * EDGE_TUCK + (rand() - 0.5) * 24;
          lctx.save();
          lctx.translate(p.x, p.y);
          lctx.rotate((deg * Math.PI) / 180);
          lctx.drawImage(pr.canvas, -size / 2, -h / 2, size, h);
          lctx.restore();
        }

        const mask = document.createElement("canvas");
        mask.width = CANVAS_W; mask.height = CANVAS_H;
        const mctx = mask.getContext("2d")!;
        const overflowTop = armTopY - OVERFLOW_CEILING;
        mctx.fillStyle = "#fff";
        mctx.fillRect(0, 0, CANVAS_W, overflowTop);
        for (let y = overflowTop; y < ribbonY; y++) {
          const rw = y - wrapY;
          let l: number, r: number;
          if (y >= armTopY && wrap.rowBounds.has(rw)) {
            const [ll, rr] = wrap.rowBounds.get(rw)!;
            l = wrapX + ll; r = wrapX + rr;
          } else { l = fitL.m * y + fitL.b; r = fitR.m * y + fitR.b; }
          l = Math.max(0, l); r = Math.min(CANVAS_W, r);
          if (r > l) mctx.fillRect(l, y, r - l, 1);
        }
        mctx.filter = `blur(${FEATHER}px)`;
        mctx.drawImage(mask, 0, 0);
        mctx.filter = "none";

        lctx.globalCompositeOperation = "destination-in";
        lctx.drawImage(mask, 0, 0);
        lctx.globalCompositeOperation = "source-over";

        fctx.drawImage(layer, 0, 0);
        fctx.drawImage(wrap.proc.canvas, wrapX, wrapY, wrap.scaledW, wrap.scaledH);

        // ── AUTO-CROP to content bbox (kills dead space) ──
        const fdata = fctx.getImageData(0, 0, CANVAS_W, CANVAS_H).data;
        let minX = CANVAS_W, minY = CANVAS_H, maxX = 0, maxY = 0, found = false;
        for (let y = 0; y < CANVAS_H; y++) {
          for (let x = 0; x < CANVAS_W; x++) {
            if (fdata[(y * CANVAS_W + x) * 4 + 3] > 12) {
              found = true;
              if (x < minX) minX = x; if (x > maxX) maxX = x;
              if (y < minY) minY = y; if (y > maxY) maxY = y;
            }
          }
        }
        const canvas = canvasRef.current!;
        if (!found) { setStatus("ready"); return; }
        minX = Math.max(0, minX - CROP_PADDING); minY = Math.max(0, minY - CROP_PADDING);
        maxX = Math.min(CANVAS_W - 1, maxX + CROP_PADDING); maxY = Math.min(CANVAS_H - 1, maxY + CROP_PADDING);
        const cw = maxX - minX + 1, ch = maxY - minY + 1;
        canvas.width = cw; canvas.height = ch;
        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, cw, ch);
        if (BG_COLOR) { ctx.fillStyle = BG_COLOR; ctx.fillRect(0, 0, cw, ch); }
        ctx.drawImage(full, minX, minY, cw, ch, 0, 0, cw, ch);

        if (!cancelled) setStatus("ready");
      } catch (e) {
        console.error(e);
        if (!cancelled) setStatus("error");
      }
    }
    render();
    return () => { cancelled = true; };
  }, [flowers, seed]);

  return (
    <div className={className} style={{ position: "relative", width: "100%" }}>
      <canvas ref={canvasRef} style={{
        width: "100%", height: "auto", display: "block",
        opacity: status === "ready" ? 1 : 0, transition: "opacity 600ms ease",
      }} />
      {status === "loading" && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#9b8b80", fontStyle: "italic" }}>
          gathering your flowers…
        </div>
      )}
      {status === "error" && (
        <div style={{ padding: 24, color: "#b06", textAlign: "center" }}>
          Couldn&apos;t load the flower images. Check /public/flowers/ and /public/bouquet/wrap.png.
        </div>
      )}
    </div>
  );
}
