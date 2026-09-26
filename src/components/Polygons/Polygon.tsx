import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointType, PolygonType } from '../../types';
import './Polygon.css'
import {
  erasePolygon,
  exportPolygonImages,
  getBounds,
  getInsertIndex,
  rasterizePolygon,
  rotatePoints,
  scalePoints,
  translatePoints,
  type ScaleCorner,
} from './utils';
import { updatePolygon as updatePolygonAction, toggleSelected } from '../../redux/polygonsSlice';
import { Icon } from '../Icon/Icon';
import { useTooltip } from '../Tooltip/useTooltip';
import { ico } from '../../utils/icons';
import Window from '../Window/Window';
import Stats from '../Stats/Stats';
import { InputBox } from '../InputBox/InputBox';
import { rdxi, rdxo } from '../../redux/store';
import { selectActiveLabel } from '../../redux/labelsSlice';
import { selectMode } from '../../redux/canvasSlice';

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
  polygon, selected, clickable, unit, toLocal, onSelect,
}) => {
    // const scale = useAppSelector(s => s.canvas.scale);
  
  const activeLabel = rdxo(selectActiveLabel);
  const layers = rdxo(s => s.imageLayers.layers);
  const canvasWidth = rdxo(s => s.canvas.canvasWidth);
  const dispatch = rdxi();
  const updatePolygon = (id: string, patch: Partial<PolygonType>) => dispatch(updatePolygonAction({ id, ...patch }));
  const toggleSelectedPolygon = (id: string) => dispatch(toggleSelected(id));
  const mode = rdxo(selectMode);
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [draft, setDraft] = useState<PointType[] | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const {showTooltip} = useTooltip();

  // Mirrored so the gesture effect's pointerup can read the final draft without
  // re-subscribing on every mousemove.
  const draftRef = useRef<PointType[] | null>(null);
  useEffect(() => { draftRef.current = draft; }, [draft]);

  const points = draft ?? polygon.points;
  const { minX, minY, maxX, maxY } = getBounds(points);
  const centerX = (minX + maxX)/2;
  const centerY = (minY + maxY)/2;

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
      if (draftRef.current) updatePolygon(polygon.id, {points: draftRef.current});
      setDraft(null);
      setGesture(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [gesture, toLocal, polygon.points]);

  // ─── Handlers ───

  const onFillPointerDown = (e: React.PointerEvent) => {
    if (!clickable || e.button !== 0) return;
    e.stopPropagation();
    const additive = e.metaKey || e.ctrlKey || e.shiftKey;
    console.log("ADDITIVE: ", additive)
    onSelect(polygon.id, additive);
    // Only an already-selected polygon moves, so the first click just selects.
    if (clickable && selected && !additive) {
      setGesture({ kind: 'move', origin: points, start: toLocal(e.clientX, e.clientY) });
    }
  };

  /** Click near an edge inserts a vertex there — the committed twin of Stage's getLineInsertIndex. */
  const onEdgePointerDown = (e: React.PointerEvent) => {
    if (!(clickable && selected) || e.button !== 0) return;
    const p = toLocal(e.clientX, e.clientY);
    const index = getInsertIndex(points, p, EDGE_HIT_WIDTH * unit);
    if (index === -1) return;
    e.stopPropagation();
    const next = [...points];
    next.splice(index, 0, p);
    updatePolygon(polygon.id, {points: next})
    setGesture({ kind: 'vertex', index });
    setDraft(next);
  };

  const onVertexPointerDown = (index: number) => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setGesture({ kind: 'vertex', index });
  };

  /** Right-click removes a vertex, refusing to drop below a drawable triangle. */
  const onVertexContextMenu = (index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (points.length <= MIN_VERTICES) return;
    updatePolygon(polygon.id, {points: points.filter((_, i) => i !== index)})
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

  const hole = VERTEX_RADIUS * unit + 2 * unit; // vertex square plus a 1px ring each side

  return (
    <>
    { statsOpen && 
      <Window
        classes={`ui-dark ${draft ? 'pending' : ''}` }
        title='STATS'
        origin= {{x: minX/unit, y:minY/unit}}
        zoom = {1}
        onClose={() => setStatsOpen(false)}
        resizable={true}
        // dims={{w:500, h:500}}
      >
        <Stats points={points} name={polygon.label || polygon.id} />
      </Window>

    }

    {selected && mode !== 'pen' &&
      <Window
        origin= {{x: minX/unit, y:minY/unit}}
        width = {'max-content'}
        height ={'max-content'}
        classes='ui-dark'
        title='CTRLS'
        zoom = {1}
        onClose={() => toggleSelectedPolygon(polygon.id)}
      >
        <div
          className='polygon-controls'
          
        >
          <InputBox 
            defaultValue={polygon.name} 
            onKeyDown={e => { 
              // console.log("E KEY: ", e.key)
              // e.preventDefault();
              e.stopPropagation();
              if (e.key === 'Enter') e.currentTarget.blur(); 
              if (e.key === 'Escape') {
                e.currentTarget.value = polygon.name ?? '';
                e.currentTarget.blur(); 
              }
            }}
            onBlur={e => {
              const name = e.currentTarget.value.trim();
              if (name !== (polygon.name ?? '')) updatePolygon(polygon.id, { name });
            }}
            placeholder={'Name'}
          />


          <Icon
            src={ico('bucket.svg')}
            classes="button fit icon-fill inset-2"
            color='#FFFFFF'
            onPointerDown={e => e.stopPropagation()}
            onClick={() => rasterizePolygon(points, activeLabel.colour)}
            onMouseEnter={showTooltip(`<b>FILL</b><br><dim>ENTER</dim>`, {direction:'top'})}
          />
          <Icon
            src={ico('eraser.svg')}
            classes="button fit icon-erase inset-2"
            color='#FFFFFF'
            onPointerDown={e => e.stopPropagation()}
            onClick={() => erasePolygon(points)}
            onMouseEnter={showTooltip(`<b>ERASE</b><br><dim>SHIFT+ENTER</dim>`, {direction:'top'})}
          />

          <Icon
            src={ico('pie_chart.svg')}
            classes="button fit inset-2"
            color='#FFFFFF'
            onPointerDown={e => e.stopPropagation()}
            onClick={() => setStatsOpen(prev => !prev)}
            onMouseEnter={showTooltip(`<b>STATS</b><br>`, {direction:'top'})}
          />
          <Icon
            src={ico('download.svg')}
            classes="button fit inset-2"
            color='#FFFFFF'
            onPointerDown={e => e.stopPropagation()}
            onClick={() => exportPolygonImages(points, polygon.name || polygon.id, layers, canvasWidth)}
            onMouseEnter={showTooltip(`<b>DOWNLOAD</b><br><dim>seg map + all layers</dim>`, {direction:'top'})}
          />

        </div>
      </Window>
    }


    <g className='polygon-container'>

        <defs>
          <mask id={`vertex-holes-${polygon.id}`} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {points.map((p, i) => (
              <rect key={i} x={p.x - hole / 2} y={p.y - hole / 2} width={hole} height={hole} fill="black" />
            ))}
          </mask>
        </defs>

      {selected && (mode !== 'pen') &&
        <polygon
          className={`polygon`}
          mask={selected ? `url(#vertex-holes-${polygon.id})` : undefined}

          points={pointsStr}
          fill={'transparent'}
          fillOpacity={0}
          stroke={'#FFFFFF'}
          strokeWidth={2.5}
          strokeDasharray={'4,8'}

          vectorEffect="non-scaling-stroke"
          style={{
            pointerEvents: 'none',
            cursor: (clickable && selected) ? 'move' : clickable ? 'pointer' : undefined,
            zIndex: 2,
            transformBox: 'fill-box',
            transformOrigin: 'center',
            // transform:' translate(-50%, -50%) scale(1.25, 1.25)'
          }}
          onPointerDown={onFillPointerDown}
        />
        }
      <polygon
        className={`polygon ${selected ? 'selected' : ''}`}
                        mask={selected ? `url(#vertex-holes-${polygon.id})` : undefined}

        points={pointsStr}
        fill={mode === 'pen' ? '#FFFFFF40' : selected ? /*`url(#${patternId})`*/ activeLabel.colour : 'transparent'}
        fillOpacity={0}
        stroke={selected ? '#FFFFFFC0' : '#FFFFFFC0'}
        strokeWidth={selected ? 2 : 1.5}
        strokeDasharray={(mode === 'pen' || !selected ) ? '2,2' : undefined}
        // strokeDasharray={(mode === 'pen' && selected) ? "4,4" : undefined}

        vectorEffect="non-scaling-stroke"
        style={{
          pointerEvents: clickable ? 'auto' : 'none',
          cursor: (clickable && selected) ? 'move' : clickable ? 'pointer' : undefined,
          zIndex: 3,
          mixBlendMode:'multiply'
        }}
        onPointerDown={onFillPointerDown}
      />


      

      {selected && (
        <text
          x={minX}
          y={minY - 12*unit}
          textAnchor="start"
          dominantBaseline="central"
          fill="#FFFFFF"
          // stroke={polygon.colour}
          // strokeWidth={2}
          paintOrder="stroke"
          style={{ fontSize: 12*unit, pointerEvents: 'none', userSelect: 'none', fontWeight:'bolder'}}
        >
          {(polygon.name || '--')+' '+centerX + ", " + centerY }
        </text>
      )}
      {selected && (
        <>


          {/* Invisible fat stroke ABOVE the fill so edge clicks insert rather than move. */}
          <polygon
            className='polygon-edge'
            points={pointsStr}
            fill="none"
            stroke="transparent"
            strokeWidth={EDGE_HIT_WIDTH * unit}
            style={{ pointerEvents: 'stroke', cursor: 'cell' }}
            onPointerDown={onEdgePointerDown}
          />

          <rect
            x={minX} y={minY}
            width={maxX - minX} height={maxY - minY}
            fill="none"
            stroke="#ffffff"
            strokeWidth={1}
            strokeDasharray="1,4"
            vectorEffect="non-scaling-stroke"
            style={{ 
              pointerEvents: 'none', 
              // transformBox:'fill-box',
              // transform:'scale(1.25)',
              // transformOrigin:'center'
            }}
          />

          <line
            x1={rotateX} y1={minY} x2={rotateX} y2={rotateY}
            fill="none"
            strokeWidth={1}
            stroke="#ffffff7F"

            vectorEffect="non-scaling-stroke"
            style={{ pointerEvents: 'none' }}
          />
          <circle
            cx={rotateX} cy={rotateY} r={(HANDLE_SIZE / 2) * unit}
            stroke="#ffffff"
            strokeWidth={1}
            fill="none"
            vectorEffect="non-scaling-stroke"

            style={{ pointerEvents: 'fill', cursor: 'grab' }}
            onPointerDown={onRotatePointerDown}
          />

          {corners.map(c => (
            <rect
              className='polygon-corner-handle'
              key={c.id}
              x={c.x - (HANDLE_SIZE * unit) / 2}
              y={c.y - (HANDLE_SIZE * unit) / 2}
              width={HANDLE_SIZE * unit}
              height={HANDLE_SIZE * unit}
              // fill="#ffffff"
              fill="transparent"
              stroke="#ffffff"
              vectorEffect="non-scaling-stroke"

              style={{ pointerEvents: 'all', cursor: c.cursor }}
              onPointerDown={onHandlePointerDown(c.id)}
            />
          ))}



          {points.map((p, i) => (
            <rect
              className='polygon-vertex'
                mask={selected ? `url(#vertex-holes-${polygon.id})` : undefined}
              key={i}
              x={p.x - (VERTEX_RADIUS * unit)/2} 
              y={p.y - (VERTEX_RADIUS * unit)/2} 
              width={VERTEX_RADIUS * unit}
              height={VERTEX_RADIUS * unit}

              // fill='#ffffff'
              stroke="#ffffff"
              strokeWidth={6}
              vectorEffect="non-scaling-stroke"
              style={{ pointerEvents: 'fill', cursor: 'move' }}
              onPointerDown={onVertexPointerDown(i)}
              onContextMenu={onVertexContextMenu(i)}
            />
          ))}


        </>
      )}
    </g>
    </>
  );
};

export default Polygon;
