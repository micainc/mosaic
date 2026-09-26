import type { PointType } from '../../types';
import { canvasRegistry } from '../../canvasRegistry';
import { hexToRGB, rgbToHex } from '../../utils/rgbUtils';
import { downloadDataUrl } from '../../utils/fileUtils';

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export type ScaleCorner = 'tl' | 'tr' | 'bl' | 'br';

/** Axis-aligned bounding box of a point set. Empty input yields a zero box. */
export function getBounds(points: PointType[]): Bounds {
  if (!points.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Shortest distance from (px,py) to the SEGMENT (x1,y1)–(x2,y2).
 * Clamps the projection parameter to [0,1] so endpoints win outside the span —
 * distance to the infinite line would report false hits past a segment's end.
 */
export function pointToSegmentDistance(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number,
): number {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  const lenSq = C * C + D * D;
  let param = -1;
  if (lenSq !== 0) param = (A * C + B * D) / lenSq;

  let xx: number, yy: number;
  if (param < 0) { xx = x1; yy = y1; }
  else if (param > 1) { xx = x2; yy = y2; }
  else { xx = x1 + param * C; yy = y1 + param * D; }

  const dx = px - xx;
  const dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Index at which to splice a new vertex for a click near an edge, or -1 if the
 * click isn't within `threshold` of any edge. Wraps the closing edge, so
 * clicking between the last and first vertex appends.
 */
export function getInsertIndex(points: PointType[], p: PointType, threshold: number): number {
  if (points.length < 2) return -1;
  let minDistance = Infinity;
  let insertIndex = -1;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const d = pointToSegmentDistance(p.x, p.y, p1.x, p1.y, p2.x, p2.y);
    if (d < threshold && d < minDistance) {
      minDistance = d;
      insertIndex = i + 1;
    }
  }
  return insertIndex;
}

/** Index of the first vertex within `threshold` of p, else -1. */
export function getVertexAt(points: PointType[], p: PointType, threshold: number): number {
  for (let i = 0; i < points.length; i++) {
    const dx = points[i].x - p.x;
    const dy = points[i].y - p.y;
    if (Math.sqrt(dx * dx + dy * dy) <= threshold) return i;
  }
  return -1;
}

/**
 * Uniform scale about the corner opposite the one being dragged.
 * Mirrors Stage's performPenShapeTransform: the smaller of the two axis ratios
 * wins so the shape never skews, floored at 0.1 so it can't collapse or invert.
 */
export function scalePoints(origin: PointType[], corner: ScaleCorner, cursor: PointType): PointType[] {
  const { minX, minY, maxX, maxY } = getBounds(origin);
  const w = maxX - minX;
  const h = maxY - minY;
  if (w === 0 || h === 0) return origin;

  let scaleX = 1, scaleY = 1, anchorX = minX, anchorY = minY;
  switch (corner) {
    case 'tl': scaleX = (maxX - cursor.x) / w; scaleY = (maxY - cursor.y) / h; anchorX = maxX; anchorY = maxY; break;
    case 'tr': scaleX = (cursor.x - minX) / w; scaleY = (maxY - cursor.y) / h; anchorX = minX; anchorY = maxY; break;
    case 'bl': scaleX = (maxX - cursor.x) / w; scaleY = (cursor.y - minY) / h; anchorX = maxX; anchorY = minY; break;
    case 'br': scaleX = (cursor.x - minX) / w; scaleY = (cursor.y - minY) / h; anchorX = minX; anchorY = minY; break;
  }
  const s = Math.max(0.1, Math.min(scaleX, scaleY));

  return origin.map(p => ({
    x: Math.round(anchorX + (p.x - anchorX) * s),
    y: Math.round(anchorY + (p.y - anchorY) * s),
  }));
}

/** Rotate about the bounding-box centre by the angle swept from `start` to `cursor`. */
export function rotatePoints(origin: PointType[], start: PointType, cursor: PointType): PointType[] {
  const { minX, minY, maxX, maxY } = getBounds(origin);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const delta = Math.atan2(cursor.y - cy, cursor.x - cx) - Math.atan2(start.y - cy, start.x - cx);
  const cos = Math.cos(delta);
  const sin = Math.sin(delta);

  return origin.map(p => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    return {
      x: Math.round(cx + dx * cos - dy * sin),
      y: Math.round(cy + dx * sin + dy * cos),
    };
  });
}

/** Translate every point by a delta. */
export function translatePoints(origin: PointType[], dx: number, dy: number): PointType[] {
  return origin.map(p => ({ x: Math.round(p.x + dx), y: Math.round(p.y + dy) }));
}

/**
 * Burn a polygon into the draw canvas as flat, un-blended pixels.
 *
 * Ported from Stage's rasterizePenShape, with the ref plumbing replaced by
 * canvasRegistry so it can run from anywhere — a toolbar action, a batch over
 * the current selection, an export routine — rather than only from inside Stage.
 *
 * Returns false without touching anything if the canvas isn't mounted yet or
 * the shape isn't a fillable polygon.
 */
export function rasterizePolygon(points: PointType[], colour: string): boolean {
  const canvas = canvasRegistry.draw;
  const ctx = canvasRegistry.drawCtx;
  if (!canvas || !ctx || points.length < 3) return false;

  const rgb = hexToRGB(colour);
  if (!rgb) return false;

  canvasRegistry.saveState?.();

  const offCanvas = new OffscreenCanvas(canvas.width, canvas.height);
  const offCtx = offCanvas.getContext('2d')!;
  offCtx.imageSmoothingEnabled = false;
  offCtx.fillStyle = colour;
  offCtx.beginPath();
  offCtx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) offCtx.lineTo(points[i].x, points[i].y);
  offCtx.closePath();
  offCtx.fill();

  // fill() anti-aliases the boundary, producing blended colours that belong to
  // no label. Snap every touched pixel to exactly the requested colour at full
  // alpha, or the colour→label map breaks along every polygon edge.
  const imageData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) {
      data[i] = rgb.r;
      data[i + 1] = rgb.g;
      data[i + 2] = rgb.b;
      data[i + 3] = 255;
    }
  }
  offCtx.putImageData(imageData, 0, 0);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(offCanvas, 0, 0);
  canvasRegistry.reapplyAnchoredMask?.();
  return true;
}


  // --- erasePenShape ---
  export function erasePolygon(points: PointType[]) {
    const canvas = canvasRegistry.draw;
    const ctx = canvasRegistry.drawCtx;
    if (!canvas || !ctx || points.length < 3) return false;

    canvasRegistry.saveState?.();

    const offCanvas = new OffscreenCanvas(canvas.width, canvas.height);
    const offCtx = offCanvas.getContext('2d')!;
    offCtx.imageSmoothingEnabled = false;
    offCtx.fillStyle = '#000000';
    offCtx.beginPath();
    offCtx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) offCtx.lineTo(points[i].x, points[i].y);
    offCtx.closePath();
    offCtx.fill();

    const maskData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height).data;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      if (maskData[i + 3] > 0) {
        data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 0;
      }
    }
    ctx.putImageData(imageData, 0, 0);
    canvasRegistry.reapplyAnchoredMask?.();
    return true;
  };

