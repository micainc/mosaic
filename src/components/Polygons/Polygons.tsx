import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAppSelector } from '../../redux/store';
import { useDispatch } from 'react-redux';
import { usePolygons } from './usePolygons';
import { PolygonType, PointType } from '../../types';
import Polygon from './Polygon';

const Polygons: React.FC = () => {
  const dispatch = useDispatch();
  const { polygons, selected, addPolygon, updatePolygon, getPolygonById, deselectAllPolygons, toggleSelectedPolygon, onlySelectPolygon} = usePolygons();
  const width = useAppSelector(s => s.canvas.canvasWidth);
  const height = useAppSelector(s => s.canvas.canvasHeight);
  const scale = useAppSelector(s => s.canvas.scale);
  const activeLabel = useAppSelector((s) => s.labels.activeLabel);

  // const [draft, setDraft] = useState<string>();

  const interactionMode = useAppSelector(s => s.canvas.interactionMode);

  const svgRef = React.useRef<SVGSVGElement>(null);

  // Only intercept clicks in 'select' mode, so drawing/pen/fill pass through.
  const clickable = interactionMode === 'select';
  const selectedSet = React.useMemo(() => new Set(selected), [selected]);


useEffect(() => {
  if(interactionMode === 'pen') {
    // console.log("FLAG 2")
    addPolygon({
      id:  crypto.randomUUID(),
      label: activeLabel.label,
      colour: activeLabel.colour,
      points: [],
    })
  } else {
      console.log("FLAG 3")
      deselectAllPolygons();
  }

}, [interactionMode])

 
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
    if(additive) toggleSelectedPolygon(id) 
    else onlySelectPolygon(id);
  }, [dispatch]);


    const handleMouseDown = useCallback((e: React.MouseEvent) => {
      if (interactionMode === 'pen' && selected[0]) {
        const pts = [...(getPolygonById(selected[0])?.points ?? [])]
        if (e.button === 0) { // left click

          e.preventDefault();
          e.stopPropagation();
          const {x, y} = toLocal(e.clientX, e.clientY)
                  console.log("FLAG XY:", x + ", "+ y)

          updatePolygon(selected[0], {points:[...pts, {x, y}]})

        } else if(e.button === 2){
          e.preventDefault();
          e.stopPropagation();
        }
      }
    }, [polygons, selected, interactionMode, activeLabel]);

  return (
    <svg
      ref={svgRef}
      className="mosaic-canvas"
      id="polygon-overlay"
      viewBox={`0 0 ${width} ${height}`}
      style={{ zIndex: 2, height: 'auto', pointerEvents: interactionMode === 'pen' ? 'all' : 'none', cursor:'crosshair'}}
      onMouseDown={(e) => handleMouseDown(e)}
    >

      {polygons.map(poly => {
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
