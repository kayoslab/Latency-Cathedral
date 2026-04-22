import { describe, it, expect, vi } from 'vitest';
import { createPresetState } from '../../../src/domain/presetState';
import { PRESET_SNAPSHOTS } from '../../../src/domain/presets';
import type { PresetName } from '../../../src/domain/presets';
import type { NetworkSnapshot } from '../../../src/domain/types';

describe('US-006: preset state manager', () => {
  describe('current()', () => {
    it('returns null before any selection', () => {
      const state = createPresetState();
      expect(state.current()).toBeNull();
    });

    it('returns correct state after select()', () => {
      const state = createPresetState();
      state.select('fast');

      const cur = state.current();
      expect(cur).not.toBeNull();
      expect(cur!.name).toBe('fast');
      expect(cur!.snapshot).toEqual(PRESET_SNAPSHOTS.fast);
    });

    it('updates when a different preset is selected', () => {
      const state = createPresetState();
      state.select('fast');
      state.select('poor');

      const cur = state.current();
      expect(cur!.name).toBe('poor');
      expect(cur!.snapshot).toEqual(PRESET_SNAPSHOTS.poor);
    });
  });

  describe('select()', () => {
    it('returns the correct NetworkSnapshot for each preset', () => {
      const state = createPresetState();
      const names: PresetName[] = ['fast', 'mixed', 'poor'];

      for (const name of names) {
        const snapshot = state.select(name);
        expect(snapshot).toEqual(PRESET_SNAPSHOTS[name]);
      }
    });
  });

  describe('initial preset', () => {
    it('sets current when constructed with an initial preset', () => {
      const state = createPresetState('mixed');

      const cur = state.current();
      expect(cur).not.toBeNull();
      expect(cur!.name).toBe('mixed');
      expect(cur!.snapshot).toEqual(PRESET_SNAPSHOTS.mixed);
    });
  });

  describe('subscribe()', () => {
    it('calls the callback on select() with correct snapshot and name', () => {
      const state = createPresetState();
      const cb = vi.fn<(snapshot: NetworkSnapshot, name: PresetName) => void>();

      state.subscribe(cb);
      state.select('fast');

      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith(PRESET_SNAPSHOTS.fast, 'fast');
    });

    it('fires for each subsequent select()', () => {
      const state = createPresetState();
      const cb = vi.fn<(snapshot: NetworkSnapshot, name: PresetName) => void>();

      state.subscribe(cb);
      state.select('fast');
      state.select('poor');
      state.select('mixed');

      expect(cb).toHaveBeenCalledTimes(3);
      expect(cb).toHaveBeenNthCalledWith(1, PRESET_SNAPSHOTS.fast, 'fast');
      expect(cb).toHaveBeenNthCalledWith(2, PRESET_SNAPSHOTS.poor, 'poor');
      expect(cb).toHaveBeenNthCalledWith(3, PRESET_SNAPSHOTS.mixed, 'mixed');
    });

    it('supports multiple subscribers', () => {
      const state = createPresetState();
      const cb1 = vi.fn();
      const cb2 = vi.fn();

      state.subscribe(cb1);
      state.subscribe(cb2);
      state.select('mixed');

      expect(cb1).toHaveBeenCalledTimes(1);
      expect(cb2).toHaveBeenCalledTimes(1);
    });
  });

  describe('unsubscribe()', () => {
    it('stops notifications after unsubscribe', () => {
      const state = createPresetState();
      const cb = vi.fn();

      const unsubscribe = state.subscribe(cb);
      state.select('fast');
      expect(cb).toHaveBeenCalledTimes(1);

      unsubscribe();
      state.select('poor');
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('does not affect other subscribers', () => {
      const state = createPresetState();
      const cb1 = vi.fn();
      const cb2 = vi.fn();

      const unsub1 = state.subscribe(cb1);
      state.subscribe(cb2);

      unsub1();
      state.select('mixed');

      expect(cb1).not.toHaveBeenCalled();
      expect(cb2).toHaveBeenCalledTimes(1);
    });
  });
});
