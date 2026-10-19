export function syncCanvasSize(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.floor(rect.width);
  const height = Math.floor(rect.height);
  const dpr = window.devicePixelRatio || 1;
  const bufferWidth = Math.floor(width * dpr);
  const bufferHeight = Math.floor(height * dpr);

  // Keep CSS sizing responsive; only resize the drawing buffer when necessary.
  if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
    canvas.width = bufferWidth;
    canvas.height = bufferHeight;
  }

  return { width, height, dpr };
}
