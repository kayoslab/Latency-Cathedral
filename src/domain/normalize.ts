/**
 * Clamp a value to [min, max]. NaN falls to min.
 */
export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Normalize RTT (ms) to a 0–1 range.
 * Default range: 0–1000 ms.
 */
export function normalizeRtt(
  rttMs: number,
  min: number = 0,
  max: number = 1000,
): number {
  if (Number.isNaN(rttMs)) return 0;
  const clamped = clamp(rttMs, min, max);
  const range = max - min;
  if (range <= 0) return 0;
  return (clamped - min) / range;
}

/**
 * Normalize jitter (ms) to a 0–1 range.
 * Default max: 500 ms.
 */
export function normalizeJitter(jitterMs: number, max: number = 500): number {
  if (Number.isNaN(jitterMs)) return 0;
  const clamped = clamp(jitterMs, 0, max);
  if (max <= 0) return 0;
  return clamped / max;
}

/**
 * Normalize a resource load duration (ms) to a 0–1 range.
 * Default max: 5000 ms.
 */
export function normalizeLoadDuration(durationMs: number, max: number = 5000): number {
  if (Number.isNaN(durationMs)) return 0;
  const clamped = clamp(durationMs, 0, max);
  if (max <= 0) return 0;
  return clamped / max;
}

/**
 * Compute the arithmetic mean of an array of durations,
 * filtering out non-finite values (NaN, Infinity, -Infinity).
 * Returns 0 for an empty array or when all values are non-finite.
 */
export function computeMeanDuration(durations: number[]): number {
  const finite = durations.filter(Number.isFinite);
  if (finite.length === 0) return 0;
  return finite.reduce((sum, d) => sum + d, 0) / finite.length;
}
