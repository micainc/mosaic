import { configureStore } from '@reduxjs/toolkit';
import { useSelector, TypedUseSelectorHook } from 'react-redux';
import canvasSlice from './canvasSlice';
import tooltipSlice from './tooltipSlice';
import imageLayersSlice from './imageLayersSlice';
import labelsSlice from './labelsSlice';
import roiSlice from './roiSlice';
import polygonsSlice from './polygonsSlice';
export const store = configureStore({
  reducer: {
    tooltip: tooltipSlice,
    canvas: canvasSlice,
    imageLayers: imageLayersSlice,
    labels: labelsSlice,
    rois: roiSlice,
    polygons: polygonsSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
