import { createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit';

import { AMALGAM_COLOURS, QEMSCAN_COLOURS, BOLIDEN_LEGEND_COLOURS, LEGACY_COLOURS } from '../data/loadouts';
import { LabelColourMap, MineralRecord } from '../types';

export type LABEL_ID = number;
export type LOADOUT_ID = string;
export type UNIX_EPOCH_TIMESTAMP = number;

/**
 * Labels are addressed by numeric id everywhere. A loadout is a fixed table of
 * id -> MineralRecord; the id is the permanent training label, the colour is
 * only how the canvas paints it. Anything keyed by colour (the draw canvas,
 * anchoring masks, imported seg maps) goes through the derived selectors below.
 */
export interface LabelsState {
  loadouts: Record<LOADOUT_ID, Record<LABEL_ID, MineralRecord>>;
  activeLoadout: LOADOUT_ID;
  activeLabel: LABEL_ID;
  /** Sparse: every label selected this session and when it was last selected. */
  used: Record<LABEL_ID, UNIX_EPOCH_TIMESTAMP>;
  /** Anchored (protected) labels and the colour they were anchored with. */
  anchored: Record<LABEL_ID, string>;
}

const DEFAULT_LABEL: Record<LOADOUT_ID, LABEL_ID> = { AMALGAM: 3, LEGACY: 3 }; // start on quartz

const firstId = (loadout: Record<LABEL_ID, MineralRecord>): LABEL_ID =>
  Number(Object.keys(loadout)[0] ?? 0);

/** Canvas colours are 6-digit; drop any alpha suffix (e.g. unknown's #00000000). */
const canvasHex = (colour: string) => colour.slice(0, 7).toUpperCase();

const initialState: LabelsState = {
  loadouts: {
    AMALGAM: AMALGAM_COLOURS,
    QEMSCAN: QEMSCAN_COLOURS,
    BOLIDEN: BOLIDEN_LEGEND_COLOURS,
    LEGACY: LEGACY_COLOURS,
  },
  activeLoadout: 'AMALGAM',
  activeLabel: DEFAULT_LABEL.AMALGAM,
  used: { [DEFAULT_LABEL.AMALGAM]: Date.now() },
  anchored: {},
};

const activeLoadoutOf = (s: LabelsState) => s.loadouts[s.activeLoadout];

export const labelsSlice = createSlice({
  name: 'labels',
  initialState,
  reducers: {
    /** Switch loadout. Ids are per-loadout, so usage and anchors reset. */
    setActiveLoadout(state, action: PayloadAction<LOADOUT_ID>) {
      const name = action.payload;
      const loadout = state.loadouts[name];
      if (!loadout) return;
      state.activeLoadout = name;
      state.activeLabel = DEFAULT_LABEL[name] ?? firstId(loadout);
      state.used = { [state.activeLabel]: Date.now() };
      state.anchored = {};
    },

    setActiveLabel(state, action: PayloadAction<LABEL_ID>) {
      const id = action.payload;
      if (!state.loadouts[state.activeLoadout][id]) return;
      state.activeLabel = id;
      state.used[id] = Date.now();
    },

    setUsed(state, action:PayloadAction<{id:LABEL_ID, ts:UNIX_EPOCH_TIMESTAMP}>) {
      const {id, ts} = action.payload;
      state.used[id] = ts;
    },

    toggleAnchoredColour(state, action: PayloadAction<LABEL_ID>) {
      const id = action.payload;
      if (state.anchored[id] !== undefined) {
        delete state.anchored[id];
      } else {
        const record = state.loadouts[state.activeLoadout][id];
        if (record) state.anchored[id] = record.colour;
      }
    },

    clearAnchoredColours(state) {
      state.anchored = {};
    },
  },
  // Receive the slice state; RTK binds them to the root state on export.
  selectors: {
    loadouts: s => s.loadouts,
    activeLoadoutName: s => s.activeLoadout,
    activeLoadout: activeLoadoutOf,
    activeLabelId: s => s.activeLabel,
    activeLabel: (s): MineralRecord => s.loadouts[s.activeLoadout][s.activeLabel],
    used: s => s.used,
    anchored: s => s.anchored,

    // ──────────────────── Derived (memoised) ────────────────────

    /** All records of the active loadout in id order. */
    labelList: createSelector([activeLoadoutOf], loadout => Object.values(loadout)),

    /**
     * Bidirectional colour <-> name map for the active loadout, the shape the
     * canvas, stats and seg-map import consume.
     */
    colourLabelMap: createSelector([activeLoadoutOf], (loadout): LabelColourMap => {
      const map: LabelColourMap = {};
      for (const r of Object.values(loadout)) {
        const hex = canvasHex(r.colour);
        map[hex] = r.name;
        map[r.name] = hex;
      }
      return map;
    }),

    /** Anchored labels keyed by canvas colour, for the anchoring mask utilities. */
    anchoredByColour: createSelector(
      [(s: LabelsState) => s.anchored, activeLoadoutOf],
      (anchored, loadout): Record<string, string> => {
        const out: Record<string, string> = {};
        for (const id of Object.keys(anchored)) {
          const r = loadout[Number(id)];
          if (r) out[canvasHex(r.colour)] = r.name;
        }
        return out;
      },
    ),
  },
});

export const {
  setActiveLoadout,
  setActiveLabel,
  setUsed,
  toggleAnchoredColour,
  clearAnchoredColours,
} = labelsSlice.actions;

export default labelsSlice.reducer;
