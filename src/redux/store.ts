import { bindActionCreators, configureStore } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';
import stageReducer, { stageSlice } from './stageSlice';
import tooltipReducer, { tooltipSlice } from './tooltipSlice';
import layersReducer, { layersSlice } from './layersSlice';
import labelsReducer, { labelsSlice } from './labelsSlice';
import polygonsReducer, { polygonsSlice } from './polygonsSlice';

type Selector = (s: RootState, ...args: any[]) => unknown;

// Each hook takes the selector's extra arguments (if any), e.g. usePolygons.polygonById(id)
type SelectorHooks<T extends Record<string, Selector>> = {
  [K in keyof T]: T[K] extends (s: RootState, ...args: infer A) => infer R ? (...args: A) => R : never;
};

const toHooks = <T extends Record<string, Selector>>(selectors: T) =>
  Object.fromEntries(
    Object.entries(selectors).map(([name, select]) => [
      name,
      (...args: unknown[]) => rdxo(s => select(s, ...args)),
    ]),
  ) as SelectorHooks<T>;


export const store = configureStore({
  reducer: {
    tooltip: tooltipReducer,
    stage: stageReducer,
    layers: layersReducer,
    labels: labelsReducer,
    polygons: polygonsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const rdxo = useSelector.withTypes<RootState>(); // redux read / output

// Reads: hooks, call at the top of a component, e.g. useStage.mode()
export const useLayers = toHooks(layersSlice.selectors);
export const useStage = toHooks(stageSlice.selectors);
export const useLabels = toHooks(labelsSlice.selectors);
export const usePolygons = toHooks(polygonsSlice.selectors);

// Writes: actions pre-bound to the store, callable anywhere, e.g. stage.setMode('pen')
export const layers = bindActionCreators(layersSlice.actions, store.dispatch);
export const stage = bindActionCreators(stageSlice.actions, store.dispatch);
export const labels = bindActionCreators(labelsSlice.actions, store.dispatch);
export const polygons = bindActionCreators(polygonsSlice.actions, store.dispatch);
export const tooltip = bindActionCreators(tooltipSlice.actions, store.dispatch);
