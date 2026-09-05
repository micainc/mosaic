import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RoiType } from '../types';



interface RoisState {
  rois: Record<number, RoiType>;
  activeRoiId: number;
}

const initialState: RoisState = {
  rois: {},
  activeRoiId: -1,
};

const roiSlice = createSlice({
  name: 'rois',
  initialState,
    reducers: {
        setActiveRoiId: (state, action: PayloadAction<number>) => {
            state.activeRoiId = action.payload;
        },
        
        addRoi: (state, action: PayloadAction<RoiType>) => {
            const newId = Object.entries(state.rois).length;
            state.rois[newId] = {...action.payload, roiId: newId}
            state.activeRoiId = newId;
        },

        updateRoi: (state, action: PayloadAction<{id: number; updates: Partial<RoiType>}>) => {
            const prev = state.rois[action.payload.id];
            if(prev) {
                state.rois[action.payload.id] = {...prev, ...action.payload.updates}
            }
        }

    }
});

export const { setActiveRoiId, addRoi, updateRoi} = roiSlice.actions;
export default roiSlice.reducer;