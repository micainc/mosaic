import React, { useEffect, useState } from 'react';
import { rdxo } from '../../redux/store';
import { UNIT_IN_UM, type DisplayUnit } from '../../redux/canvasSlice';
import './ScaleBar.css';

export type ScaleBarProps = {
  /** Screen (CSS) pixels per image pixel: how large one image pixel is drawn. 1 = native size. */
  scale: number;
  /** Longest the bar may be, in screen pixels. The bar picks the largest round length that fits. */
  maxLength?: number;
  orientation?: 'horizontal' | 'vertical';
  /** Which side of the line the label sits on. Defaults to top (horizontal) or right (vertical). */
  labelPosition?: 'top' | 'bottom' | 'left' | 'right';
  /** Line thickness in screen pixels. */
  thickness?: number;
  /** Overrides the calibration from the store. */
  pixelSize?: number | null;
  /** Overrides the unit from the store. px and % fall back to labelling in image pixels. */
  unit?: DisplayUnit;
  className?: string;
  style?: React.CSSProperties;
};

/** Largest of 1, 2, 5 × 10^k that is ≤ max. Null when max is not positive. */
export function niceLength(max: number): number | null {
  if (!(max > 0)) return null;
  const base = 10 ** Math.floor(Math.log10(max));
  for (const m of [5, 2, 1]) {
    if (m * base <= max) return m * base;
  }
  return base;
}

/** Trim float noise: 0.30000000000000004 → "0.3", 200 → "200". */
const fmtNice = (v: number) => String(Number(v.toPrecision(6)));

/**
 * A scale bar that sizes itself to a round physical length. Give it the
 * rendered scale of the image it sits beside and it works out the rest.
 * Colour is inherited via `currentColor`, so set `color` on it or a parent.
 */
export const ScaleBar: React.FC<ScaleBarProps> = ({
  scale,
  maxLength = 100,
  orientation = 'horizontal',
  labelPosition,
  thickness = 3,
  pixelSize: pixelSizeProp,
  unit: unitProp,
  className = '',
  style,
}) => {
  const storePixelSize = rdxo(s => s.canvas.pixelSize);
  const storeUnit = rdxo(s => s.canvas.displayUnit);
  const pixelSize = pixelSizeProp !== undefined ? pixelSizeProp : storePixelSize;
  const unit = unitProp ?? storeUnit;

  // Label in physical units when calibrated, otherwise in image pixels.
  const physical = unit !== 'px' && unit !== '%' && pixelSize !== null && pixelSize > 0;
  const labelUnit: DisplayUnit = physical ? unit : 'px';
  const unitsPerImagePx = physical ? pixelSize / UNIT_IN_UM[unit as keyof typeof UNIT_IN_UM] : 1;
  const screenPxPerUnit = scale / unitsPerImagePx;

  const length = niceLength(maxLength / screenPxPerUnit);
  if (length === null || !(scale > 0)) return null;
  const barPx = length * screenPxPerUnit;

  const pos = labelPosition ?? (orientation === 'horizontal' ? 'top' : 'right');
  const lineStyle = orientation === 'horizontal'
    ? { width: barPx, height: thickness }
    : { width: thickness, height: barPx };

  return (
    <div className={`scale-bar ${orientation} label-${pos} ${className}`} style={style}>
      <span className="scale-bar-label">{fmtNice(length)} {labelUnit}</span>
      <div className="scale-bar-line" style={lineStyle} />
    </div>
  );
};

/**
 * Screen pixels per natural pixel for an <img> drawn with object-fit contain or
 * scale-down. Re-measures on load and on resize. Returns 0 until measurable.
 */
export function useImageScale(ref: React.RefObject<HTMLImageElement | null>, fit: 'contain' | 'scale-down' = 'scale-down'): number {
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const img = ref.current;
    if (!img) return;

    const measure = () => {
      if (!img.naturalWidth || !img.naturalHeight) return setScale(0);
      let s = Math.min(img.clientWidth / img.naturalWidth, img.clientHeight / img.naturalHeight);
      if (fit === 'scale-down') s = Math.min(s, 1);
      setScale(s);
    };

    measure();
    img.addEventListener('load', measure);
    const ro = new ResizeObserver(measure);
    ro.observe(img);
    return () => {
      img.removeEventListener('load', measure);
      ro.disconnect();
    };
  }, [ref, fit]);

  return scale;
}
