// Highlight/selection system using bit-packed arrays for efficient pixel masking.

// Helper functions for bit-packed array operations
export function getBit(array: Uint32Array, index: number): number {
  const arrayIndex = Math.floor(index / 32);
  const bitPosition = index % 32;
  return (array[arrayIndex] & (1 << bitPosition)) !== 0 ? 1 : 0;
}

export function setBit(array: Uint32Array, index: number): void {
  const arrayIndex = Math.floor(index / 32);
  const bitPosition = index % 32;
  array[arrayIndex] |= (1 << bitPosition);
}

export function createHighlightMask(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  targetColor: string
): Uint32Array {
  // Create a bit-packed array (1 bit per pixel instead of 8)
  const bitArraySize = Math.ceil((width * height) / 32);
  const mask = new Uint32Array(bitArraySize);

  // Get image data once for efficiency
  const imageData = ctx.getImageData(0, 0, width, height);
  const buffer32 = new Uint32Array(imageData.data.buffer);

  // Convert target color to ABGR format for comparison
  let colorValue: number | string = targetColor.startsWith("#") ? targetColor.slice(1) : targetColor;
  colorValue = parseInt(colorValue, 16);
  let red = (colorValue >> 16) & 0xFF;
  let green = (colorValue >> 8) & 0xFF;
  let blue = (colorValue >> 0) & 0xFF;
  colorValue = (0xFF << 24) | (blue << 16) | (green << 8) | (red << 0);
  colorValue >>>= 0;

  // Mark matching pixels using bit operations
  for (let i = 0; i < buffer32.length; i++) {
    if (buffer32[i] === colorValue) {
      setBit(mask, i);
    }
  }

  return mask;
}

export function applyActiveColourToHighlighted(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  highlightedMask: Uint32Array,
  activeColourHex: string
): void {
  if (!highlightedMask) return;

  // Get current canvas data
  const imageData = ctx.getImageData(0, 0, width, height);

  let col: number | string = activeColourHex.startsWith("#") ? activeColourHex.slice(1) : activeColourHex;
  col = parseInt(col, 16);
  let red = (col >> 16) & 0xFF;
  let green = (col >> 8) & 0xFF;
  let blue = (col >> 0) & 0xFF;

  // Replace colors in the selected areas
  for (let i = 0; i < width * height; i++) {
    if (getBit(highlightedMask, i) === 1) {
      const idx = i * 4;
      imageData.data[idx] = red;
      imageData.data[idx + 1] = green;
      imageData.data[idx + 2] = blue;
      // Alpha remains unchanged
    }
  }

  // Apply changes
  ctx.putImageData(imageData, 0, 0);
}