export type PolygonStats = {
  /** Pixels inside the polygon. */
  total: number;
  /** Inside pixels with no class painted (alpha 0). */
  unclassified: number;
  /** Painted inside pixels, keyed by hex colour. */
  counts: Record<string, number>;
};

/**
 * Count the class colour of every draw-canvas pixel under a polygon.
 * Rasterizes the polygon to an offscreen mask, then tallies the draw canvas
 * where the mask is set. Returns null if the canvas isn't mounted.
 */
export function polygonStats(points: PointType[]): PolygonStats | null {
  const canvas = canvasRegistry.draw;
  const ctx = canvasRegistry.drawCtx;
  if (!canvas || !ctx || points.length < 3) return null;

  const { minX, minY, maxX, maxY } = getBounds(points);
  const x0 = Math.max(0, Math.floor(minX));
  const y0 = Math.max(0, Math.floor(minY));
  const w = Math.min(canvas.width, Math.ceil(maxX) + 1) - x0;
  const h = Math.min(canvas.height, Math.ceil(maxY) + 1) - y0;
  if (w <= 0 || h <= 0) return { total: 0, unclassified: 0, counts: {} };

  // Mask only the bounding box — no need to scan the whole canvas.
  const off = new OffscreenCanvas(w, h);
  const offCtx = off.getContext('2d')!;
  offCtx.imageSmoothingEnabled = false;
  offCtx.fillStyle = '#000';
  offCtx.beginPath();
  offCtx.moveTo(points[0].x - x0, points[0].y - y0);
  for (let i = 1; i < points.length; i++) offCtx.lineTo(points[i].x - x0, points[i].y - y0);
  offCtx.closePath();
  offCtx.fill();

  const mask = offCtx.getImageData(0, 0, w, h).data;
  const px = ctx.getImageData(x0, y0, w, h).data;

  const counts: Record<string, number> = {};
  let total = 0;
  let unclassified = 0;
  for (let i = 0; i < mask.length; i += 4) {
    if (mask[i + 3] === 0) continue;
    total++;
    if (px[i + 3] === 0) { unclassified++; continue; }
    const hex = rgbToHex(px[i], px[i + 1], px[i + 2]);
    counts[hex] = (counts[hex] ?? 0) + 1;
  }
  return { total, unclassified, counts };
}

