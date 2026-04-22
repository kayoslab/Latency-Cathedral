import { describe, it, expect } from 'vitest';
import { parsePresetFromUrl, buildPresetUrl } from '../../../src/domain/presetUrl';

describe('US-016: presetUrl', () => {
  describe('parsePresetFromUrl()', () => {
    it('returns "fast" for ?preset=fast', () => {
      expect(parsePresetFromUrl('?preset=fast')).toBe('fast');
    });

    it('returns "mixed" for ?preset=mixed', () => {
      expect(parsePresetFromUrl('?preset=mixed')).toBe('mixed');
    });

    it('returns "poor" for ?preset=poor', () => {
      expect(parsePresetFromUrl('?preset=poor')).toBe('poor');
    });

    it('returns null for an invalid preset name', () => {
      expect(parsePresetFromUrl('?preset=bogus')).toBeNull();
    });

    it('returns null when preset param is missing', () => {
      expect(parsePresetFromUrl('')).toBeNull();
    });

    it('returns null for empty search string', () => {
      expect(parsePresetFromUrl('')).toBeNull();
    });

    it('returns null when only ? is present with no params', () => {
      expect(parsePresetFromUrl('?')).toBeNull();
    });

    it('extracts preset even with additional unrelated params', () => {
      expect(parsePresetFromUrl('?foo=bar&preset=poor&baz=1')).toBe('poor');
    });

    it('returns null for case-sensitive mismatch', () => {
      expect(parsePresetFromUrl('?preset=Fast')).toBeNull();
    });

    it('returns null for empty preset value', () => {
      expect(parsePresetFromUrl('?preset=')).toBeNull();
    });
  });

  describe('buildPresetUrl()', () => {
    it('produces correct query string for a base URL without params', () => {
      const url = buildPresetUrl('https://example.com', 'fast');
      expect(url).toBe('https://example.com?preset=fast');
    });

    it('produces correct query string with trailing slash', () => {
      const url = buildPresetUrl('https://example.com/', 'mixed');
      expect(url).toBe('https://example.com/?preset=mixed');
    });

    it('appends to existing query params', () => {
      const url = buildPresetUrl('https://example.com?debug=1', 'poor');
      expect(url).toBe('https://example.com?debug=1&preset=poor');
    });

    it('replaces existing preset param', () => {
      const url = buildPresetUrl('https://example.com?preset=fast', 'poor');
      expect(url).toBe('https://example.com?preset=poor');
    });

    it('handles all three preset names', () => {
      for (const name of ['fast', 'mixed', 'poor'] as const) {
        const url = buildPresetUrl('https://example.com', name);
        expect(url).toContain(`preset=${name}`);
      }
    });

    it('preserves other params when replacing preset', () => {
      const url = buildPresetUrl('https://example.com?debug=1&preset=fast&mode=test', 'poor');
      expect(url).toContain('debug=1');
      expect(url).toContain('preset=poor');
      expect(url).toContain('mode=test');
      expect(url).not.toContain('preset=fast');
    });
  });
});
