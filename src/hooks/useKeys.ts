import { useEffect } from 'react';
import { store } from '../redux/store';
import { deleteSelected, selectAll, clearSelection, getSelectedPolygons } from '../redux/polygonsSlice';
import { setInteractionMode } from '../redux/canvasSlice';
import { useDispatch } from 'react-redux';
import { rasterizePolygon } from '../components/Polygons/utils';

/**
 * The single global keyboard handler for app-level (Redux) shortcuts.
 * Mount it ONCE at the app root. It reads fresh state via store.getState(),
 * so there are no stale closures and the listener never has to re-bind.
 *
 * Canvas-imperative keys (opacity, undo, layer cycling, pen Enter/Esc/Delete/c)
 * still live in Stage.tsx — they need Stage's refs. This hook defers to pen
 * mode for Enter/Delete/Escape so the two handlers never fight over the same key.
 */
export function useKeys() {
  const dispatch = useDispatch();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 1. never hijack keys while the user is typing
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

      // 2. read CURRENT state — no stale closure, no deps.
      // Must be store.getState(), not useAppSelector: this runs inside an event
      // callback, and a hook call outside render throws "Invalid hook call".
      const state = store.getState();
      const { interactionMode } = state.canvas;
      const selected = getSelectedPolygons(state);

      const mod = e.metaKey || e.ctrlKey;

      // 3. one flat lookup key per combo
      const combo = [mod && 'mod', e.shiftKey && 'shift', e.key.toLowerCase()].filter(Boolean).join('+');

      switch (combo) {
        case 'mod+a':
          // Replaces the native "select all text", so the default has to go.
          e.preventDefault();
          store.dispatch(selectAll());
          break;

        case 'escape':
          // Pen mode owns Escape (clears the in-progress polygon) — let Stage handle it.
          if (interactionMode !== 'pen' && selected.length) {
            store.dispatch(clearSelection());
          }
          dispatch(setInteractionMode('select'));
          break;

        case 'enter':
          // Pen mode owns Enter (rasterizes the in-progress shape) — let Stage handle it.
          if (interactionMode !== 'pen' && selected.length) {
            e.preventDefault();
            // Non-destructive: the vectors stay in the store, Delete removes them.
            // Re-running is harmless — it repaints the same flat colour.
            selected.forEach(p => rasterizePolygon(p.points, p.colour));
          } else if(interactionMode === 'pen') {
            dispatch(setInteractionMode('select'))
          }
          break;

        case 'delete':
        case 'backspace':
          // Pen mode owns Delete (erases the pen shape) — let Stage handle it.
          if (interactionMode !== 'pen' && selected.length) {
            e.preventDefault();
            store.dispatch(deleteSelected());
          }
          break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch]); // dispatch is stable, so this still binds once
}
