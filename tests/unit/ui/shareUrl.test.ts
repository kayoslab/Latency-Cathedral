// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPresetState } from '../../../src/domain/presetState';
import type { PresetState } from '../../../src/domain/presetState';

describe('US-016: shareUrl', () => {
  let overlay: HTMLDivElement;
  let presetState: PresetState;
  let loadModule: () => Promise<typeof import('../../../src/ui/shareUrl')>;

  beforeEach(() => {
    overlay = document.createElement('div');
    document.body.appendChild(overlay);
    presetState = createPresetState();

    loadModule = () => import('../../../src/ui/shareUrl');
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('adds a share button to the overlay', async () => {
    const { initShareUrl } = await loadModule();
    initShareUrl(overlay, presetState);

    const btn = overlay.querySelector('[data-action="share-url"]');
    expect(btn).not.toBeNull();
    expect(btn).toBeInstanceOf(HTMLButtonElement);
  });

  it('copies URL to clipboard on button click when preset is selected', async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText: writeTextSpy },
    });

    const { initShareUrl } = await loadModule();
    initShareUrl(overlay, presetState);

    presetState.select('fast');

    const btn = overlay.querySelector('[data-action="share-url"]') as HTMLButtonElement;
    btn.click();

    // Allow async clipboard promise to resolve
    await vi.waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalledTimes(1);
    });
    expect(writeTextSpy.mock.calls[0][0]).toContain('preset=fast');
  });

  it('does not crash when clipboard API is unavailable', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: undefined,
    });

    const { initShareUrl } = await loadModule();
    initShareUrl(overlay, presetState);

    presetState.select('poor');

    const btn = overlay.querySelector('[data-action="share-url"]') as HTMLButtonElement;
    expect(() => btn.click()).not.toThrow();
  });

  it('does not crash when clipboard.writeText rejects', async () => {
    const writeTextSpy = vi.fn().mockRejectedValue(new Error('Permission denied'));
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText: writeTextSpy },
    });

    const { initShareUrl } = await loadModule();
    initShareUrl(overlay, presetState);

    presetState.select('mixed');

    const btn = overlay.querySelector('[data-action="share-url"]') as HTMLButtonElement;
    // Should not throw even though clipboard rejects
    expect(() => btn.click()).not.toThrow();
  });

  it('calls history.replaceState when preset changes', async () => {
    const replaceStateSpy = vi.spyOn(history, 'replaceState');

    const { initShareUrl } = await loadModule();
    initShareUrl(overlay, presetState);

    presetState.select('fast');

    expect(replaceStateSpy).toHaveBeenCalled();
    const lastCallUrl = replaceStateSpy.mock.calls[0][2] as string;
    expect(lastCallUrl).toContain('preset=fast');
  });

  it('updates URL on each preset change', async () => {
    const replaceStateSpy = vi.spyOn(history, 'replaceState');

    const { initShareUrl } = await loadModule();
    initShareUrl(overlay, presetState);

    presetState.select('fast');
    presetState.select('poor');
    presetState.select('mixed');

    expect(replaceStateSpy).toHaveBeenCalledTimes(3);
    expect((replaceStateSpy.mock.calls[2][2] as string)).toContain('preset=mixed');
  });

  it('dispose removes the button and stops URL updates', async () => {
    const replaceStateSpy = vi.spyOn(history, 'replaceState');

    const { initShareUrl } = await loadModule();
    const { dispose } = initShareUrl(overlay, presetState);

    expect(overlay.querySelector('[data-action="share-url"]')).not.toBeNull();

    dispose();

    expect(overlay.querySelector('[data-action="share-url"]')).toBeNull();

    // Further preset changes should not call replaceState
    replaceStateSpy.mockClear();
    presetState.select('poor');
    expect(replaceStateSpy).not.toHaveBeenCalled();
  });
});
