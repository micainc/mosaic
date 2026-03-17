import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { InteractionMode } from '../types';

interface CanvasState {
  interactionMode: InteractionMode;
  drawDiameter: number;
  scale: number;
  canvasWidth: number;
  canvasHeight: number;
  hasLayers: boolean;
  statusText: string;
  cursorX: number;
  cursorY: number;
}

const initialState: CanvasState = {
  interactionMode: 'draw',
  drawDiameter: 10,
  scale: 1,
  canvasWidth: window.innerWidth,
  canvasHeight: window.innerHeight,
  hasLayers: false,
  statusText: '',
  cursorX:0,
  cursorY:0,
};

const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    setInteractionMode(state, action: PayloadAction<InteractionMode>) {
      state.interactionMode = action.payload;
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
    setHasLayers(state, action: PayloadAction<boolean>) {
      state.hasLayers = action.payload;
    },
    setStatusText(state, action: PayloadAction<string>) {
      state.statusText = action.payload;
    },
    setCursorXY(state, action: PayloadAction<{x: number; y:number}>) {
      state.cursorX = action.payload.x;
      state.cursorY = action.payload.y;

    },
  },
});

export const {
  setInteractionMode,
  setDrawDiameter,
  setScale,
  setCanvasDimensions,
  setHasLayers,
  setStatusText,
  setCursorXY
} = canvasSlice.actions;

export default canvasSlice.reducer;
