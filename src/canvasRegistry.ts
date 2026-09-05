/**
 * Module-level handle on the live draw canvas, for code that needs the DOM
 * node but isn't a React component — utils, stats passes, export routines.
 *
 * Deliberately NOT in Redux. A canvas element is a DOM node: RTK's
 * serializableCheck rejects it, immutableCheck would deep-walk it into the
 * whole document graph on every dispatch, and DevTools can't snapshot it.
 * It would also buy nothing — drawing mutates pixels in place behind a stable
 * reference, so no selector would ever fire. Same reasoning that keeps pixel
 * data out of imageLayersSlice (see CLAUDE.md: "metadata in Redux, pixel data
 * in refs"); this is the non-component equivalent of that ref.
 *
 * Populated by Stage's mount effect and cleared on unmount, so it mirrors the
 * lifetime of drawCanvasRef exactly. READERS MUST GUARD FOR null — Stage
 * mounts after App, so anything running early sees the initial empty state.
 */
export const canvasRegistry: {
  draw: HTMLCanvasElement | null;
  drawCtx: CanvasRenderingContext2D | null;
  /**
   * Push the current canvas onto Stage's undo stack. Anything that mutates the
   * draw canvas should call this FIRST, or the edit won't be reversible.
   */
  saveState: (() => void) | null;
  /**
   * Repaint protected pixels. Call AFTER any mutation — every draw op in Stage
   * ends with it, and skipping it lets an edit clobber anchored colours.
   */
  reapplyAnchoredMask: (() => void) | null;
} = {
  draw: null,
  drawCtx: null,
  saveState: null,
  reapplyAnchoredMask: null,
};
