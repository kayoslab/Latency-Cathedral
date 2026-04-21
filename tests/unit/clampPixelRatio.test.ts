import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('US-004: clampPixelRatio()', () => {
  let clampPixelRatio: typeof import('../../src/render/clampPixelRatio').clampPixelRatio;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../src/render/clampPixelRatio');
    clampPixelRatio = mod.clampPixelRatio;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('passes through values below 2', () => {
    expect(clampPixelRatio(1)).toBe(1);
  });

  it('passes through fractional values like 1.5', () => {
    expect(clampPixelRatio(1.5)).toBe(1.5);
  });

  it('passes through exactly 2', () => {
    expect(clampPixelRatio(2)).toBe(2);
  });

  it('clamps values above 2 to 2', () => {
    expect(clampPixelRatio(3)).toBe(2);
    expect(clampPixelRatio(4)).toBe(2);
    expect(clampPixelRatio(2.5)).toBe(2);
  });

  it('defaults to globalThis.devicePixelRatio when no argument is given', () => {
    vi.stubGlobal('devicePixelRatio', 1.75);

    expect(clampPixelRatio()).toBe(1.75);
  });

  it('defaults to 1 when devicePixelRatio is absent and no argument is given', () => {
    vi.stubGlobal('devicePixelRatio', undefined);

    expect(clampPixelRatio()).toBe(1);
  });

  it('clamps globalThis.devicePixelRatio when it exceeds 2', () => {
    vi.stubGlobal('devicePixelRatio', 3);

    expect(clampPixelRatio()).toBe(2);
  });

  it('handles zero by returning 0', () => {
    expect(clampPixelRatio(0)).toBe(0);
  });

  it('handles negative values by returning the negative value (capped at 2)', () => {
    expect(clampPixelRatio(-1)).toBe(-1);
  });
});
