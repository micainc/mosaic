import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface LayerMeta {
  icon: string;
  src: string;
  width: number;
  height: number;
  type: string;
  opacity: number;
}

interface ImageLayersState {
  layers: Record<string, LayerMeta>;
  activeLayerName: string;
}

const initialState: ImageLayersState = {
  layers: {},
  activeLayerName: '',
};

const imageLayersSlice = createSlice({
  name: 'imageLayers',
  initialState,
  reducers: {
    addLayer(
      state,
      action: PayloadAction<{
        name: string;
        icon: string;
        src: string;
        width: number;
        height: number;
        type: string;
      }>
    ) {
      const { name, icon, src, width, height, type } = action.payload;
      state.layers[name] = { icon, src, width, height, type, opacity: 1 };
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
});

export const { addLayer, setActiveLayer, cycleActiveLayer, clearLayers, removeLayer, setLayerOpacity } =
  imageLayersSlice.actions;

export default imageLayersSlice.reducer;
