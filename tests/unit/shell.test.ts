// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('US-003: initShell()', () => {
  let initShell: typeof import('../../src/ui/shell').initShell;

  beforeEach(async () => {
    // Set up DOM with required elements
    document.body.innerHTML = `
      <canvas id="cathedral"></canvas>
      <div id="overlay"></div>
    `;

    // Mock window dimensions
    vi.stubGlobal('innerWidth', 1280);
    vi.stubGlobal('innerHeight', 720);

    // Fresh import each test to avoid stale state
    const mod = await import('../../src/ui/shell');
    initShell = mod.initShell;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    document.body.innerHTML = '';
  });

  it('returns an object with canvas and overlay elements', () => {
    const shell = initShell();

    expect(shell.canvas).toBeInstanceOf(HTMLCanvasElement);
    expect(shell.overlay).toBeInstanceOf(HTMLDivElement);
  });

  it('returns the #cathedral canvas element', () => {
    const shell = initShell();

    expect(shell.canvas.id).toBe('cathedral');
  });

  it('returns the #overlay div element', () => {
    const shell = initShell();

    expect(shell.overlay.id).toBe('overlay');
  });

  it('does not set canvas dimensions (renderer owns sizing)', () => {
    const shell = initShell();

    // Shell should NOT set canvas width/height — the renderer controls sizing
    // via renderer.setSize(). Canvas attributes default to 300x150 in jsdom.
    expect(shell.canvas.width).toBe(300);
    expect(shell.canvas.height).toBe(150);
  });

  it('does not attach a resize listener', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

    initShell();

    const resizeAdded = addEventListenerSpy.mock.calls.some(
      ([event]) => event === 'resize',
    );
    expect(resizeAdded).toBe(false);

    addEventListenerSpy.mockRestore();
  });

  it('throws if #cathedral canvas is missing', () => {
    document.body.innerHTML = '<div id="overlay"></div>';

    expect(() => initShell()).toThrow();
  });

  it('throws if #overlay div is missing', () => {
    document.body.innerHTML = '<canvas id="cathedral"></canvas>';

    expect(() => initShell()).toThrow();
  });
});
