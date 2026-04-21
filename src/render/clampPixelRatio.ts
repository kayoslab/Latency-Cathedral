export function clampPixelRatio(raw?: number): number {
  const value = raw ?? globalThis.devicePixelRatio ?? 1;
  return Math.min(value, 2);
}
