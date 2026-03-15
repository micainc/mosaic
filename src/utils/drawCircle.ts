// Optimized Bresenham circle drawing using batched rectangle operations.
// Draws a filled circle at (cx, cy) with radius r on the given canvas context.

export function drawCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  r |= 0;
  if (r <= 0) return;

  ctx.beginPath(); // Start a single path for all rectangles

  let x = r;
  let y = 0;
  let err = 0;

  while (x >= y) {
    // Batch rectangle operations into a single path
    ctx.rect(cx - x - 1, cy + y - 1, x * 2 + 2, 2);
    ctx.rect(cx - x - 1, cy - y - 1, x * 2 + 2, 2);

    if (y > 0) {
      ctx.rect(cx - y - 1, cy + x - 1, y * 2 + 2, 2);
      ctx.rect(cx - y - 1, cy - x - 1, y * 2 + 2, 2);
    }

    y++;
    err += 2 * y + 1;

    if (err > x) {
      x--;
      err -= 2 * x + 1;
    }
  }

  ctx.fill(); // Single fill operation for all rectangles
}
