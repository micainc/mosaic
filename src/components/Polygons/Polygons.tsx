import React from 'react';
import { useAppSelector } from '../../redux/store';
import { selectOnly, toggleSelected } from '../../redux/polygonsSlice';
import { useDispatch } from 'react-redux';
import type { PointType } from '../../types';
import Polygon from './Polygon';

/**
 * Declarative overlay for COMMITTED polygons (persist-as-vectors).
 *
 * Lives in canvas/content space: an absolutely-positioned <svg> with a
 * viewBox in intrinsic canvas pixels, so stored points render 1:1 with the
 * image and scroll/zoom with it — no scroll or scale math (unlike the
 * fixed #svg-canvas used for the in-progress pen handles).
 *
 * The in-progress pen polygon still lives in Stage's imperative SVG; this
 * only draws polygons already in the store. Per-shape rendering and editing
 * live in Polygon.tsx; this owns the shared viewBox, the coordinate mapping,
 * and the handle-size unit that every child needs.
 */
const Polygons: React.FC = () => {
  const dispatch = useDispatch();
  const polygons = useAppSelector(s => s.polygons.polygons);
  const selected = useAppSelector(s => s.polygons.selected);
  const width = useAppSelector(s => s.canvas.canvasWidth);
  const height = useAppSelector(s => s.canvas.canvasHeight);
  const scale = useAppSelector(s => s.canvas.scale);
  const interactionMode = useAppSelector(s => s.canvas.interactionMode);

  const svgRef = React.useRef<SVGSVGElement>(null);

  // Only intercept clicks in 'select' mode, so drawing/pen/fill pass through.
  const clickable = interactionMode === 'select';
  const selectedSet = React.useMemo(() => new Set(selected), [selected]);

  /**
   * viewBox units per screen pixel. Handles are specified in screen px but drawn
   * in viewBox space, so they'd balloon with zoom without this correction.
   * Read off the live CTM rather than derived from `scale`, since the mapping
   * also depends on the container width.
   */
  const [unit, setUnit] = React.useState(1);
  React.useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const measure = () => {
      const ctm = svg.getScreenCTM();
      if (ctm && ctm.a) setUnit(1 / ctm.a);
    };
    measure();
    // Catches zoomAround rewriting the inline width, plus window resizes.
    const ro = new ResizeObserver(measure);
    ro.observe(svg);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [width, height, scale]);

  /** Viewport → viewBox. getScreenCTM already folds in scroll, zoom and layout. */
  const toLocal = React.useCallback((clientX: number, clientY: number): PointType => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: Math.round(p.x), y: Math.round(p.y) };
  }, []);

  const handleSelect = React.useCallback((id: string, additive: boolean) => {
    dispatch(additive ? toggleSelected(id) : selectOnly(id));
  }, [dispatch]);

  // Always mounted (even with zero polygons) so zoomAround's `.mosaic-canvas`
  // sweep keeps its inline width in sync — a late mount would miss past zooms.
  // No width/height attrs: .mosaic-canvas sets width (and zoomAround rewrites it on
  // wheel), so height must stay auto or the viewBox letterboxes out of alignment.
  return (
    <svg
      ref={svgRef}
      className="mosaic-canvas"
      id="polygon-overlay"
      viewBox={`0 0 ${width} ${height}`}
      style={{ zIndex: 3, height: 'auto', pointerEvents: 'none' }}
    >
      {polygons.map(poly => {
        const isSelected = selectedSet.has(poly.id);
        return (
          <Polygon
            key={poly.id}
            polygon={poly}
            selected={true}
            editable={clickable && isSelected}
            clickable={clickable}
            unit={unit}
            toLocal={toLocal}
            onSelect={handleSelect}
          />
        );
      })}
    </svg>
  );
};

export default Polygons;
