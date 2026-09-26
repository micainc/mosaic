import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import canvasSlice from './canvasSlice';
import tooltipSlice from './tooltipSlice';
import imageLayersSlice from './imageLayersSlice';
import labelsSlice from './labelsSlice';
import polygonsSlice from './polygonsSlice';

export const store = configureStore({
  reducer: {
    tooltip: tooltipSlice,
    canvas: canvasSlice,
    imageLayers: imageLayersSlice,
    labels: labelsSlice,
    polygons: polygonsSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const rdxi = useDispatch.withTypes<AppDispatch>(); // redux write / input
export const rdxo = useSelector.withTypes<RootState>(); // redux read / output
