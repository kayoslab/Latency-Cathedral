// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { NetworkSnapshot, SceneParams } from '../../../src/domain/types';

function makeSnapshot(overrides: Partial<NetworkSnapshot> = {}): NetworkSnapshot {
  return {
    samples: [],
    medianRtt: 42,
    jitter: 12,
    packetLoss: 0.02,
    bandwidth: 30,
    timestampMs: Date.now(),
    ...overrides,
  };
}

function makeSceneParams(overrides: Partial<SceneParams> = {}): SceneParams {
  return {
    height: 0.8,
    symmetry: 0.7,
    fracture: 0.15,
    fog: 0.2,
    lightIntensity: 0.9,
    ruinLevel: 0.1,
    ...overrides,
  };
}

async function loadModule() {
  const mod = await import('../../../src/ui/debugHud');
  return mod.createDebugHud;
}

describe('US-014: debugHud', () => {
  let overlay: HTMLDivElement;
  let createDebugHud: Awaited<ReturnType<typeof loadModule>>;

  beforeEach(async () => {
    vi.resetModules();
    overlay = document.createElement('div');
    document.body.appendChild(overlay);
    createDebugHud = await loadModule();
  });

  afterEach(() => {
    overlay.remove();
    vi.restoreAllMocks();
  });

  it('appends a DOM element to the overlay on creation', () => {
    const hud = createDebugHud(overlay);
    expect(overlay.children.length).toBeGreaterThanOrEqual(1);
    hud.dispose();
  });

  it('is hidden by default', () => {
    const hud = createDebugHud(overlay);
    expect(hud.isVisible()).toBe(false);
    hud.dispose();
  });

  describe('update()', () => {
    it('renders medianRtt value in text content', () => {
      const hud = createDebugHud(overlay);
      hud.toggle(); // make visible so we can read content
      hud.update(makeSnapshot({ medianRtt: 123 }), makeSceneParams());

      const text = overlay.textContent ?? '';
      expect(text).toContain('123');
      hud.dispose();
    });

    it('renders jitter value in text content', () => {
      const hud = createDebugHud(overlay);
      hud.toggle();
      hud.update(makeSnapshot({ jitter: 77 }), makeSceneParams());

      const text = overlay.textContent ?? '';
      expect(text).toContain('77');
      hud.dispose();
    });

    it('renders quality band label in text content', () => {
      const hud = createDebugHud(overlay);
      hud.toggle();
      // Low RTT/jitter should show "excellent" (or similar band label)
      hud.update(makeSnapshot({ medianRtt: 20, jitter: 5 }), makeSceneParams());

      const text = overlay.textContent ?? '';
      const validBands = ['excellent', 'good', 'degraded', 'poor'];
      const containsBand = validBands.some((band) => text.toLowerCase().includes(band));
      expect(containsBand).toBe(true);
      hud.dispose();
    });
  });

  describe('toggle()', () => {
    it('makes HUD visible after first toggle', () => {
      const hud = createDebugHud(overlay);
      expect(hud.isVisible()).toBe(false);

      hud.toggle();
      expect(hud.isVisible()).toBe(true);
      hud.dispose();
    });

    it('hides HUD after toggling twice', () => {
      const hud = createDebugHud(overlay);
      hud.toggle();
      hud.toggle();
      expect(hud.isVisible()).toBe(false);
      hud.dispose();
    });

    it('cycles visibility on repeated toggles', () => {
      const hud = createDebugHud(overlay);
      for (let i = 0; i < 4; i++) {
        hud.toggle();
        expect(hud.isVisible()).toBe(i % 2 === 0);
      }
      hud.dispose();
    });
  });

  describe('dispose()', () => {
    it('removes the HUD element from the overlay', () => {
      const hud = createDebugHud(overlay);
      const childCount = overlay.children.length;
      expect(childCount).toBeGreaterThanOrEqual(1);

      hud.dispose();
      expect(overlay.children.length).toBeLessThan(childCount);
    });

    it('isVisible returns false after dispose', () => {
      const hud = createDebugHud(overlay);
      hud.toggle(); // make visible
      hud.dispose();
      expect(hud.isVisible()).toBe(false);
    });
  });
});
