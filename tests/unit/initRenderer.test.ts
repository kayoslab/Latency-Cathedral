// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock three.js — we only care about the dispose contract, not WebGL internals.
// jsdom has no WebGL context, so we must mock the constructors.
vi.mock('three', () => {
  const Color = vi.fn();

  const WebGLRenderer = vi.fn().mockImplementation(() => ({
    setPixelRatio: vi.fn(),
    setSize: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    domElement: document.createElement('canvas'),
  }));

  const Scene = vi.fn().mockImplementation(() => ({
    add: vi.fn(),
    background: null,
  }));

  const PerspectiveCamera = vi.fn().mockImplementation(() => ({
    position: { set: vi.fn(), z: 0 },
    aspect: 1,
    updateProjectionMatrix: vi.fn(),
  }));

  const AmbientLight = vi.fn().mockImplementation(() => ({
    isLight: true,
  }));

  const DirectionalLight = vi.fn().mockImplementation(() => ({
    position: { set: vi.fn() },
    isLight: true,
  }));

  const BoxGeometry = vi.fn().mockImplementation(() => ({
    dispose: vi.fn(),
  }));

  const MeshStandardMaterial = vi.fn().mockImplementation(() => ({
    dispose: vi.fn(),
  }));

  const Mesh = vi.fn().mockImplementation(() => ({
    rotation: { x: 0, y: 0 },
    geometry: new BoxGeometry(),
    material: new MeshStandardMaterial(),
  }));

  return {
    Color,
    WebGLRenderer,
    Scene,
    PerspectiveCamera,
    AmbientLight,
    DirectionalLight,
    BoxGeometry,
    MeshStandardMaterial,
    Mesh,
  };
});

describe('US-004: initRenderer() lifecycle and dispose contract', () => {
  let initRenderer: typeof import('../../src/render/initRenderer').initRenderer;
  let canvas: HTMLCanvasElement;

  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();

    document.body.innerHTML = '<canvas id="cathedral"></canvas>';
    canvas = document.getElementById('cathedral') as HTMLCanvasElement;

    vi.stubGlobal('innerWidth', 1280);
    vi.stubGlobal('innerHeight', 720);
    vi.stubGlobal('devicePixelRatio', 1);

    // Mock matchMedia for prefers-reduced-motion
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    // Mock requestAnimationFrame / cancelAnimationFrame
    vi.stubGlobal('requestAnimationFrame', vi.fn().mockReturnValue(1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const mod = await import('../../src/render/initRenderer');
    initRenderer = mod.initRenderer;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('returns an object with a dispose function', () => {
    const handle = initRenderer(canvas);

    expect(handle).toBeDefined();
    expect(typeof handle.dispose).toBe('function');

    handle.dispose();
  });

  it('dispose() can be called without throwing', () => {
    const handle = initRenderer(canvas);

    expect(() => handle.dispose()).not.toThrow();
  });

  it('dispose() cancels the animation frame', () => {
    const handle = initRenderer(canvas);
    handle.dispose();

    expect(cancelAnimationFrame).toHaveBeenCalled();
  });

  it('dispose() removes the resize event listener', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const handle = initRenderer(canvas);
    handle.dispose();

    const resizeRemoved = removeEventListenerSpy.mock.calls.some(
      ([event]) => event === 'resize',
    );
    expect(resizeRemoved).toBe(true);

    removeEventListenerSpy.mockRestore();
  });

  it('dispose() removes the visibilitychange listener', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    const handle = initRenderer(canvas);
    handle.dispose();

    const visibilityRemoved = removeEventListenerSpy.mock.calls.some(
      ([event]) => event === 'visibilitychange',
    );
    expect(visibilityRemoved).toBe(true);

    removeEventListenerSpy.mockRestore();
  });

  it('dispose() calls renderer.dispose()', async () => {
    const THREE = await import('three');
    const handle = initRenderer(canvas);
    handle.dispose();

    // The mock WebGLRenderer instance should have dispose called
    const rendererInstance = (THREE.WebGLRenderer as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    expect(rendererInstance.dispose).toHaveBeenCalled();
  });
});
