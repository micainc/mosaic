import { UNIT_IN_UM, type DisplayUnit } from '../../redux/stageSlice';

/**
 * Convert a pixel length to the display unit. `total` is the canvas extent along
 * the same axis, used only for %. Null when uncalibrated or unit is px.
 */
export const toUnit = (px: number, total: number, pixelSize: number | null, unit: DisplayUnit): number | null => {
    if (unit === 'px') return null;
    if (unit === '%') return total > 0 ? (100 * px) / total : 0;
    if (pixelSize === null) return null;
    return (px * pixelSize) / UNIT_IN_UM[unit];
};

/** Fewer decimals as the magnitude grows. */
export const fmt = (v: number): string => {
    const a = Math.abs(v);
    if (a >= 100) return v.toFixed(0);
    if (a >= 10) return v.toFixed(1);
    if (a >= 1) return v.toFixed(2);
    return v.toPrecision(3);
};

/** A pixel length as display text with its unit, falling back to px when uncalibrated. */
export const formatLength = (px: number, total: number, pixelSize: number | null, unit: DisplayUnit): string => {
    const v = toUnit(px, total, pixelSize, unit);
    return v === null ? `${fmt(px)} px` : `${fmt(v)} ${unit}`;
};
