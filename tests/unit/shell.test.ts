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

  it('sizes the canvas to window dimensions', () => {
    const shell = initShell();

    expect(shell.canvas.width).toBe(1280);
    expect(shell.canvas.height).toBe(720);
  });

  it('updates canvas dimensions on window resize', () => {
    initShell();

    vi.stubGlobal('innerWidth', 1920);
    vi.stubGlobal('innerHeight', 1080);
    window.dispatchEvent(new Event('resize'));

    const canvas = document.getElementById('cathedral') as HTMLCanvasElement;
    expect(canvas.width).toBe(1920);
    expect(canvas.height).toBe(1080);
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
