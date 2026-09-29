import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLabels, usePolygons, useStage, polygons } from '../../redux/store';
import { PointType } from '../../types';
import Polygon from './Polygon';


const Polygons: React.FC = () => {
  const allPolygons = usePolygons.polygons();
  const selected = usePolygons.selectedIds();
  const scale = useStage.scale(); 
  const width = useStage.canvasWidth(); 
  const height= useStage.canvasHeight();
  const mode= useStage.mode();


  const activeLabel = useLabels.activeLabel();
  const isDragging = useRef(false);
  const isLeftClicking = useRef(false);

  /** Points of the polygon currently being drawn (selected[0] in pen mode). */
  const draftPoints = useCallback(
    () => [...(allPolygons.find(p => p.id === selected[0])?.points ?? [])],
    [allPolygons, selected],
  );

  const svgRef = React.useRef<SVGSVGElement>(null);

  // Only intercept clicks in 'select' mode, so drawing/pen/fill pass through.
  const clickable = mode === 'select';
  const selectedSet = React.useMemo(() => new Set(selected), [selected]);


useEffect(() => {
  if(mode === 'pen') {
    // console.log("FLAG 2")
    polygons.addPolygon({
      name: '',
      pixels: 0,
      id: crypto.randomUUID(),
      label: activeLabel.name,
      colour: activeLabel.colour,
      points: [],
    });
  } else {
      polygons.clearSelection();
  }

}, [mode])

 
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
    if (additive) polygons.toggleSelected(id);
    else polygons.selectOnly(id);
  }, []);


  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (mode === 'pen' && selected[0]) {
      if (e.button === 0) { // left click
        isLeftClicking.current = true;
        e.preventDefault();
        e.stopPropagation();
        const { x, y } = toLocal(e.clientX, e.clientY);
        polygons.updatePolygon({ id: selected[0], points: [...draftPoints(), { x, y }] });
      } else if (e.button === 2) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }, [draftPoints, selected, mode, toLocal]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (mode === 'pen' && selected[0] && isLeftClicking.current) {
      const pts = draftPoints();
      const p0 = pts[0];
      const p1 = toLocal(e.clientX, e.clientY);
      const rect = [p0, { x: p0.x, y: p1.y }, p1, { x: p1.x, y: p0.y }];

      if (pts.length === 1) {
        // Left click + drag from a single point => rectangle.
        isDragging.current = true;
        e.preventDefault();
        e.stopPropagation();
        polygons.updatePolygon({ id: selected[0], points: rect });
      } else if (isDragging.current) {
        polygons.updatePolygon({ id: selected[0], points: rect });
      }
    }
  }, [draftPoints, selected, mode, toLocal]);

  return (
    <svg
      ref={svgRef}
      className="mosaic-canvas"
      id="polygon-overlay"
      viewBox={`0 0 ${width} ${height}`}
      style={{ zIndex: 2, height: 'auto', pointerEvents: mode === 'pen' ? 'all' : 'none'}}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={() => {
        isLeftClicking.current = false;
        isDragging.current= false
      }}
    >

      {allPolygons.map(poly => {
        const isSelected = selectedSet.has(poly.id);
        return (
          <Polygon
            key={poly.id}
            polygon={poly}
            selected={isSelected}
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
