import { describe, it, expect } from 'vitest';
import { mapSnapshotToScene } from '../../../src/domain/snapshotToScene';
import type { SceneParams } from '../../../src/domain/types';
import { PRESET_SNAPSHOTS } from '../../../src/domain/presets';
import type { PresetName } from '../../../src/domain/presets';

/** Assert all SceneParams fields are in [0, 1]. */
function expectNormalized(params: SceneParams) {
  for (const [key, value] of Object.entries(params)) {
    expect(value, `${key} should be >= 0`).toBeGreaterThanOrEqual(0);
    expect(value, `${key} should be <= 1`).toBeLessThanOrEqual(1);
  }
}

describe('US-006: preset snapshot definitions', () => {
  it('contains exactly fast, mixed, and poor presets', () => {
    const keys = Object.keys(PRESET_SNAPSHOTS).sort();
    expect(keys).toEqual(['fast', 'mixed', 'poor']);
  });

  describe('FAST preset produces tall, clean cathedral', () => {
    const scene = mapSnapshotToScene(PRESET_SNAPSHOTS.fast);

    it('has high height (> 0.9)', () => {
      expect(scene.height).toBeGreaterThan(0.9);
    });

    it('has low fracture (< 0.05)', () => {
      expect(scene.fracture).toBeLessThan(0.05);
    });

    it('has low ruinLevel (< 0.05)', () => {
      expect(scene.ruinLevel).toBeLessThan(0.05);
    });

    it('produces all values in [0, 1]', () => {
      expectNormalized(scene);
    });
  });

  describe('POOR preset produces fractured, ruinous cathedral', () => {
    const scene = mapSnapshotToScene(PRESET_SNAPSHOTS.poor);

    it('has low height (< 0.1)', () => {
      expect(scene.height).toBeLessThan(0.1);
    });

    it('has high fracture (> 0.7)', () => {
      expect(scene.fracture).toBeGreaterThan(0.7);
    });

    it('has high ruinLevel (> 0.7)', () => {
      expect(scene.ruinLevel).toBeGreaterThan(0.7);
    });

    it('produces all values in [0, 1]', () => {
      expectNormalized(scene);
    });
  });

  describe('MIXED preset produces intermediate cathedral', () => {
    const scene = mapSnapshotToScene(PRESET_SNAPSHOTS.mixed);

    it('has height between 0.4 and 0.8', () => {
      expect(scene.height).toBeGreaterThan(0.4);
      expect(scene.height).toBeLessThan(0.8);
    });

    it('has fracture between 0.1 and 0.5', () => {
      expect(scene.fracture).toBeGreaterThan(0.1);
      expect(scene.fracture).toBeLessThan(0.5);
    });

    it('produces all values in [0, 1]', () => {
      expectNormalized(scene);
    });
  });

  describe('monotonicity across presets', () => {
    const fast = mapSnapshotToScene(PRESET_SNAPSHOTS.fast);
    const mixed = mapSnapshotToScene(PRESET_SNAPSHOTS.mixed);
    const poor = mapSnapshotToScene(PRESET_SNAPSHOTS.poor);

    it('height: fast > mixed > poor', () => {
      expect(fast.height).toBeGreaterThan(mixed.height);
      expect(mixed.height).toBeGreaterThan(poor.height);
    });

    it('fracture: poor > mixed > fast', () => {
      expect(poor.fracture).toBeGreaterThan(mixed.fracture);
      expect(mixed.fracture).toBeGreaterThan(fast.fracture);
    });

    it('ruinLevel: poor > mixed > fast', () => {
      expect(poor.ruinLevel).toBeGreaterThan(mixed.ruinLevel);
      expect(mixed.ruinLevel).toBeGreaterThan(fast.ruinLevel);
    });
  });

  describe('all presets produce valid SceneParams', () => {
    const names: PresetName[] = ['fast', 'mixed', 'poor'];

    for (const name of names) {
      it(`${name} preset SceneParams are all in [0, 1]`, () => {
        const scene = mapSnapshotToScene(PRESET_SNAPSHOTS[name]);
        expectNormalized(scene);
      });
    }
  });
});
