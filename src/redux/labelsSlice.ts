import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { defaultLoadouts } from '../data/loadouts';

interface LabelsState {
  loadouts: Record<string, string[]>;
  activeLoadout: string;
  colourLabelMap: Record<string, string>;
  activeLabel: { colour: string; label: string };
  anchoredColours: Record<string, string>;
}

const initialState: LabelsState = {
  loadouts: defaultLoadouts,
  activeLoadout: 'minerals',
  colourLabelMap: {},
  activeLabel: { colour: '#000000', label: '' },
  anchoredColours: {},
};

const labelsSlice = createSlice({
  name: 'labels',
  initialState,
  reducers: {
    setActiveLoadout(state, action: PayloadAction<string>) {
      state.activeLoadout = action.payload;
    },
    setColourLabelMap(state, action: PayloadAction<Record<string, string>>) {
      state.colourLabelMap = action.payload;
    },

    setActiveLabel(
      state,
      action: PayloadAction<{ colour: string; label: string }>
    ) {
      state.activeLabel = action.payload;
    },
    toggleAnchoredColour(
      state,
      action: PayloadAction<{ colour: string; label: string }>
    ) {
      const { colour, label } = action.payload;
      if (state.anchoredColours[colour]) {
        delete state.anchoredColours[colour];
      } else {
        state.anchoredColours[colour] = label;
      }
    },
    clearAnchoredColours(state) {
      state.anchoredColours = {};
    },
  },
});

export const {
  setActiveLoadout,
  setColourLabelMap,
  setActiveLabel,
  toggleAnchoredColour,
  clearAnchoredColours,
} = labelsSlice.actions;

export default labelsSlice.reducer;
