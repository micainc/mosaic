import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { InteractionMode } from '../types';

/** Units the scale bar can display lengths in. px and % need no calibration. */
export type DisplayUnit = 'px' | '%' | 'nm' | 'µm' | 'mm' | 'mil' | 'in';

/** Micrometres per unit, for converting from the stored µm/px factor. */
export const UNIT_IN_UM: Record<Exclude<DisplayUnit, 'px' | '%'>, number> = {
  nm: 0.001,
  'µm': 1,
  mm: 1000,
  mil: 25.4,
  in: 25400,
};

interface StageState {
  mode: InteractionMode;
  drawDiameter: number;
  scale: number;
  canvasWidth: number;
  canvasHeight: number;
  status: string;
  cursorX: number;
  cursorY: number;
  /** Physical size of one pixel in micrometres. Null = uncalibrated. */
  pixelSize: number | null;
  displayUnit: DisplayUnit;
}

const initialState: StageState = {
  mode: 'draw',
  drawDiameter: 10,
  scale: 1,
  canvasWidth: window.innerWidth,
  canvasHeight: window.innerHeight,
  status: '',
  cursorX:0,
  cursorY:0,
  pixelSize: 1,
  displayUnit: '%',
};

export const stageSlice = createSlice({
  name: 'stage',
  initialState,
  reducers: {

    setMode(state, action: PayloadAction<InteractionMode>) {
      state.mode = action.payload;
    },
    setDrawDiameter(state, action: PayloadAction<number>) {
      state.drawDiameter = action.payload;
    },
    setScale(state, action: PayloadAction<number>) {
      state.scale = action.payload;
    },
    setCanvasDimensions(state, action: PayloadAction<{ width: number; height: number }>) {
      state.canvasWidth = action.payload.width;
      state.canvasHeight = action.payload.height;
    },
    setStatus(state, action: PayloadAction<string>) {
      state.status = action.payload;
    },
    setCursorXY(state, action: PayloadAction<{x: number; y:number}>) {
      state.cursorX = action.payload.x;
      state.cursorY = action.payload.y;

    },
    setPixelSize(state, action: PayloadAction<number | null>) {
      state.pixelSize = action.payload;
    },
    setDisplayUnit(state, action: PayloadAction<DisplayUnit>) {
      state.displayUnit = action.payload;
    },
  },
    selectors: {
      mode: s => s.mode,
      cursorX: s => s.cursorX,
      cursorY: s => s.cursorY, 
      canvasWidth: s => s.canvasWidth,
      canvasHeight: s => s.canvasHeight,
      drawDiameter: s => s.drawDiameter,
      scale: s=> s.scale,
      status: s => s.status,
      pixelSize: s => s.pixelSize,
      displayUnit: s => s.displayUnit,
    },
});

export const {
  setMode,
  setDrawDiameter,
  setScale,
  setCanvasDimensions,
  setStatus,
  setCursorXY,
  setPixelSize,
  setDisplayUnit,
} = stageSlice.actions;

export default stageSlice.reducer;
