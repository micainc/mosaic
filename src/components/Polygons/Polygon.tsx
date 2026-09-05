import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { updatePolygon } from '../../redux/polygonsSlice';
import type { PointType, PolygonType } from '../../types';
import {
  getBounds,
  getInsertIndex,
  rotatePoints,
  scalePoints,
  translatePoints,
  type ScaleCorner,
} from './utils';

// Screen-pixel sizes, matched to Stage's in-progress pen handles so a committed
// polygon looks and behaves like the one you just drew.
const HANDLE_SIZE = 6;
const VERTEX_RADIUS = 4;
const EDGE_HIT_WIDTH = 10;
const MIN_VERTICES = 3;

/** An in-flight drag. `origin` is the point set as it stood when the drag began. */
type Gesture =
  | { kind: 'vertex'; index: number }
  | { kind: 'scale'; corner: ScaleCorner; origin: PointType[] }
  | { kind: 'rotate'; origin: PointType[]; start: PointType }
  | { kind: 'move'; origin: PointType[]; start: PointType };

export interface PolygonProps {
  polygon: PolygonType;
  selected: boolean;
  /** Handles are live: the tool is 'select' AND this polygon is selected. */
  editable: boolean;
  /** Fill accepts clicks (selection) even when not editable. */
  clickable: boolean;
  /** viewBox units per screen pixel — keeps handles a constant on-screen size at any zoom. */
  unit: number;
  /** Maps a viewport coordinate into the overlay's viewBox space. */
  toLocal: (clientX: number, clientY: number) => PointType;
  onSelect: (id: string, additive: boolean) => void;
}

/**
 * One committed polygon, with the pen tool's full editing vocabulary:
 * drag/insert/delete vertices, uniform corner scale, rotate, and body move.
 *
 * Unlike Stage's pen — which builds DOM nodes by hand and converts every
 * coordinate through canvasScale and scroll offsets — this renders declaratively
 * inside the overlay's viewBox, so stored points map 1:1 and only handle SIZES
 * need the `unit` correction.
 *
 * Live drags are held in local `draft` state and written to Redux once on
 * pointerup. Dispatching per mousemove would put a store write and a full
 * overlay re-render on every frame of a drag.
 */
