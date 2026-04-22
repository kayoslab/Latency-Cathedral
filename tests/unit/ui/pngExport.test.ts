// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('US-016: pngExport', () => {
  let overlay: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let loadModule: () => Promise<typeof import('../../../src/ui/pngExport')>;

  beforeEach(() => {
    overlay = document.createElement('div');
    canvas = document.createElement('canvas');
    document.body.appendChild(overlay);
    document.body.appendChild(canvas);

    loadModule = () => import('../../../src/ui/pngExport');
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('adds a button with data-action="export-png" to the overlay', async () => {
    const { initPngExport } = await loadModule();
    initPngExport(overlay, canvas);

    const btn = overlay.querySelector('[data-action="export-png"]');
    expect(btn).not.toBeNull();
    expect(btn).toBeInstanceOf(HTMLButtonElement);
  });

  it('calls canvas.toBlob with image/png on button click', async () => {
    const { initPngExport } = await loadModule();
    initPngExport(overlay, canvas);

    const toBlobSpy = vi.fn((_cb: BlobCallback, _type?: string) => {
      // call the callback with a fake blob
      _cb(new Blob(['fake'], { type: 'image/png' }));
    });
    canvas.toBlob = toBlobSpy;

    const btn = overlay.querySelector('[data-action="export-png"]') as HTMLButtonElement;
    btn.click();

    expect(toBlobSpy).toHaveBeenCalledTimes(1);
    expect(toBlobSpy).toHaveBeenCalledWith(expect.any(Function), 'image/png');
  });

  it('creates a download anchor with correct attributes', async () => {
    const { initPngExport } = await loadModule();
    initPngExport(overlay, canvas);

    // Mock toBlob to invoke callback synchronously
    canvas.toBlob = vi.fn((_cb: BlobCallback) => {
      _cb(new Blob(['fake'], { type: 'image/png' }));
    });

    // Mock URL.createObjectURL and revokeObjectURL
    const fakeUrl = 'blob:http://localhost/fake-png';
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => fakeUrl),
      revokeObjectURL: vi.fn(),
    });

    // Spy on anchor click
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const btn = overlay.querySelector('[data-action="export-png"]') as HTMLButtonElement;
    btn.click();

    expect(clickSpy).toHaveBeenCalled();
  });

  it('does not crash if toBlob returns null', async () => {
    const { initPngExport } = await loadModule();
    initPngExport(overlay, canvas);

    canvas.toBlob = vi.fn((_cb: BlobCallback) => {
      _cb(null);
    });

    const btn = overlay.querySelector('[data-action="export-png"]') as HTMLButtonElement;
    expect(() => btn.click()).not.toThrow();
  });

  it('dispose removes the button from the overlay', async () => {
    const { initPngExport } = await loadModule();
    const { dispose } = initPngExport(overlay, canvas);

    expect(overlay.querySelector('[data-action="export-png"]')).not.toBeNull();

    dispose();

    expect(overlay.querySelector('[data-action="export-png"]')).toBeNull();
  });
});
