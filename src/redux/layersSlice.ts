import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface LayerType {
  name: string;
  icon: string;
  src: string;
  width: number;
  height: number;
  type: string;
  opacity: number;
}

interface LayersState {
  layers: Record<string, LayerType>;
  activeLayerName: string;
}

const initialState: LayersState = {
  layers: {},
  activeLayerName: '',
};

export const layersSlice = createSlice({
  name: 'layers',
  initialState,
  reducers: {
    addLayer(state, action: PayloadAction<LayerType>) {
      const { name, icon, src, width, height, type } = action.payload;
      state.layers[name] = { name, icon, src, width, height, type, opacity: 1 };
    },
    setActiveLayer(state, action: PayloadAction<string>) {
      state.activeLayerName = action.payload;
    },
    cycleActiveLayer(state, action: PayloadAction<number>) {
      const keys = Object.keys(state.layers);
      if (keys.length === 0) return;
      const currentIndex = keys.indexOf(state.activeLayerName);
      const direction = action.payload;
      let nextIndex = (currentIndex + direction) % keys.length;
      if (nextIndex < 0) nextIndex += keys.length;
      state.activeLayerName = keys[nextIndex];
    },
    removeLayer(state, action: PayloadAction<string>) {
      delete state.layers[action.payload];
      if (state.activeLayerName === action.payload) {
        const keys = Object.keys(state.layers);
        state.activeLayerName = keys.length > 0 ? keys[0] : '';
      }
    },
    setLayerOpacity(state, action: PayloadAction<{ name: string; opacity: number }>) {
      if (state.layers[action.payload.name]) {
        state.layers[action.payload.name].opacity = action.payload.opacity;
      }
    },
    clearLayers(state) {
      state.layers = {};
      state.activeLayerName = '';
    },
  },
  selectors: {
    layers: s => s.layers,
    layersCount: s => Object.keys(s.layers).length,
    activeLayerName: s => s.activeLayerName,
    /** Undefined until a layer is loaded. */
    activeLayer: (s): LayerType | undefined => s.layers[s.activeLayerName],
  },
});

export const {
  addLayer,
  setActiveLayer,
  cycleActiveLayer,
  removeLayer,
  setLayerOpacity,
  clearLayers,
} = layersSlice.actions;

export default layersSlice.reducer;