const Polygon: React.FC<PolygonProps> = ({
  polygon, selected, editable, clickable, unit, toLocal, onSelect,
}) => {
  const dispatch = useDispatch();
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [draft, setDraft] = useState<PointType[] | null>(null);

  // Mirrored so the gesture effect's pointerup can read the final draft without
  // re-subscribing on every mousemove.
  const draftRef = useRef<PointType[] | null>(null);
  useEffect(() => { draftRef.current = draft; }, [draft]);

  const points = draft ?? polygon.points;
  const { minX, minY, maxX, maxY } = getBounds(points);
  const centerX = (minX + maxX)/2;
  const centerY = (minY + maxY)/2;

  const commit = useCallback((next: PointType[]) => {
    dispatch(updatePolygon({ id: polygon.id, points: next }));
  }, [dispatch, polygon.id]);

  // ─── Drag loop: bound to the window so the pointer can leave the shape ───
  useEffect(() => {
    if (!gesture) return;

    const onMove = (e: PointerEvent) => {
      const p = toLocal(e.clientX, e.clientY);
      switch (gesture.kind) {
        case 'vertex':
          setDraft(prev => {
            const next = [...(prev ?? polygon.points)];
            next[gesture.index] = p;
            return next;
          });
          break;
        case 'scale':
          setDraft(scalePoints(gesture.origin, gesture.corner, p));
          break;
        case 'rotate':
          setDraft(rotatePoints(gesture.origin, gesture.start, p));
          break;
        case 'move':
          setDraft(translatePoints(gesture.origin, p.x - gesture.start.x, p.y - gesture.start.y));
          break;
      }
    };

    const onUp = () => {
      if (draftRef.current) commit(draftRef.current);
      setDraft(null);
      setGesture(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [gesture, toLocal, commit, polygon.points]);

  // ─── Handlers ───

  const onFillPointerDown = (e: React.PointerEvent) => {
    if (!clickable || e.button !== 0) return;
    e.stopPropagation();
    const additive = e.metaKey || e.ctrlKey || e.shiftKey;
    onSelect(polygon.id, additive);
    // Only an already-selected polygon moves, so the first click just selects.
    if (editable && !additive) {
      setGesture({ kind: 'move', origin: points, start: toLocal(e.clientX, e.clientY) });
    }
  };

  /** Click near an edge inserts a vertex there — the committed twin of Stage's getLineInsertIndex. */
  const onEdgePointerDown = (e: React.PointerEvent) => {
    if (!editable || e.button !== 0) return;
    const p = toLocal(e.clientX, e.clientY);
    const index = getInsertIndex(points, p, EDGE_HIT_WIDTH * unit);
    if (index === -1) return;
    e.stopPropagation();
    const next = [...points];
    next.splice(index, 0, p);
    commit(next);
    setGesture({ kind: 'vertex', index });
    setDraft(next);
  };

  const onVertexPointerDown = (index: number) => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setGesture({ kind: 'vertex', index });
  };

  /** Right-click removes a vertex, refusing to drop below a drawable triangle. */
  const onVertexContextMenu = (index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (points.length <= MIN_VERTICES) return;
    commit(points.filter((_, i) => i !== index));
  };

  const onHandlePointerDown = (corner: ScaleCorner) => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setGesture({ kind: 'scale', corner, origin: points });
  };

  const onRotatePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setGesture({ kind: 'rotate', origin: points, start: toLocal(e.clientX, e.clientY) });
  };

  // ─── Render ───

  const pointsStr = points.map(p => `${p.x},${p.y}`).join(' ');
  const corners: { id: ScaleCorner; x: number; y: number; cursor: string }[] = [
    { id: 'tl', x: minX, y: minY, cursor: 'nw-resize' },
    { id: 'tr', x: maxX, y: minY, cursor: 'ne-resize' },
    { id: 'bl', x: minX, y: maxY, cursor: 'sw-resize' },
    { id: 'br', x: maxX, y: maxY, cursor: 'se-resize' },
  ];
  const rotateX = (minX + maxX) / 2;
  const rotateY = minY - 24 * unit;

  return (
    <g>
      <polygon
        points={pointsStr}
        fill={polygon.colour}
        fillOpacity={0.5}
        stroke={polygon.colour}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        style={{
          pointerEvents: clickable ? 'auto' : 'none',
          cursor: editable ? 'move' : clickable ? 'pointer' : undefined,
        }}
        onPointerDown={onFillPointerDown}
      />
      {selected && (
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#ffffff"
          stroke={polygon.colour}
          strokeWidth={2 * unit}
          paintOrder="stroke"
          style={{ fontSize: 8*unit, pointerEvents: 'none', userSelect: 'none' }}
        >
          {polygon.id}
        </text>
      )}
      {editable && (
        <>
          {/* Invisible fat stroke ABOVE the fill so edge clicks insert rather than move. */}
          <polygon
            points={pointsStr}
            fill="none"
            stroke="transparent"
            strokeWidth={EDGE_HIT_WIDTH * unit}
            style={{ pointerEvents: 'stroke', cursor: 'crosshair' }}
            onPointerDown={onEdgePointerDown}
          />

          <rect
            x={minX} y={minY}
            width={maxX - minX} height={maxY - minY}
            fill="none"
            stroke="#ffffff"
            strokeWidth={1}
            strokeDasharray="5,5"
            vectorEffect="non-scaling-stroke"
            style={{ pointerEvents: 'none' }}
          />

          <line
            x1={rotateX} y1={minY} x2={rotateX} y2={rotateY}
            stroke="#ffffff7f"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            style={{ pointerEvents: 'none' }}
          />
          <circle
            cx={rotateX} cy={rotateY} r={(HANDLE_SIZE / 2) * unit}
            fill="#ffffff"
            style={{ pointerEvents: 'fill', cursor: 'grab' }}
            onPointerDown={onRotatePointerDown}
          />

          {corners.map(c => (
            <rect
              key={c.id}
              x={c.x - (HANDLE_SIZE * unit) / 2}
              y={c.y - (HANDLE_SIZE * unit) / 2}
              width={HANDLE_SIZE * unit}
              height={HANDLE_SIZE * unit}
              fill="#ffffff"
              style={{ pointerEvents: 'all', cursor: c.cursor }}
              onPointerDown={onHandlePointerDown(c.id)}
            />
          ))}

          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x} cy={p.y} r={VERTEX_RADIUS * unit}
              fill={polygon.colour}
              stroke="#ffffff"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              style={{ pointerEvents: 'fill', cursor: 'move' }}
              onPointerDown={onVertexPointerDown(i)}
              onContextMenu={onVertexContextMenu(i)}
            />
          ))}
        </>
      )}
    </g>
  );
};

export default Polygon;
