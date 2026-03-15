// Flood fill algorithm using bit-packed Uint32Array for visited tracking.
// Modes:
//   null: check from starting point x1, y1 if we started in a closed loop
//   'infill': fill pixels that are non active colour
//   'replace': fill pixels that match the starting pixel's colour

export function floodFill(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  x1: number,
  y1: number,
  activeColourHex: string,
  mode: null | 'infill' | 'replace' = null
): boolean {
  const width = canvasWidth;
  const height = canvasHeight;

  // Create bit array (1 bit per pixel instead of 8 bits)
  const bitArraySize = Math.ceil((width * height) / 32); // 32 bits per element
  const visited = new Uint32Array(bitArraySize);

  const floodStack: Array<{ x: number; y: number }> = [{ x: x1, y: y1 }];
  let isClosedShape = true;

  // Get image data
  const imageData = ctx.getImageData(0, 0, width, height);
  const buffer32 = new Uint32Array(imageData.data.buffer);

  // Get starting pixel value for 'replace' mode
  const startIndex = y1 * width + x1;
  const startPixelValue = buffer32[startIndex];

  // Color conversion for active color
  let col: number | string = activeColourHex.startsWith("#") ? activeColourHex.slice(1) : activeColourHex;
  col = parseInt(col, 16);
  let red = (col >> 16) & 0xFF;
  let green = (col >> 8) & 0xFF;
  let blue = (col >> 0) & 0xFF;
  col = (0xFF << 24) | (blue << 16) | (green << 8) | (red << 0);
  col >>>= 0;

  // For 'replace' mode: bail if starting pixel is already the active color, or if starting pixel is transparent
  if (mode === 'replace' && (startPixelValue === col || (startPixelValue >> 24) === 0)) {
    return false;
  }

  if (mode !== null) {
    ctx.fillStyle = activeColourHex;
  }

  while (floodStack.length > 0) {
    const p = floodStack.pop()!;
    const { x, y } = p;

    if (x < 0 || x >= width || y < 0 || y >= height) {
      isClosedShape = false;
      break;
    }

    const pixelIndex = y * width + x;
    const arrayIndex = pixelIndex >>> 5;  // Divide by 32, faster than Math.floor(pixelIndex/32)
    const bitMask = 1 << (pixelIndex & 31); // Same as pixelIndex % 32

    // If already visited, skip
    if (visited[arrayIndex] & bitMask) continue;

    // Mark as visited
    visited[arrayIndex] |= bitMask;

    const pixelValue = buffer32[pixelIndex];

    // For replace mode, only continue if pixel matches starting color
    if (mode === 'replace') {
      if (pixelValue === startPixelValue) {
        // Fill pixel with active color
        ctx.beginPath();
        ctx.fillRect(x - 1, y - 1, 3, 3);
        ctx.fill();

        // Continue flood in all directions
        floodStack.push({ x: x - 2, y: y });
        floodStack.push({ x: x + 2, y: y });
        floodStack.push({ x: x, y: y - 2 });
        floodStack.push({ x: x, y: y + 2 });
      }
    } else {
      // Original behavior for null and infill modes
      if (pixelValue !== col) { // IMPORTANT: this LIMITS the infill function: when encountering pixels of its OWN colour, will NOT progress further
        floodStack.push({ x: x - 2, y: y });
        floodStack.push({ x: x + 2, y: y });
        floodStack.push({ x: x, y: y - 2 });
        floodStack.push({ x: x, y: y + 2 });
      }

      if (mode === 'infill') {
        ctx.beginPath();
        ctx.fillRect(x - 1, y - 1, 3, 3);
        ctx.fill();
      }
    }
  }

  return isClosedShape;
}