// ──────────────────── Export ────────────────────

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Crop `source` to the polygon's bounding box and clip to its outline; outside
 * pixels come out transparent. `scale` maps canvas pixels to source pixels for
 * layers whose resolution differs from the draw canvas.
 */
export function clipToPolygon(source: CanvasImageSource, points: PointType[], scale = 1): string {
  const { minX, minY, maxX, maxY } = getBounds(points);
  const x0 = Math.floor(minX * scale);
  const y0 = Math.floor(minY * scale);
  const w = Math.max(1, Math.ceil(maxX * scale) - x0 + 1);
  const h = Math.max(1, Math.ceil(maxY * scale) - y0 + 1);

  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.beginPath();
  points.forEach((p, i) => {
    const x = p.x * scale - x0;
    const y = p.y * scale - y0;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(source, -x0, -y0);
  return c.toDataURL('image/png');
}

type ExportLayer = { src: string; width: number; type: string };

/**
 * Download the polygon's crop of the segmentation map and of every image
 * layer as separate PNGs, named `<name>_<layer>.png`. Downloads are spaced
 * out slightly so the browser doesn't drop the later ones.
 */
export async function exportPolygonImages(
  points: PointType[],
  name: string,
  layers: Record<string, ExportLayer>,
  canvasWidth: number,
): Promise<void> {
  if (points.length < 3) return;
  const safe = name.replace(/[^\w.-]+/g, '_') || 'polygon';
  const files: { filename: string; dataUrl: string }[] = [];

  if (canvasRegistry.draw) {
    files.push({ filename: `${safe}_segmentation.png`, dataUrl: clipToPolygon(canvasRegistry.draw, points) });
  }
  for (const [layerName, l] of Object.entries(layers)) {
    try {
      const img = await loadImage(l.src);
      const scale = canvasWidth ? l.width / canvasWidth : 1;
      files.push({ filename: `${safe}_${l.type || layerName}.png`, dataUrl: clipToPolygon(img, points, scale) });
    } catch { /* skip layers that fail to load */ }
  }

  for (const [i, f] of files.entries()) {
    setTimeout(() => downloadDataUrl(f.dataUrl, f.filename), i * 200);
  }
}
