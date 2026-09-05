import { createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { PolygonType } from '../types';
import { RootState } from './store';

interface PolygonsState {
  polygons: PolygonType[];
  selected: string[];  // multiselectable polygons - selectable ids
}

const initialState: PolygonsState = {
  polygons:[],
  selected:[],
};

const polygonsSlice = createSlice({
  name: 'polygons',
  initialState,
  reducers: {
    // ─── CRUD ───
    addPolygon(state, action: PayloadAction<PolygonType>) {
      const polyId = action.payload.id
      state.polygons.push(action.payload);
      state.selected.push(polyId)
    },
    updatePolygon(state, action: PayloadAction<Partial<PolygonType> & {id:string}>) {
      const poly = state.polygons.find(p => p.id === action.payload.id);
      if (poly) Object.assign(poly, action.payload);
    },
    deletePolygon(state, action: PayloadAction<string>) {
      state.polygons = state.polygons.filter(p => p.id !== action.payload);
      state.selected = state.selected.filter(id => id !== action.payload);
    },
    deleteSelected(state) {
      const sel = new Set(state.selected);
      state.polygons = state.polygons.filter(p => !sel.has(p.id));
      state.selected = [];
    },
    setPolygons(state, action: PayloadAction<PolygonType[]>) {
      state.polygons = action.payload;
      const ids = new Set(action.payload.map(p => p.id));
      state.selected = state.selected.filter(id => ids.has(id));
    },
    clearPolygons(state) {
      state.polygons = [];
      state.selected = [];
    },

    // ─── Selection ───
    selectOnly(state, action: PayloadAction<string>) {      // plain click: replace selection
      state.selected = [action.payload];
    },
    toggleSelected(state, action: PayloadAction<string>) {  // ctrl/cmd-click: add or remove
      const id = action.payload;
      state.selected = state.selected.includes(id)
        ? state.selected.filter(x => x !== id)
        : [...state.selected, id];
    },
    selectAll(state) {
      state.selected = state.polygons.map(p => p.id);
    },
    clearSelection(state) {
      state.selected = [];
    },
  },
  selectors: {
    getPolygonById: (state, id: string) => state.polygons.find(p => p.id === id),
    getSelectedPolygons: createSelector(
      [(state: PolygonsState) => state.polygons, (state: PolygonsState) => state.selected],
      (polygons, selected) => {
        const ids = new Set(selected);
        return polygons.filter(p => ids.has(p.id));
      },
    ),
  }
});




export const {
  addPolygon,
  updatePolygon,
  deletePolygon,
  deleteSelected,
  setPolygons,
  clearPolygons,
  selectOnly,
  toggleSelected,
  selectAll,
  clearSelection,
  
} = polygonsSlice.actions;

export const { getPolygonById, getSelectedPolygons } = polygonsSlice.selectors;

export default polygonsSlice.reducer;

