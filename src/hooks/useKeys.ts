import { useEffect } from 'react';
import { rdxi, rdxo, store } from '../redux/store';
import { setInteractionMode } from '../redux/canvasSlice';
import { erasePolygon, rasterizePolygon } from '../components/Polygons/utils';
import { selectSelectedPolygons, selectAll, clearSelection, deleteSelected } from '../redux/polygonsSlice';
import { selectActiveLabel } from '../redux/labelsSlice';

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
  const dispatch = rdxi();
  const selected = rdxo(selectSelectedPolygons);
  const activeLabel = rdxo(selectActiveLabel);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 1. never hijack keys while the user is typing
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

      // 2. read CURRENT state — no stale closure, no deps.
      // Must be store.getState(), not a hook: this runs inside an event
      // callback, and a hook call outside render throws "Invalid hook call".
      const { interactionMode } = store.getState().canvas;

      const mod = e.metaKey || e.ctrlKey;

      // 3. one flat lookup key per combo
      const combo = [mod && 'mod', e.shiftKey && 'shift', e.key.toLowerCase()].filter(Boolean).join('+');

      switch (combo) {
        case 'mod+a':
          // Replaces the native "select all text", so the default has to go.
          e.preventDefault();
          dispatch(selectAll());
          break;

        case 'escape':
          // Pen mode owns Escape (clears the in-progress polygon) — let Stage handle it.
          if (interactionMode !== 'pen' && selected.length) {
            dispatch(clearSelection());
          }
          dispatch(setInteractionMode('select'));
          break;

        case 'enter':
          // Pen mode owns Enter (rasterizes the in-progress shape) — let Stage handle it.
          if (interactionMode !== 'pen' && selected.length) {
            e.preventDefault();
            // Non-destructive: the vectors stay in the store, Delete removes them.
            // Re-running is harmless — it repaints the same flat colour.
            selected.forEach(p => rasterizePolygon(p.points, activeLabel.colour));
          } else if (interactionMode === 'pen') {
            dispatch(setInteractionMode('select'));
          }
          break;

        case 'shift+enter':
          selected.forEach(p => erasePolygon(p.points));
          break;

        case 'delete':
        case 'backspace':
          // Pen mode owns Delete (erases the pen shape) — let Stage handle it.
          if (interactionMode !== 'pen' && selected.length) {
            e.preventDefault();
            dispatch(deleteSelected());
          }
          break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch, selected, activeLabel]);
}
