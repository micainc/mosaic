import { rgbToHex } from './rgbUtils';

// Updates the anchored mask canvas by scanning the draw canvas for pixels
// whose colors are in the anchored set (excluding the currently active draw colour).
export function updateAnchoredMask(
  drawCtx: CanvasRenderingContext2D,
  anchoredMaskCtx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  anchoredColours: Record<string, string>,
  activeDrawColour: string
): void {
  if (Object.keys(anchoredColours).length === 0) {
    if (anchoredMaskCtx) {
      anchoredMaskCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    }
    return;
  }

  // Get current canvas state
  const imageData = drawCtx.getImageData(0, 0, canvasWidth, canvasHeight);
  const data = imageData.data;

  // Clear the mask canvas
  anchoredMaskCtx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Create a new image data for the mask
  const anchoredMask = anchoredMaskCtx.createImageData(canvasWidth, canvasHeight);
  const maskData = anchoredMask.data;

  // Copy only anchored pixels to the mask
  let anchoredPixelCount = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Check if this pixel color is anchored and not transparent
    if (a > 0) {
      const hex = rgbToHex(r, g, b);
      if (anchoredColours.hasOwnProperty(hex) && hex !== activeDrawColour) {
        // Copy this pixel to the mask
        maskData[i] = r;
        maskData[i + 1] = g;
        maskData[i + 2] = b;
        maskData[i + 3] = a;
        anchoredPixelCount++;
      }
    }
  }

  // Put the mask data on the mask canvas
  if (anchoredPixelCount > 0) {
    anchoredMaskCtx.putImageData(anchoredMask, 0, 0);
  }
}

// Reapplies the anchored mask onto the draw canvas by drawing
// the mask canvas on top using 'source-over' compositing.
export function reapplyAnchoredMask(
  drawCtx: CanvasRenderingContext2D,
  anchoredMaskCanvas: HTMLCanvasElement | OffscreenCanvas,
  anchoredColours: Record<string, string>
): void {
  if (!anchoredMaskCanvas || Object.keys(anchoredColours).length === 0) return;

  // Save current composite operation
  const originalOp = drawCtx.globalCompositeOperation;

  // Draw the mask canvas on top (this respects transparency properly)
  drawCtx.globalCompositeOperation = 'source-over';
  drawCtx.drawImage(anchoredMaskCanvas as HTMLCanvasElement, 0, 0);

  // Restore original composite operation
  drawCtx.globalCompositeOperation = originalOp;
}
