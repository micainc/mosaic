import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../store';
import { setCanvasDimensions, setHasLayers, setStatusText, setScale, setCursorXY } from '../store/canvasSlice';
import { addLayer, setActiveLayer } from '../store/imageLayersSlice';
import { setActiveDrawLabelColour } from '../store/labelsSlice';
import { drawCircle } from '../utils/drawCircle';
import { floodFill } from '../utils/floodFill';
import { rgbToHex } from '../utils/rgbUtils';
import { createHighlightMask, applyActiveColourToHighlighted } from '../utils/highlight';
import { updateAnchoredMask, reapplyAnchoredMask } from '../utils/anchoring';
import { getFilename, getCommonSubstring, downloadBlob, downloadDataUrl } from '../utils/fileUtils';
import SegMapImportDialog, { SegMapColorEntry } from './SegMapImportDialog';
import type { Point } from '../types';

const HANDLE_SIZE = 6;
const PEN_POINT_RADIUS = 6;
const MAX_HISTORY_SIZE = 10;

interface PendingSegImport {
  image: HTMLImageElement;
  colors: SegMapColorEntry[];
}

const Stage: React.FC = () => {
  const dispatch = useAppDispatch();
  const [pendingSegImport, setPendingSegImport] = useState<PendingSegImport | null>(null);

  // Redux state
  const interactionMode = useAppSelector((s) => s.canvas.interactionMode);
  const drawDiameter = useAppSelector((s) => s.canvas.drawDiameter);
  const scale = useAppSelector((s) => s.canvas.scale);
  const activeDrawLabelColour = useAppSelector((s) => s.labels.activeDrawLabelColour);
  const colourLabelMap = useAppSelector((s) => s.labels.colourLabelMap);
  const anchoredColours = useAppSelector((s) => s.labels.anchoredColours);
  const layers = useAppSelector((s) => s.imageLayers.layers);
  const activeLayerName = useAppSelector((s) => s.imageLayers.activeLayerName);

  // ──────────────────── DOM refs ────────────────────
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const svgCanvasRef = useRef<SVGSVGElement>(null);
  const svgScaleGroupRef = useRef<SVGGElement>(null);
  const baseImageRef = useRef<HTMLImageElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorTextRef = useRef<HTMLDivElement>(null);

  // ──────────────────── Mutable state refs ────────────────────
  const drawCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const leftClickedRef = useRef(false);
  const rightClickedRef = useRef(false);
  const drawPathRef = useRef<Point[]>([]);
  const svgPathRef = useRef<SVGPathElement | null>(null);
  const mouseXRef = useRef(0);
  const mouseYRef = useRef(0);
  const offsetXRef = useRef(0);
  const offsetYRef = useRef(0);
  const scrollXRef = useRef(0);
  const scrollYRef = useRef(0);
  const undoHistoryRef = useRef<ImageData[]>([]);
  const hoveredColourRef = useRef('#000000');
  const isGesturingRef = useRef(false);
  const middleClickedRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // ──────────────────── Pen tool refs ────────────────────
  const penPointsRef = useRef<Point[]>([]);
  const penIsDraggingRef = useRef(false);
  const penDraggedPointIndexRef = useRef(-1);
  const penIsTransformingRef = useRef(false);
  const penSVGGroupRef = useRef<SVGGElement | null>(null);
  const transformTypeRef = useRef('');
  const transformStartPointRef = useRef<Point>({ x: 0, y: 0 });
  const transformCenterRef = useRef<Point>({ x: 0, y: 0 });
  const originalPenPointsRef = useRef<Point[]>([]);

  // ──────────────────── Highlight ref ────────────────────
  const highlightedMaskRef = useRef<Uint32Array | null>(null);

  // ──────────────────── Anchored mask refs ────────────────────
  const anchoredMaskCanvasRef = useRef<OffscreenCanvas | null>(null);
  const anchoredMaskCtxRef = useRef<CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null>(null);

  // ──────────────────── Pixel data map ────────────────────
  const pixelDataMapRef = useRef<Record<string, Uint8Array>>({});

  // Track if dimensions have been set
  const dimensionsSetRef = useRef(false);

  // ──────────────────── Redux → ref mirrors ────────────────────
  // We keep "ref mirrors" so that imperative event handlers (added once on mount)
  // always read the latest Redux values without stale closures.
  const interactionModeRef = useRef(interactionMode);
  const drawDiameterRef = useRef(drawDiameter);
  const scaleRef = useRef(scale);
  const activeColourRef = useRef(activeDrawLabelColour);
  const colourLabelMapRef = useRef(colourLabelMap);
  const anchoredColoursRef = useRef(anchoredColours);
  const layersRef = useRef(layers);
  const activeLayerNameRef = useRef(activeLayerName);

  useEffect(() => { interactionModeRef.current = interactionMode; }, [interactionMode]);
  useEffect(() => { drawDiameterRef.current = drawDiameter; }, [drawDiameter]);
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { activeColourRef.current = activeDrawLabelColour; }, [activeDrawLabelColour]);
  useEffect(() => { colourLabelMapRef.current = colourLabelMap; }, [colourLabelMap]);
  useEffect(() => { anchoredColoursRef.current = anchoredColours; }, [anchoredColours]);
  useEffect(() => { layersRef.current = layers; }, [layers]);
  useEffect(() => { activeLayerNameRef.current = activeLayerName; }, [activeLayerName]);

  // ──────────────────── Cursor size sync ────────────────────
  useEffect(() => {
    const cursor = cursorRef.current;
    if (cursor) {
      cursor.style.width = drawDiameter + 'px';
      cursor.style.height = drawDiameter + 'px';
    }
  }, [drawDiameter]);

  // ──────────────────────────────────────────────────────────
  //  HELPER FUNCTIONS (stable across renders, defined once)
  // ──────────────────────────────────────────────────────────

  // --- Undo ---
  const saveState = useCallback(() => {
    const ctx = drawCtxRef.current;
    const canvas = drawCanvasRef.current;
    if (!ctx || !canvas) return;
    if (undoHistoryRef.current.length >= MAX_HISTORY_SIZE) {
      undoHistoryRef.current.shift();
    }
    undoHistoryRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  }, []);

  const undo = useCallback(() => {
    if (undoHistoryRef.current.length > 0) {
      const lastState = undoHistoryRef.current.pop()!;
      drawCtxRef.current?.putImageData(lastState, 0, 0);
    }
  }, []);

  // --- SVG helpers ---
  const clearSvgGroup = useCallback(() => {
    const g = svgScaleGroupRef.current;
    if (g) {
      while (g.firstChild) g.removeChild(g.firstChild);
    }
  }, []);

  // --- Reapply anchored mask (convenience wrapper) ---
  const doReapplyAnchoredMask = useCallback(() => {
    const ctx = drawCtxRef.current;
    const maskCanvas = anchoredMaskCanvasRef.current;
    if (!ctx || !maskCanvas) return;
    reapplyAnchoredMask(ctx, maskCanvas, anchoredColoursRef.current);
  }, []);

  // --- Parse SVG path → point array ---
  const parseSVGPathToPoints = useCallback((pathData: string, canvasScale: number): Point[] => {
    const points: Point[] = [];
    const commands = pathData.match(/[MLZ]\s*[\d\s,.-]+/g);
    if (!commands) return points;

    commands.forEach((cmd) => {
      const type = cmd[0];
      const coords = cmd.slice(1).trim().split(/[\s,]+/).map(Number);
      if (type === 'M' && coords.length >= 2) {
        points.push({
          x: Math.round((coords[0] + scrollXRef.current) * canvasScale),
          y: Math.round((coords[1] + scrollYRef.current) * canvasScale),
        });
      } else if (type === 'L' && coords.length >= 2) {
        points.push({
          x: Math.round((coords[0] + scrollXRef.current) * canvasScale),
          y: Math.round((coords[1] + scrollYRef.current) * canvasScale),
        });
      }
    });
    return points;
  }, []);

  // --- Flood fill convenience ---
  const flood = useCallback(
    (x: number, y: number, mode: null | 'infill' | 'replace' = null): boolean => {
      const ctx = drawCtxRef.current;
      const canvas = drawCanvasRef.current;
      if (!ctx || !canvas) return false;
      return floodFill(ctx, canvas.width, canvas.height, x, y, activeColourRef.current.colour, mode);
    },
    [],
  );

  // --- Draw SVG path to canvas (draw mode, left click) ---
  const drawSVGPathToCanvas = useCallback(
    (pathData: string) => {
      const ctx = drawCtxRef.current;
      const canvas = drawCanvasRef.current;
      if (!ctx || !canvas) return;

      const canvasScale = canvas.width / canvas.clientWidth;
      const radius = Math.max(1, Math.floor((drawDiameterRef.current * canvasScale) / 2));
      const points = parseSVGPathToPoints(pathData, canvasScale);

      ctx.fillStyle = activeColourRef.current.colour;

      for (let i = 0; i < points.length - 1; i++) {
        const dx = points[i + 1].x - points[i].x;
        const dy = points[i + 1].y - points[i].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.ceil(distance / (radius * 0.5));

        for (let step = 0; step <= steps; step++) {
          const t = step / steps;
          const x = Math.round(points[i].x + dx * t);
          const y = Math.round(points[i].y + dy * t);
          drawCircle(ctx, x, y, radius);
        }
      }

      // Handle single click (flood fill detection + draw dot)
      if (drawPathRef.current.length === 1) {
        if (flood(mouseXRef.current, mouseYRef.current)) {
          flood(mouseXRef.current, mouseYRef.current, 'infill');
        }
        drawCircle(ctx, mouseXRef.current, mouseYRef.current, radius);
      }

      doReapplyAnchoredMask();
    },
    [parseSVGPathToPoints, flood, doReapplyAnchoredMask],
  );

  // --- Erase SVG path from canvas (draw mode, right click) ---
  const eraseSVGPathFromCanvas = useCallback(
    (pathData: string) => {
      const ctx = drawCtxRef.current;
      const canvas = drawCanvasRef.current;
      if (!ctx || !canvas) return;

      const canvasScale = canvas.width / canvas.clientWidth;
      const radius = Math.max(1, Math.floor((drawDiameterRef.current * canvasScale) / 2));
      ctx.globalCompositeOperation = 'destination-out';

      const points = parseSVGPathToPoints(pathData, canvasScale);
      ctx.fillStyle = activeColourRef.current.colour;

      for (let i = 0; i < points.length - 1; i++) {
        const dx = points[i + 1].x - points[i].x;
        const dy = points[i + 1].y - points[i].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.ceil(distance / (radius * 0.5));

        for (let step = 0; step <= steps; step++) {
          const t = step / steps;
          const x = Math.round(points[i].x + dx * t);
          const y = Math.round(points[i].y + dy * t);
          drawCircle(ctx, x, y, radius);
        }
      }

      if (drawPathRef.current.length === 1) {
        if (flood(mouseXRef.current, mouseYRef.current)) {
          flood(mouseXRef.current, mouseYRef.current, 'infill');
        }
        drawCircle(ctx, mouseXRef.current, mouseYRef.current, radius);
      }

      ctx.globalCompositeOperation = 'source-over';
      doReapplyAnchoredMask();
    },
    [parseSVGPathToPoints, flood, doReapplyAnchoredMask],
  );

  // --- Solidify path (fill gaps between points) ---
  const solidifyPath = useCallback((path: Point[]): Point[] => {
    const ctx = drawCtxRef.current;
    const canvas = drawCanvasRef.current;
    if (!ctx || !canvas || path.length < 2) return path;

    ctx.fillStyle = activeColourRef.current.colour;
    ctx.imageSmoothingEnabled = false;

    const lineWidth = Math.ceil(drawDiameterRef.current * (canvas.width / canvas.clientWidth));
    const points: Point[] = [];

    for (let i = 0; i < path.length - 1; i++) {
      points.push({ x: path[i].x, y: path[i].y });
      const dx = path[i + 1].x - path[i].x;
      const dy = path[i + 1].y - path[i].y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < drawDiameterRef.current / 2) continue;

      const steps = Math.max(Math.abs(dx), Math.abs(dy)) / (drawDiameterRef.current / 2);
      const xInc = dx / steps;
      const yInc = dy / steps;

      for (let step = 0; step <= steps; step++) {
        const rx = Math.round(path[i].x + xInc * step);
        const ry = Math.round(path[i].y + yInc * step);
        drawCircle(ctx, rx, ry, lineWidth / 2);
        points.push({ x: rx, y: ry });
      }
    }
    points.push({ x: path[path.length - 1].x, y: path[path.length - 1].y });
    return points;
  }, []);

  // ──────────────────── PEN TOOL HELPERS ────────────────────

  const getPointAtPosition = useCallback((x: number, y: number): number => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return -1;
    const canvasScale = canvas.width / canvas.clientWidth;
    const threshold = PEN_POINT_RADIUS * canvasScale * 2;

    for (let i = 0; i < penPointsRef.current.length; i++) {
      const dx = penPointsRef.current[i].x - x;
      const dy = penPointsRef.current[i].y - y;
      if (Math.sqrt(dx * dx + dy * dy) <= threshold) return i;
    }
    return -1;
  }, []);

  const pointToLineDistance = useCallback(
    (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
      const A = px - x1;
      const B = py - y1;
      const C = x2 - x1;
      const D = y2 - y1;
      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      let param = -1;
      if (lenSq !== 0) param = dot / lenSq;
      let xx: number, yy: number;
      if (param < 0) { xx = x1; yy = y1; }
      else if (param > 1) { xx = x2; yy = y2; }
      else { xx = x1 + param * C; yy = y1 + param * D; }
      const dxr = px - xx;
      const dyr = py - yy;
      return Math.sqrt(dxr * dxr + dyr * dyr);
    },
    [],
  );

  const getLineInsertIndex = useCallback(
    (x: number, y: number): number => {
      const pts = penPointsRef.current;
      if (pts.length < 2) return -1;
      const canvas = drawCanvasRef.current;
      if (!canvas) return -1;
      const canvasScale = canvas.width / canvas.clientWidth;
      const threshold = 10 * canvasScale;

      let minDistance = Infinity;
      let insertIndex = -1;

      for (let i = 0; i < pts.length; i++) {
        const p1 = pts[i];
        const p2 = pts[(i + 1) % pts.length];
        const d = pointToLineDistance(x, y, p1.x, p1.y, p2.x, p2.y);
        if (d < threshold && d < minDistance) {
          minDistance = d;
          insertIndex = i + 1;
        }
      }
      return insertIndex;
    },
    [pointToLineDistance],
  );

  // --- startTransform ---
  const startTransform = useCallback((type: string, e: MouseEvent) => {
    penIsTransformingRef.current = true;
    transformTypeRef.current = type;

    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    transformStartPointRef.current = {
      x: (e.clientX - rect.left) * canvas.width / canvas.clientWidth,
      y: (e.clientY - rect.top) * canvas.height / canvas.clientHeight,
    };
    originalPenPointsRef.current = penPointsRef.current.map((p) => ({ ...p }));
  }, []);

  // Forward-declare updatePenDisplay so that performPenShapeTransform can call it.
  // We will assign the actual implementation via a ref.
  const updatePenDisplayRef = useRef<() => void>(() => {});

  // --- performPenShapeTransform ---
  const performPenShapeTransform = useCallback((currentX: number, currentY: number) => {
    const tType = transformTypeRef.current;
    const origPts = originalPenPointsRef.current;

    if (tType.startsWith('scale-')) {
      const corner = tType.split('-')[1];
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      origPts.forEach((p) => { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); });
      const originalWidth = maxX - minX;
      const originalHeight = maxY - minY;
      if (originalWidth === 0 || originalHeight === 0) return;

      let scaleX = 1, scaleY = 1, anchorX = minX, anchorY = minY;
      switch (corner) {
        case 'tl': scaleX = (maxX - currentX) / originalWidth; scaleY = (maxY - currentY) / originalHeight; anchorX = maxX; anchorY = maxY; break;
        case 'tr': scaleX = (currentX - minX) / originalWidth; scaleY = (maxY - currentY) / originalHeight; anchorX = minX; anchorY = maxY; break;
        case 'bl': scaleX = (maxX - currentX) / originalWidth; scaleY = (currentY - minY) / originalHeight; anchorX = maxX; anchorY = minY; break;
        case 'br': scaleX = (currentX - minX) / originalWidth; scaleY = (currentY - minY) / originalHeight; anchorX = minX; anchorY = minY; break;
      }
      const uniformScale = Math.max(0.1, Math.min(scaleX, scaleY));
      penPointsRef.current = origPts.map((p) => ({
        x: Math.round(anchorX + (p.x - anchorX) * uniformScale),
        y: Math.round(anchorY + (p.y - anchorY) * uniformScale),
      }));
    } else if (tType === 'rotate') {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      origPts.forEach((p) => { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); });
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const angle1 = Math.atan2(transformStartPointRef.current.y - centerY, transformStartPointRef.current.x - centerX);
      const angle2 = Math.atan2(currentY - centerY, currentX - centerX);
      const deltaAngle = angle2 - angle1;
      const cos = Math.cos(deltaAngle);
      const sin = Math.sin(deltaAngle);

      penPointsRef.current = origPts.map((p) => {
        const dx = p.x - centerX;
        const dy = p.y - centerY;
        return {
          x: Math.round(centerX + dx * cos - dy * sin),
          y: Math.round(centerY + dx * sin + dy * cos),
        };
      });
    }
    updatePenDisplayRef.current();
  }, []);

  // --- updatePenDisplay ---
  const updatePenDisplay = useCallback(() => {
    const svg = svgCanvasRef.current;
    let group = penSVGGroupRef.current;
    if (!svg || !group) return;

    // Clear existing elements
    while (group.firstChild) group.removeChild(group.firstChild);

    const pts = penPointsRef.current;
    if (pts.length === 0) return;

    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const canvasScale = canvas.width / canvas.clientWidth;
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    // Bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    pts.forEach((p) => { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); });
    transformCenterRef.current = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };

    const colour = activeColourRef.current.colour;

    // Polygon fill (50% opacity)
    if (pts.length >= 3) {
      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      const pointsStr = pts.map((p) => `${(p.x / canvasScale) - scrollX},${(p.y / canvasScale) - scrollY}`).join(' ');
      polygon.setAttribute('points', pointsStr);
      polygon.setAttribute('fill', colour);
      polygon.setAttribute('fill-opacity', '0.5');
      polygon.setAttribute('stroke', 'none');
      group.appendChild(polygon);
    }

    // Lines
    if (pts.length >= 2) {
      const lines = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      let pathData = `M ${(pts[0].x / canvasScale) - scrollX} ${(pts[0].y / canvasScale) - scrollY}`;
      for (let i = 1; i < pts.length; i++) {
        pathData += ` L ${(pts[i].x / canvasScale) - scrollX} ${(pts[i].y / canvasScale) - scrollY}`;
      }
      pathData += ' Z';
      lines.setAttribute('d', pathData);
      lines.setAttribute('stroke', colour);
      lines.setAttribute('stroke-width', '2');
      lines.setAttribute('fill', 'none');
      lines.setAttribute('stroke-opacity', '1');
      lines.style.pointerEvents = 'stroke';
      lines.style.cursor = 'crosshair';
      group.appendChild(lines);
    }

    // Bounding box rect (dashed white)
    const bbRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bbRect.setAttribute('x', String((minX / canvasScale) - scrollX));
    bbRect.setAttribute('y', String((minY / canvasScale) - scrollY));
    bbRect.setAttribute('width', String((maxX - minX) / canvasScale));
    bbRect.setAttribute('height', String((maxY - minY) / canvasScale));
    bbRect.setAttribute('fill', 'none');
    bbRect.setAttribute('stroke', '#ffffff');
    bbRect.setAttribute('stroke-width', '1');
    bbRect.setAttribute('stroke-dasharray', '5,5');
    group.appendChild(bbRect);

    // Corner scale handles
    const corners = [
      { id: 'scale-tl', x: minX, y: minY, cursor: 'nw-resize' },
      { id: 'scale-tr', x: maxX, y: minY, cursor: 'ne-resize' },
      { id: 'scale-bl', x: minX, y: maxY, cursor: 'sw-resize' },
      { id: 'scale-br', x: maxX, y: maxY, cursor: 'se-resize' },
    ];
    corners.forEach((corner) => {
      const handle = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      handle.setAttribute('x', String((corner.x / canvasScale) - scrollX - HANDLE_SIZE / 2));
      handle.setAttribute('y', String((corner.y / canvasScale) - scrollY - HANDLE_SIZE / 2));
      handle.setAttribute('width', String(HANDLE_SIZE));
      handle.setAttribute('height', String(HANDLE_SIZE));
      handle.setAttribute('fill', '#ffffff');
      handle.style.cursor = corner.cursor;
      handle.style.pointerEvents = 'all';
      handle.addEventListener('mousedown', (e: Event) => {
        const me = e as MouseEvent;
        if (me.button === 0) { me.preventDefault(); me.stopPropagation(); startTransform(corner.id, me); }
      });
      group.appendChild(handle);
    });

    // Rotation handle line
    const rotateX = (minX + maxX) / 2;
    const rotateLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    rotateLine.setAttribute('x1', String((rotateX / canvasScale) - scrollX));
    rotateLine.setAttribute('y1', String((minY / canvasScale) - scrollY));
    rotateLine.setAttribute('x2', String((rotateX / canvasScale) - scrollX));
    rotateLine.setAttribute('y2', String((minY / canvasScale) - scrollY));
    rotateLine.setAttribute('stroke', '#ffffff7f');
    rotateLine.setAttribute('stroke-width', '1');
    group.appendChild(rotateLine);

    // Rotation handle circle
    const rotationCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    rotationCircle.setAttribute('cx', String((rotateX / canvasScale) - scrollX));
    rotationCircle.setAttribute('cy', String((minY / canvasScale) - scrollY));
    rotationCircle.setAttribute('r', String(HANDLE_SIZE / 2));
    rotationCircle.setAttribute('fill', '#ffffff');
    rotationCircle.style.cursor = 'grab';
    rotationCircle.style.pointerEvents = 'fill';
    rotationCircle.addEventListener('mousedown', (e: Event) => {
      const me = e as MouseEvent;
      if (me.button === 0) { me.preventDefault(); me.stopPropagation(); startTransform('rotate', me); }
    });
    group.appendChild(rotationCircle);

    // Vertex circles
    pts.forEach((point, index) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String((point.x / canvasScale) - scrollX));
      circle.setAttribute('cy', String((point.y / canvasScale) - scrollY));
      circle.setAttribute('r', String(PEN_POINT_RADIUS));
      circle.setAttribute('fill', colour);
      circle.setAttribute('stroke', '#ffffff');
      circle.setAttribute('stroke-width', '1');
      circle.style.cursor = 'move';
      circle.style.pointerEvents = 'fill';

      circle.addEventListener('mousedown', (e: Event) => {
        const me = e as MouseEvent;
        if (me.button === 0) {
          me.stopPropagation();
          penIsDraggingRef.current = true;
          penDraggedPointIndexRef.current = index;
        }
      });
      circle.addEventListener('contextmenu', (e: Event) => {
        e.preventDefault();
        (e as MouseEvent).stopPropagation?.();
        penPointsRef.current.splice(index, 1);
        updatePenDisplayRef.current();
      });
      group.appendChild(circle);
    });
  }, [startTransform]);

  // Wire the ref so performPenShapeTransform can call updatePenDisplay indirectly.
  useEffect(() => { updatePenDisplayRef.current = updatePenDisplay; }, [updatePenDisplay]);

  // --- initPenMode ---
  const initPenMode = useCallback(() => {
    const svg = svgCanvasRef.current;
    if (!svg) return;
    if (!penSVGGroupRef.current) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('id', 'pen-group');
      svg.appendChild(g);
      penSVGGroupRef.current = g;
    }
  }, []);

  // --- clearPenMode ---
  const clearPenMode = useCallback(() => {
    penPointsRef.current = [];
    const g = penSVGGroupRef.current;
    if (g) { while (g.firstChild) g.removeChild(g.firstChild); }
    penIsDraggingRef.current = false;
    penDraggedPointIndexRef.current = -1;
    penIsTransformingRef.current = false;
    transformTypeRef.current = '';
  }, []);

  // --- rasterizePenShape ---
  const rasterizePenShape = useCallback(() => {
    const pts = penPointsRef.current;
    if (pts.length < 3) return;
    const ctx = drawCtxRef.current;
    const canvas = drawCanvasRef.current;
    if (!ctx || !canvas) return;

    saveState();

    const offCanvas = new OffscreenCanvas(canvas.width, canvas.height);
    const offCtx = offCanvas.getContext('2d')!;
    offCtx.imageSmoothingEnabled = false;
    offCtx.fillStyle = activeColourRef.current.colour;
    offCtx.beginPath();
    offCtx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) offCtx.lineTo(pts[i].x, pts[i].y);
    offCtx.closePath();
    offCtx.fill();

    // Quantize anti-aliased pixels
    const imageData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
    const data = imageData.data;
    let col: string | number = activeColourRef.current.colour.startsWith('#') ? activeColourRef.current.colour.slice(1) : activeColourRef.current.colour;
    col = parseInt(col, 16);
    const r = (col >> 16) & 0xFF;
    const g = (col >> 8) & 0xFF;
    const b = col & 0xFF;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) {
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255;
      }
    }
    offCtx.putImageData(imageData, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(offCanvas, 0, 0);
    doReapplyAnchoredMask();
  }, [saveState, doReapplyAnchoredMask]);

  // --- erasePenShape ---
  const erasePenShape = useCallback(() => {
    const pts = penPointsRef.current;
    if (pts.length < 3) return;
    const ctx = drawCtxRef.current;
    const canvas = drawCanvasRef.current;
    if (!ctx || !canvas) return;

    saveState();

    const offCanvas = new OffscreenCanvas(canvas.width, canvas.height);
    const offCtx = offCanvas.getContext('2d')!;
    offCtx.imageSmoothingEnabled = false;
    offCtx.fillStyle = '#000000';
    offCtx.beginPath();
    offCtx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) offCtx.lineTo(pts[i].x, pts[i].y);
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
    doReapplyAnchoredMask();
    clearPenMode();
  }, [saveState, doReapplyAnchoredMask, clearPenMode]);

  // --- cropPenShape ---
  const cropPenShape = useCallback(() => {
    const pts = penPointsRef.current;
    if (pts.length < 3) return;
    const ctx = drawCtxRef.current;
    const canvas = drawCanvasRef.current;
    if (!ctx || !canvas) return;

    saveState();

    const maskCanvas = new OffscreenCanvas(canvas.width, canvas.height);
    const maskCtx = maskCanvas.getContext('2d')!;
    maskCtx.imageSmoothingEnabled = false;
    maskCtx.fillStyle = '#000000';
    maskCtx.beginPath();
    maskCtx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) maskCtx.lineTo(pts[i].x, pts[i].y);
    maskCtx.closePath();
    maskCtx.fill();

    const mask = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      if (mask[i + 3] === 0) {
        data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 0;
      }
    }
    ctx.putImageData(imageData, 0, 0);
    doReapplyAnchoredMask();
    clearPenMode();
  }, [saveState, doReapplyAnchoredMask, clearPenMode]);

  // ──────────────────── convertGrayToTransparent ────────────────────
  const convertGrayToTransparent = useCallback(() => {
    const ctx = drawCtxRef.current;
    const canvas = drawCanvasRef.current;
    if (!ctx || !canvas) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] === 127 && data[i + 1] === 127 && data[i + 2] === 127 && data[i + 3] !== 0) {
        data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 0;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }, []);

  // ──────────────────── Image layer loading ────────────────────

  const initAnchoredMaskCanvas = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const mask = new OffscreenCanvas(canvas.width, canvas.height);
    anchoredMaskCanvasRef.current = mask;
    anchoredMaskCtxRef.current = mask.getContext('2d');
  }, []);

  // Scan seg map image for colours, filter by active loadout, show dialog
  const processSegmentationLayer = useCallback(
    (file: File): Promise<void> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            // Scan colours in the incoming image
            const scanCanvas = new OffscreenCanvas(img.width, img.height);
            const scanCtx = scanCanvas.getContext('2d')!;
            scanCtx.drawImage(img, 0, 0);
            const scanData = scanCtx.getImageData(0, 0, img.width, img.height);
            const data = scanData.data;

            const colourCounts = new Map<string, number>();
            let unknownCount = 0;
            for (let i = 0; i < data.length; i += 4) {
              const a = data[i + 3];
              // Transparent pixels → unknown
              if (a === 0) { unknownCount++; continue; }
              // Gray boundary pixels (#7F7F7F) → unknown (these get converted to transparent on import)
              if (data[i] === 127 && data[i + 1] === 127 && data[i + 2] === 127) { unknownCount++; continue; }
              const hex = rgbToHex(data[i], data[i + 1], data[i + 2]);
              colourCounts.set(hex, (colourCounts.get(hex) || 0) + 1);
            }

            // Filter to only colours mapped in the active loadout
            const map = colourLabelMapRef.current;
            const entries: SegMapColorEntry[] = [];
            for (const [hex, count] of colourCounts) {
              const label = map[hex];
              if (label) {
                entries.push({ hex, label, pixelCount: count });
              }
            }

            // Always include unknown class (transparent + gray boundary pixels)
            entries.push({ hex: '#00000000', label: 'unknown', pixelCount: unknownCount });

            if (entries.length === 0) {
              // Nothing to import
              resolve();
              return;
            }

            // Show the import dialog — resolve immediately, apply happens via callback
            setPendingSegImport({ image: img, colors: entries });
            resolve();
          };
          img.onerror = reject;
          img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },
    [],
  );

  // Called when user confirms the import dialog
  const applySegmentationImport = useCallback((selectedHexes: Set<string>) => {
    const pending = pendingSegImport;
    if (!pending) return;
    setPendingSegImport(null);

    const canvas = drawCanvasRef.current;
    const ctx = drawCtxRef.current;
    if (!canvas || !ctx) return;

    saveState();

    const anchored = anchoredColoursRef.current;
    const hasAnchored = Object.keys(anchored).length > 0;

    // Resize canvas if needed (first load only)
    if (!dimensionsSetRef.current) {
      canvas.width = pending.image.width;
      canvas.height = pending.image.height;
      dimensionsSetRef.current = true;
      dispatch(setCanvasDimensions({ width: pending.image.width, height: pending.image.height }));
      initAnchoredMaskCanvas();
    }

    // Draw incoming seg map to a temp canvas to read its pixels
    const tempCanvas = new OffscreenCanvas(canvas.width, canvas.height);
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.drawImage(pending.image, 0, 0);
    const tempData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
    const td = tempData.data;

    // Read existing canvas pixels (these are preserved unless overwritten)
    const canvasData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const cd = canvasData.data;

    // Selectively overwrite: only pixels of checked classes, skip anchored existing pixels
    const importUnknown = selectedHexes.has('#00000000');
    for (let i = 0; i < td.length; i += 4) {
      const a = td[i + 3];
      // Skip gray boundary pixels
      if (td[i] === 127 && td[i + 1] === 127 && td[i + 2] === 127 && a !== 0) continue;

      // Check if existing pixel at this position is anchored
      if (hasAnchored && cd[i + 3] > 0) {
        const existingHex = rgbToHex(cd[i], cd[i + 1], cd[i + 2]);
        if (anchored[existingHex]) continue; // anchored pixel wins
      }

      if (a === 0) {
        // Transparent incoming pixel = 'unknown' class
        if (importUnknown) {
          cd[i] = 0; cd[i + 1] = 0; cd[i + 2] = 0; cd[i + 3] = 0;
        }
        continue;
      }

      const hex = rgbToHex(td[i], td[i + 1], td[i + 2]);
      if (!selectedHexes.has(hex)) continue; // not a selected class

      // Overwrite with incoming pixel
      cd[i] = td[i]; cd[i + 1] = td[i + 1]; cd[i + 2] = td[i + 2]; cd[i + 3] = td[i + 3];
    }

    ctx.putImageData(canvasData, 0, 0);
  }, [pendingSegImport, saveState, dispatch, initAnchoredMaskCanvas]);

  const cancelSegmentationImport = useCallback(() => {
    setPendingSegImport(null);
  }, []);

  const processImageLayer = useCallback(
    async (file: File): Promise<void> => {
      const displayUrl = URL.createObjectURL(file);

      const tempImg = new Image();
      await new Promise<void>((res) => { tempImg.onload = () => res(); tempImg.src = displayUrl; });

      // Extract pixel data
      const offCanvas = new OffscreenCanvas(tempImg.naturalWidth, tempImg.naturalHeight);
      const offCtx = offCanvas.getContext('2d')!;
      offCtx.drawImage(tempImg, 0, 0);
      const imageData = offCtx.getImageData(0, 0, tempImg.naturalWidth, tempImg.naturalHeight);

      const rgbPixels = new Uint8Array(tempImg.naturalWidth * tempImg.naturalHeight * 3);
      const rgbaData = imageData.data;
      let rgbIdx = 0;
      for (let i = 0; i < rgbaData.length; i += 4) {
        rgbPixels[rgbIdx++] = rgbaData[i];
        rgbPixels[rgbIdx++] = rgbaData[i + 1];
        rgbPixels[rgbIdx++] = rgbaData[i + 2];
      }

      // Generate 256px thumbnail
      const iconCanvas = document.createElement('canvas');
      const iconCtx = iconCanvas.getContext('2d')!;
      let iconWidth: number, iconHeight: number;
      if (tempImg.naturalWidth >= tempImg.naturalHeight) {
        iconWidth = 256;
        iconHeight = Math.round((tempImg.naturalHeight / tempImg.naturalWidth) * 256);
      } else {
        iconHeight = 256;
        iconWidth = Math.round((tempImg.naturalWidth / tempImg.naturalHeight) * 256);
      }
      iconCanvas.width = iconWidth;
      iconCanvas.height = iconHeight;
      iconCtx.drawImage(tempImg, 0, 0, iconWidth, iconHeight);
      const iconUrl = iconCanvas.toDataURL('image/jpeg', 1);

      // Set canvas dimensions if first image
      if (!dimensionsSetRef.current) {
        const canvas = drawCanvasRef.current;
        if (canvas) {
          canvas.width = tempImg.naturalWidth;
          canvas.height = tempImg.naturalHeight;
          dispatch(setCanvasDimensions({ width: tempImg.naturalWidth, height: tempImg.naturalHeight }));
          initAnchoredMaskCanvas();
        }
        const baseImg = baseImageRef.current;
        if (baseImg) {
          baseImg.src = displayUrl;
          baseImg.style.width = '100%';
          baseImg.style.height = 'auto';
        }
        dimensionsSetRef.current = true;
      }

      // Determine type from filename
      const filename = file.name.toLowerCase();
      const typeKeywords = ['xpol_texture', 'xpol', 'ppol_texture', 'ppol', 'lin', 'ref', 'texture', 'composite'];
      const matchedType = typeKeywords.find((kw) => filename.includes(kw));
      let type: string;
      if (matchedType) {
        type = matchedType;
      } else {
        const layerCount = Object.values(layersRef.current).filter((l) => l.type?.startsWith('layer_')).length;
        type = `layer_${layerCount + 1}`;
      }

      // Store pixel data (non-serializable, stays in ref)
      pixelDataMapRef.current[file.name] = rgbPixels;

      dispatch(addLayer({ name: file.name, icon: iconUrl, src: displayUrl, width: tempImg.naturalWidth, height: tempImg.naturalHeight, type }));
    },
    [dispatch, initAnchoredMaskCanvas],
  );

  // ──────────────────── Zoom ────────────────────
  const zoomAround = useCallback((newScale: number, cursorX: number, cursorY: number) => {
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const cursorDocX = cursorX + scrollLeft;
    const cursorDocY = cursorY + scrollTop;

    const canvasElements = document.querySelectorAll<HTMLElement>('.mosaic-canvas');
    const beforeWidth = canvasElements[0]?.clientWidth || 1;
    canvasElements.forEach((el) => { el.style.width = Math.max(100, 100 * newScale) + '%'; });
    const afterWidth = canvasElements[0]?.clientWidth || 1;

    const scaleFactor = afterWidth / beforeWidth;
    const newCursorDocX = cursorDocX * scaleFactor;
    const newCursorDocY = cursorDocY * scaleFactor;

    window.scrollTo({ left: newCursorDocX - cursorX, top: newCursorDocY - cursorY, behavior: 'auto' });
  }, []);

  // ──────────────────── Export: saveSegmentationMap ────────────────────
  const saveSegmentationMap = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    const filenames = Object.keys(layersRef.current);
    const identifier = getCommonSubstring(filenames.map((fn) => getFilename(fn).trim().toLowerCase())).replace(/^_+|_+$/g, '') || Date.now().toString();
    const dataUrl = canvas.toDataURL('image/png');
    downloadDataUrl(dataUrl, `${identifier}_segmentation_map.png`);
  }, []);

  // ──────────────────── updateCursor ────────────────────
  const updateCursor = useCallback((event: Event) => {
    const canvas = drawCanvasRef.current;
    const cursor = cursorRef.current;
    const cursorText = cursorTextRef.current;
    const ctx = drawCtxRef.current;
    if (!canvas || !cursor || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const diameter = drawDiameterRef.current;

    if (event.type === 'scroll') {
      scrollXRef.current = document.documentElement.scrollLeft || document.body.scrollLeft;
      scrollYRef.current = document.documentElement.scrollTop || document.body.scrollTop;
      cursor.style.transform = `translate(${offsetXRef.current + scrollXRef.current - diameter / 2}px, ${offsetYRef.current + scrollYRef.current - diameter / 2}px)`;
    } else {
      const me = event as MouseEvent;
      offsetXRef.current = me.clientX;
      offsetYRef.current = me.clientY;
      mouseXRef.current = Math.round((me.clientX - rect.left) * canvas.width / canvas.clientWidth);
      mouseYRef.current = Math.round((me.clientY - rect.top) * canvas.height / canvas.clientHeight);
      dispatch(setCursorXY({x:mouseXRef.current, y:mouseYRef.current}))
      cursor.style.transform = `translate(${me.clientX + scrollXRef.current - diameter / 2}px, ${me.clientY + scrollYRef.current - diameter / 2}px)`;
    }

    // Check distinct enough for draw path
    function isDistinct(p1: Point, p0: Point): boolean {
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      return Math.sqrt(dx * dx + dy * dy) > diameter;
    }
    if (leftClickedRef.current && drawPathRef.current.length > 0 && isDistinct({ x: mouseXRef.current, y: mouseYRef.current }, drawPathRef.current[drawPathRef.current.length - 1])) {
      drawPathRef.current.push({ x: mouseXRef.current, y: mouseYRef.current });
    }

    // Get pixel colour at cursor
    const imageData = ctx.getImageData(mouseXRef.current, mouseYRef.current, 1, 1);
    const pixel = imageData.data;
    const inverted = rgbToHex(255 - pixel[0], 255 - pixel[1], 255 - pixel[2]);
    const pixelHex = rgbToHex(pixel[0], pixel[1], pixel[2]);
    const activeColour = activeColourRef.current.colour;

    if (activeColour === pixelHex) {
      cursor.style.borderColor = inverted;
    } else {
      cursor.style.borderColor = activeColour;
    }

    // Label display in cursor text
    if (leftClickedRef.current) {
      if (cursorText) cursorText.style.display = 'none';
    } else if (hoveredColourRef.current !== pixelHex) {
      if (pixelHex === '#000000') {
        if (cursorText) cursorText.style.display = 'none';
      } else if (activeColour !== pixelHex) {
        const label = colourLabelMapRef.current[pixelHex];
        if (label && cursorText) {
          cursorText.style.display = 'block';
          cursorText.style.color = inverted;
          cursorText.textContent = label;
        }
      } else {
        if (cursorText) cursorText.style.display = 'none';
      }
      hoveredColourRef.current = pixelHex;
    }
  }, []);

  // ──────────────────────────────────────────────────────────
  //  Anchoring sync: update mask when anchoredColours changes
  // ──────────────────────────────────────────────────────────
  useEffect(() => {
    const ctx = drawCtxRef.current;
    const maskCtx = anchoredMaskCtxRef.current;
    const canvas = drawCanvasRef.current;
    if (!ctx || !maskCtx || !canvas) return;
    updateAnchoredMask(ctx, maskCtx as CanvasRenderingContext2D, canvas.width, canvas.height, anchoredColours, activeDrawLabelColour.colour);
  }, [anchoredColours, activeDrawLabelColour]);

  // ──────────────────────────────────────────────────────────
  //  Highlight → reclass: when active colour changes while mask exists
  // ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (highlightedMaskRef.current && drawCtxRef.current && drawCanvasRef.current) {
      saveState();
      applyActiveColourToHighlighted(
        drawCtxRef.current,
        drawCanvasRef.current.width,
        drawCanvasRef.current.height,
        highlightedMaskRef.current,
        activeDrawLabelColour.colour,
      );
      highlightedMaskRef.current = null;
      clearSvgGroup();
    }
  }, [activeDrawLabelColour, saveState, clearSvgGroup]);

  // ──────────────────────────────────────────────────────────
  //  Active layer change → update base image
  // ──────────────────────────────────────────────────────────
  useEffect(() => {
    const baseImg = baseImageRef.current;
    if (!baseImg || !activeLayerName) return;
    const layer = layers[activeLayerName];
    if (layer) {
      baseImg.src = layer.src;
    }
  }, [activeLayerName, layers]);

  // ──────────────────────────────────────────────────────────
  //  MOUNT EFFECT: sets up all imperative event listeners + anim loop
  // ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    // Get context
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawCtxRef.current = ctx;

    // Initial dimensions
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Init anchored mask
    initAnchoredMaskCanvas();

    // ═══════════ EVENT HANDLERS ═══════════

    // --- mousedown on drawCanvas ---
    const onMouseDown = (e: MouseEvent) => {
      const cursorText = cursorTextRef.current;
      if (cursorText) cursorText.style.display = 'none';
      saveState();

      const rect = canvas.getBoundingClientRect();
      const x = Math.round((e.clientX - rect.left) * canvas.width / canvas.clientWidth);
      const y = Math.round((e.clientY - rect.top) * canvas.height / canvas.clientHeight);

      if (e.button === 0) { // left click
        leftClickedRef.current = true;
        drawPathRef.current.push({ x: mouseXRef.current, y: mouseYRef.current });

        const mode = interactionModeRef.current;
        if (mode === 'draw') {
          scrollXRef.current = document.documentElement.scrollLeft;
          scrollYRef.current = document.documentElement.scrollTop;

          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('stroke', activeColourRef.current.colour);
          path.setAttribute('stroke-width', String(drawDiameterRef.current));
          path.setAttribute('fill', 'none');
          path.setAttribute('stroke-linecap', 'round');
          path.setAttribute('stroke-linejoin', 'round');

          const canvasScale = canvas.width / canvas.clientWidth;
          const d = `M ${(mouseXRef.current / canvasScale) - scrollXRef.current} ${(mouseYRef.current / canvasScale) - scrollYRef.current}`;
          path.setAttribute('d', d);
          svgScaleGroupRef.current?.appendChild(path);
          svgPathRef.current = path;

        } else if (mode === 'select') {
          const imgData = ctx.getImageData(mouseXRef.current, mouseYRef.current, 1, 1);
          const pixel = imgData.data;
          const selectedColour = rgbToHex(pixel[0], pixel[1], pixel[2]);
          highlightedMaskRef.current = createHighlightMask(ctx, canvas.width, canvas.height, selectedColour);
          const label = colourLabelMapRef.current[selectedColour];
          if (label) {
            dispatch(setStatusText(label + ' selected .'));
          }

        } else if (mode === 'pen') {
          e.preventDefault();
          if (cursorText) cursorText.style.display = 'none';

          const clickedPointIndex = getPointAtPosition(x, y);
          if (clickedPointIndex !== -1) {
            penIsDraggingRef.current = true;
            penDraggedPointIndexRef.current = clickedPointIndex;
          } else {
            const insertIndex = getLineInsertIndex(x, y);
            if (insertIndex !== -1) {
              penPointsRef.current.splice(insertIndex, 0, { x, y });
            } else {
              penPointsRef.current.push({ x, y });
            }
            updatePenDisplay();
          }
        }
        // fill mode: just pushes to drawPath (fill happens on mouseup)

      } else if (e.button === 2 && !leftClickedRef.current) { // right click
        const mode = interactionModeRef.current;
        if (mode === 'pen') {
          const clickedPointIndex = getPointAtPosition(x, y);
          if (clickedPointIndex !== -1) {
            penPointsRef.current.splice(clickedPointIndex, 1);
            updatePenDisplay();
          }
        } else if (mode === 'draw') {
          drawPathRef.current.push({ x: mouseXRef.current, y: mouseYRef.current });
          scrollXRef.current = document.documentElement.scrollLeft;
          scrollYRef.current = document.documentElement.scrollTop;

          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('stroke', '#000000');
          path.setAttribute('stroke-width', String(drawDiameterRef.current));
          path.setAttribute('fill', 'none');
          path.setAttribute('stroke-linecap', 'round');
          path.setAttribute('stroke-linejoin', 'round');

          const canvasScale = canvas.width / canvas.clientWidth;
          const d = `M ${(mouseXRef.current / canvasScale) - scrollXRef.current} ${(mouseYRef.current / canvasScale) - scrollYRef.current}`;
          path.setAttribute('d', d);
          svgScaleGroupRef.current?.appendChild(path);
          svgPathRef.current = path;
        }
        rightClickedRef.current = true;
      } else if (e.button === 1) { // middle click — pan
        e.preventDefault();
        middleClickedRef.current = true;
        panStartRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    // --- mouseup on drawCanvas ---
    const onMouseUp = (e: MouseEvent) => {
      const mode = interactionModeRef.current;

      if (mode === 'pen' && !penIsDraggingRef.current) return;

      if (leftClickedRef.current) {
        switch (mode) {
          case 'fill':
            drawPathRef.current.forEach((point) => {
              floodFill(ctx, canvas.width, canvas.height, point.x, point.y, activeColourRef.current.colour, 'replace');
            });
            doReapplyAnchoredMask();
            break;
          case 'draw':
            if (svgPathRef.current) {
              const pathData = svgPathRef.current.getAttribute('d');
              svgScaleGroupRef.current?.removeChild(svgPathRef.current);
              svgPathRef.current = null;
              if (pathData) drawSVGPathToCanvas(pathData);
            }
            break;
          case 'pen':
            penIsDraggingRef.current = false;
            penDraggedPointIndexRef.current = -1;
            // Don't reset drawPath etc for pen
            leftClickedRef.current = false;
            return;
          default:
            break;
        }
      } else if (rightClickedRef.current) {
        if (mode === 'draw') {
          if (svgPathRef.current) {
            const pathData = svgPathRef.current.getAttribute('d');
            svgScaleGroupRef.current?.removeChild(svgPathRef.current);
            svgPathRef.current = null;
            if (pathData) eraseSVGPathFromCanvas(pathData);
          }
        }
      }

      drawPathRef.current = [];
      leftClickedRef.current = false;
      rightClickedRef.current = false;
    };

    // --- mouseup on window (pen transform end + middle-click pan) ---
    const onWindowMouseUp = (e: MouseEvent) => {
      if (e.button === 1) {
        middleClickedRef.current = false;
        return;
      }
      const mode = interactionModeRef.current;
      if (mode === 'pen') {
        if (penIsDraggingRef.current) {
          penIsDraggingRef.current = false;
          penDraggedPointIndexRef.current = -1;
        }
        if (penIsTransformingRef.current) {
          penIsTransformingRef.current = false;
          transformTypeRef.current = '';
          originalPenPointsRef.current = penPointsRef.current.map((p) => ({ ...p }));
        }
      }
    };

    // --- mouseleave on drawCanvas ---
    const onMouseLeave = (e: MouseEvent) => {
      const cursor = cursorRef.current;
      if (cursor) cursor.style.display = 'none';

      const mode = interactionModeRef.current;
      switch (mode) {
        case 'draw':
          if (leftClickedRef.current || rightClickedRef.current) {
            if (svgPathRef.current) {
              svgScaleGroupRef.current?.removeChild(svgPathRef.current);
              svgPathRef.current = null;
            }
            drawPathRef.current.push({ x: mouseXRef.current, y: mouseYRef.current });
            drawPathRef.current = solidifyPath(drawPathRef.current);
          }
          break;
        case 'fill':
          drawPathRef.current.forEach((point) => {
            floodFill(ctx, canvas.width, canvas.height, point.x, point.y, activeColourRef.current.colour, 'replace');
          });
          break;
        default:
          break;
      }
      drawPathRef.current = [];
      leftClickedRef.current = false;
      rightClickedRef.current = false;
    };

    // --- mouseenter on drawCanvas ---
    const onMouseEnter = (e: MouseEvent) => {
      const cursor = cursorRef.current;
      if (cursor) cursor.style.display = 'block';
    };

    // --- mousemove on window ---
    const onWindowMouseMove = (e: MouseEvent) => {
      if (middleClickedRef.current) {
        const dx = panStartRef.current.x - e.clientX;
        const dy = panStartRef.current.y - e.clientY;
        window.scrollBy(dx, dy);
        panStartRef.current = { x: e.clientX, y: e.clientY };
        updateCursor(e);
        return;
      }
      const mode = interactionModeRef.current;
      if (mode === 'pen') {
        const rect = canvas.getBoundingClientRect();
        const x = Math.round((e.clientX - rect.left) * canvas.width / canvas.clientWidth);
        const y = Math.round((e.clientY - rect.top) * canvas.height / canvas.clientHeight);

        if (penIsDraggingRef.current && penDraggedPointIndexRef.current !== -1) {
          penPointsRef.current[penDraggedPointIndexRef.current] = { x, y };
          updatePenDisplay();
        } else if (penIsTransformingRef.current) {
          performPenShapeTransform(x, y);
        }
      }
      updateCursor(e);
    };

    // --- scroll on window ---
    const onWindowScroll = (event: Event) => {
      const mode = interactionModeRef.current;
      if (mode === 'pen') updatePenDisplay();
      leftClickedRef.current = false;
      rightClickedRef.current = false;
      updateCursor(event);
    };

    // --- wheel on drawCanvas ---
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY;
        const scaleChange = 1 + delta * -0.01;
        let newScale = scaleRef.current * scaleChange;
        newScale = Math.min(Math.max(1, newScale), 20);
        scaleRef.current = newScale;
        dispatch(setScale(newScale));
        zoomAround(newScale, e.clientX, e.clientY);
      } else if (!isGesturingRef.current) {
        window.scrollBy({ left: e.deltaX, top: e.deltaY, behavior: 'auto' });
      }
    };

    // --- gesture events (Mac trackpad) ---
    const onGestureStart = (e: Event) => {
      e.preventDefault();
      isGesturingRef.current = true;
    };
    const onGestureChange = (e: any) => {
      e.preventDefault();
      if (isGesturingRef.current) {
        let newScale = scaleRef.current * e.scale;
        newScale = Math.min(Math.max(0.5, newScale), 16);
        scaleRef.current = newScale;
        dispatch(setScale(newScale));
        zoomAround(newScale, mouseXRef.current, mouseYRef.current);
      }
    };
    const onGestureEnd = (e: Event) => {
      e.preventDefault();
      isGesturingRef.current = false;
    };

    // --- drag & drop ---
    const catchDrag = (e: DragEvent) => {
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      e.preventDefault();
    };
    const onDrop = async (e: DragEvent) => {
      // Only reset dimensions if no layers exist yet (first load)
      if (Object.keys(layersRef.current).length === 0) {
        dimensionsSetRef.current = false;
      }
      e.preventDefault();
      if (!e.dataTransfer?.files) return;

      const files = Array.from(e.dataTransfer.files);
      const promises = files.map((file) => {
        if (file.name.includes('segmentation')) {
          return processSegmentationLayer(file);
        } else {
          return processImageLayer(file);
        }
      });

      await Promise.all(promises);

      // After all processed, set first layer active
      // We need to read the store directly after dispatches settle,
      // but since dispatches are synchronous in Redux, we just use
      // the first file name.
      const imageFileNames = files.filter((f) => !f.name.includes('segmentation')).map((f) => f.name);
      if (imageFileNames.length > 0) {
        dispatch(setActiveLayer(imageFileNames[0]));
      }
      dispatch(setHasLayers(true));
    };

    // --- keyboard events ---
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        canvas.style.opacity = '0';
      }
      if (e.key === 's') {
        e.preventDefault();
        canvas.style.opacity = '1';
      }
      if (e.ctrlKey && e.key === 'z') {
        undo();
      }
      if (e.key === 'Escape') {
        // Hide toolbar dropdowns
        document.querySelectorAll('.toolbar-list-items').forEach((item) => {
          if (!item.classList.contains('hidden')) item.classList.add('hidden');
        });
        document.querySelectorAll('.search-box').forEach((box) => {
          if (!box.classList.contains('hidden')) box.classList.add('hidden');
        });
      }

      // Layer cycling (only when search box not active)
      const searchBox = document.querySelector('.search-box') as HTMLElement | null;
      const searchVisible = searchBox?.style.display === 'block';
      if (!searchVisible) {
        if (e.key === 'ArrowRight' || e.key === 'd') {
          // Cycle forward
          const keys = Object.keys(layersRef.current);
          if (keys.length >= 2) {
            const idx = keys.indexOf(activeLayerNameRef.current);
            const newIdx = (idx + 1 + keys.length) % keys.length;
            dispatch(setActiveLayer(keys[newIdx]));
          }
        }
        if (e.key === 'ArrowLeft' || e.key === 'a') {
          const keys = Object.keys(layersRef.current);
          if (keys.length >= 2) {
            const idx = keys.indexOf(activeLayerNameRef.current);
            const newIdx = (idx - 1 + keys.length) % keys.length;
            dispatch(setActiveLayer(keys[newIdx]));
          }
        }
      }

      // Pen mode shortcuts
      if (interactionModeRef.current === 'pen') {
        if (e.key === 'Enter') { e.preventDefault(); rasterizePenShape(); }
        else if (e.key === 'Escape') { e.preventDefault(); clearPenMode(); }
        else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); erasePenShape(); }
        else if (e.key === 'c') { cropPenShape(); }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.code === 'Space' || e.key === 's') {
        canvas.style.opacity = '0.5';
      }
    };

    // --- context menu (disable right click menu on canvas) ---
    const onContextMenu = (e: MouseEvent) => { e.preventDefault(); };

    // --- Custom events for exports ---
    const onSaveSegMap = () => saveSegmentationMap();

    // ═══════════ REGISTER LISTENERS ═══════════

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('mouseenter', onMouseEnter);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', onContextMenu);
    canvas.addEventListener('dragenter', catchDrag);
    canvas.addEventListener('dragover', catchDrag);
    canvas.addEventListener('drop', onDrop);
    canvas.addEventListener('gesturestart', onGestureStart);
    canvas.addEventListener('gesturechange', onGestureChange);
    canvas.addEventListener('gestureend', onGestureEnd);

    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
    window.addEventListener('scroll', onWindowScroll);

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    window.addEventListener('save-segmentation-map', onSaveSegMap);
    const onUndoEvent = () => undo();
    window.addEventListener('undo', onUndoEvent);

    // ═══════════ ANIMATION LOOP ═══════════
    let animId: number;
    function drawLoop() {
      const mode = interactionModeRef.current;
      if (mode === 'draw') {
        const c = drawCanvasRef.current;
        if ((leftClickedRef.current || rightClickedRef.current) && svgPathRef.current && c) {
          const scrollX = document.documentElement.scrollLeft;
          const scrollY = document.documentElement.scrollTop;
          const canvasScale = c.width / c.clientWidth;
          const currentPath = svgPathRef.current.getAttribute('d');
          const mx = mouseXRef.current;
          const my = mouseYRef.current;
          svgPathRef.current.setAttribute('d', `${currentPath} L ${(mx / canvasScale) - scrollX} ${(my / canvasScale) - scrollY}`);
        }
      }
      animId = requestAnimationFrame(drawLoop);
    }
    animId = requestAnimationFrame(drawLoop);

    // ═══════════ CLEANUP ═══════════
    return () => {
      cancelAnimationFrame(animId);

      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      canvas.removeEventListener('mouseenter', onMouseEnter);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', onContextMenu);
      canvas.removeEventListener('dragenter', catchDrag);
      canvas.removeEventListener('dragover', catchDrag);
      canvas.removeEventListener('drop', onDrop);
      canvas.removeEventListener('gesturestart', onGestureStart);
      canvas.removeEventListener('gesturechange', onGestureChange);
      canvas.removeEventListener('gestureend', onGestureEnd);

      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
      window.removeEventListener('scroll', onWindowScroll);

      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);

      window.removeEventListener('save-segmentation-map', onSaveSegMap);
      window.removeEventListener('undo', onUndoEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount-only

  // ──────────────────────────────────────────────────────────
  //  Pen mode init/cleanup when interactionMode changes
  // ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (interactionMode === 'pen') {
      initPenMode();
    } else {
      // If leaving pen mode, clean up
      clearPenMode();
    }
  }, [interactionMode, initPenMode, clearPenMode]);

  // ──────────────────── RENDER ────────────────────
  return (
    <>
      <div id="cursor" ref={cursorRef}>
        <div id="cursor-text" ref={cursorTextRef}></div>
      </div>
      <img
        className="mosaic-canvas"
        id="base-image"
        ref={baseImageRef}
        style={{ position: 'absolute' }}
        alt=""
      />
      <canvas
        className="mosaic-canvas"
        id="draw-canvas"
        ref={drawCanvasRef}
      />
      <svg
        className="mosaic-canvas"
        id="svg-canvas"
        ref={svgCanvasRef}
      >
        <g transform="scale(1)" id="svg-scale-group" ref={svgScaleGroupRef}></g>
      </svg>
      {pendingSegImport && (
        <SegMapImportDialog
          colors={pendingSegImport.colors}
          onConfirm={applySegmentationImport}
          onCancel={cancelSegmentationImport}
        />
      )}
    </>
  );
};

export default Stage;
