import React, { useCallback, useEffect, useRef } from 'react';
import { rdxo } from '../../redux/store';
import { UNIT_IN_UM, type DisplayUnit } from '../../redux/canvasSlice';
import { canvasRegistry } from '../../canvasRegistry';
import './Rulers.css';

/** Ruler thickness in CSS px. Keep in sync with --ruler-size in Rulers.css. */
export const RULER_SIZE = 24;
/** Minimum screen distance between labelled ticks. */
const MIN_LABEL_PX = 60;

const FONT = '8px Geist Mono';
const INK = '#C0C0C0';
const CURSOR = '#FFFFFF';

/** Smallest of 1, 2, 5 × 10^k whose screen length is at least MIN_LABEL_PX. */
function tickSteps(screenPxPerUnit: number): { major: number; minor: number } {
  const minUnits = MIN_LABEL_PX / screenPxPerUnit;
  const base = 10 ** Math.floor(Math.log10(minUnits));
  for (const m of [1, 2, 5]) {
    if (m * base >= minUnits) return { major: m * base, minor: m === 2 ? base / 2 : (m * base) / 5 };
  }
  return { major: 10 * base, minor: 2 * base };
}

const fmt = (v: number) => String(Number(v.toPrecision(6)));

type Axis = {
  ruler: HTMLCanvasElement;
  /** Screen position and size of the draw canvas along this axis. */
  start: number;
  size: number;
  /** Image pixels along this axis. */
  imagePx: number;
  unitsPerImagePx: number;
  cursorImagePx: number;
  vertical: boolean;
};

function drawAxis({ ruler, start, size, imagePx, unitsPerImagePx, cursorImagePx, vertical }: Axis) {
  const dpr = window.devicePixelRatio || 1;
  const len = vertical ? ruler.clientHeight : ruler.clientWidth;
  const thick = RULER_SIZE;
  if (len === 0 || size === 0 || imagePx === 0) return;

  const w = vertical ? thick : len;
  const h = vertical ? len : thick;
  if (ruler.width !== w * dpr || ruler.height !== h * dpr) {
    ruler.width = w * dpr;
    ruler.height = h * dpr;
  }
  const ctx = ruler.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const rulerStart = vertical ? ruler.getBoundingClientRect().top : ruler.getBoundingClientRect().left;
  const screenPxPerImagePx = size / imagePx;
  const screenPxPerUnit = screenPxPerImagePx / unitsPerImagePx;
  const toLocal = (units: number) => start + (units / unitsPerImagePx) * screenPxPerImagePx - rulerStart;
  const toUnits = (local: number) => ((local + rulerStart - start) / screenPxPerImagePx) * unitsPerImagePx;

  const { major, minor } = tickSteps(screenPxPerUnit);
  const perMajor = Math.round(major / minor);
  const j0 = Math.floor(toUnits(0) / minor);
  const j1 = Math.ceil(toUnits(len) / minor);

  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = 1;
  ctx.font = FONT;
  ctx.textBaseline = 'top';

  ctx.beginPath();
  for (let j = j0; j <= j1; j++) {
    const units = j * minor;
    const p = Math.round(toLocal(units)) + 0.5;
    const isMajor = j % perMajor === 0;
    const tick = isMajor ? thick * 0.5 : thick * 0.25;
    if (vertical) {
      ctx.moveTo(thick, p);
      ctx.lineTo(thick - tick, p);
    } else {
      ctx.moveTo(p, thick);
      ctx.lineTo(p, thick - tick);
    }
    if (isMajor) {
      const label = fmt(units);
      if (vertical) {
        ctx.save();
        ctx.translate(4, p - 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(label, 0, 0);
        ctx.restore();
      } else {
        ctx.fillText(label, p + 2, 4);
      }
    }
  }
  ctx.stroke();

  // Cursor marker.
  const c = Math.round(start + cursorImagePx * screenPxPerImagePx - rulerStart) + 0.5;
  ctx.strokeStyle = CURSOR;
  ctx.beginPath();
  if (vertical) { ctx.moveTo(0, c); ctx.lineTo(thick, c); }
  else { ctx.moveTo(c, 0); ctx.lineTo(c, thick); }
  ctx.stroke();
}

/**
 * Permanent rulers along the top (below the toolbar) and left edges of the
 * viewport, tracking the draw canvas through scroll and zoom. Labelled in the
 * store's display unit: physical units when calibrated, % of the image, or px.
 */
export const Rulers: React.FC = () => {
  const topRef = useRef<HTMLCanvasElement>(null);
  const leftRef = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);

  const pixelSize = rdxo(s => s.canvas.pixelSize);
  const unit = rdxo(s => s.canvas.displayUnit);
  const cursorX = rdxo(s => s.canvas.cursorX);
  const cursorY = rdxo(s => s.canvas.cursorY);
  const scale = rdxo(s => s.canvas.scale);
  const canvasWidth = rdxo(s => s.canvas.canvasWidth);
  const canvasHeight = rdxo(s => s.canvas.canvasHeight);

  const physical = unit !== 'px' && unit !== '%' && pixelSize !== null && pixelSize > 0;
  const labelUnit: DisplayUnit = physical ? unit : unit === '%' ? '%' : 'px';

  const draw = useCallback(() => {
    const canvas = canvasRegistry.draw ?? document.querySelector<HTMLCanvasElement>('#draw-canvas');
    const top = topRef.current;
    const left = leftRef.current;
    if (!canvas || !top || !left) return;

    const rect = canvas.getBoundingClientRect();
    const imageW = canvas.width || canvasWidth;
    const imageH = canvas.height || canvasHeight;
    const unitsPer = (axisPx: number) =>
      physical ? pixelSize! / UNIT_IN_UM[unit as keyof typeof UNIT_IN_UM]
      : unit === '%' ? 100 / axisPx
      : 1;

    drawAxis({ ruler: top, start: rect.left, size: rect.width, imagePx: imageW, unitsPerImagePx: unitsPer(imageW), cursorImagePx: cursorX, vertical: false });
    drawAxis({ ruler: left, start: rect.top, size: rect.height, imagePx: imageH, unitsPerImagePx: unitsPer(imageH), cursorImagePx: cursorY, vertical: true });
  }, [physical, pixelSize, unit, cursorX, cursorY, canvasWidth, canvasHeight, scale]);

  // Redraw on any store change that affects the rulers.
  useEffect(() => { draw(); }, [draw]);

  // Redraw on scroll, resize, and zoom (the draw canvas changes CSS size).
  useEffect(() => {
    const schedule = () => {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(draw);
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const canvas = canvasRegistry.draw ?? document.querySelector<HTMLCanvasElement>('#draw-canvas');
    const ro = canvas ? new ResizeObserver(schedule) : null;
    if (canvas) ro!.observe(canvas);
    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      ro?.disconnect();
    };
  }, [draw]);

  return (
    <>
      <div className="ruler-corner">{labelUnit}</div>
      <canvas ref={topRef} className="ruler ruler-top" />
      <canvas ref={leftRef} className="ruler ruler-left" />
    </>
  );
};

export default Rulers;
