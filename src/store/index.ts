import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import canvasSlice from './canvasSlice';
import imageLayersSlice from './imageLayersSlice';
import labelsSlice from './labelsSlice';

export const store = configureStore({
  reducer: {
    canvas: canvasSlice,
    imageLayers: imageLayersSlice,
    labels: labelsSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
