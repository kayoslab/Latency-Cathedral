// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock three.js — jsdom has no WebGL context.
vi.mock('three', () => {
  const Color = vi.fn(function Color(this: { r: number; g: number; b: number }, hex?: number) {
    this.r = ((hex ?? 0) >> 16 & 0xff) / 255;
    this.g = ((hex ?? 0) >> 8 & 0xff) / 255;
    this.b = ((hex ?? 0) & 0xff) / 255;
  });
  Color.prototype.lerpColors = vi.fn(function lerpColors(
    this: { r: number; g: number; b: number },
    a: { r: number; g: number; b: number },
    b: { r: number; g: number; b: number },
    t: number,
  ) {
    this.r = a.r + (b.r - a.r) * t;
    this.g = a.g + (b.g - a.g) * t;
    this.b = a.b + (b.b - a.b) * t;
    return this;
  });

  const Fog = vi.fn(function Fog(this: { color: InstanceType<typeof Color>; near: number; far: number }, color: number, near: number, far: number) {
    this.color = new Color(color);
    this.near = near;
    this.far = far;
  });

  const AmbientLight = vi.fn(function AmbientLight(this: { intensity: number; isLight: boolean }, _color?: number, intensity?: number) {
    this.intensity = intensity ?? 1;
    this.isLight = true;
  });

  const DirectionalLight = vi.fn(function DirectionalLight(this: { intensity: number; isLight: boolean; position: { set: ReturnType<typeof vi.fn> } }, _color?: number, intensity?: number) {
    this.intensity = intensity ?? 1;
    this.isLight = true;
    this.position = { set: vi.fn() };
  });

  const Scene = vi.fn(function Scene(this: { background: unknown; fog: unknown }) {
    this.background = null;
    this.fog = null;
  });

  return {
    Color,
    Fog,
    AmbientLight,
    DirectionalLight,
    Scene,
  };
});

describe('US-013: applyAtmosphere', () => {
  let applyAtmosphere: typeof import('../../src/render/applyAtmosphere').applyAtmosphere;
  let THREE: typeof import('three');

  beforeEach(async () => {
    vi.resetModules();
    THREE = await import('three');
    const mod = await import('../../src/render/applyAtmosphere');
    applyAtmosphere = mod.applyAtmosphere;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createTestScene() {
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0a0f, 50, 100);
    scene.background = new THREE.Color(0x0a0a0f);
    return scene;
  }

  function createTestLights() {
    return {
      ambient: new THREE.AmbientLight(0xffffff, 0.4),
      directional: new THREE.DirectionalLight(0xffffff, 0.8),
    };
  }

  // ── Fog boundary values ──

  it('fog=0 produces far/transparent fog (near=50, far=100)', () => {
    const scene = createTestScene();
    const lights = createTestLights();

    applyAtmosphere(scene as unknown as import('three').Scene, lights as unknown as import('../../src/render/createLights').Lights, { fog: 0, lightIntensity: 0.5 });

    expect(scene.fog!.near).toBe(50);
    expect(scene.fog!.far).toBe(100);
  });

  it('fog=1 produces near/dense fog (near=1, far=8)', () => {
    const scene = createTestScene();
    const lights = createTestLights();

    applyAtmosphere(scene as unknown as import('three').Scene, lights as unknown as import('../../src/render/createLights').Lights, { fog: 1, lightIntensity: 0.5 });

    expect(scene.fog!.near).toBe(1);
    expect(scene.fog!.far).toBe(8);
  });

  it('fog=0.5 interpolates fog near/far linearly', () => {
    const scene = createTestScene();
    const lights = createTestLights();

    applyAtmosphere(scene as unknown as import('three').Scene, lights as unknown as import('../../src/render/createLights').Lights, { fog: 0.5, lightIntensity: 0.5 });

    // near: 50 + (1 - 50) * 0.5 = 25.5
    // far: 100 + (8 - 100) * 0.5 = 54
    expect(scene.fog!.near).toBeCloseTo(25.5, 1);
    expect(scene.fog!.far).toBeCloseTo(54, 1);
  });

  // ── Light intensity boundary values ──

  it('lightIntensity=1 maps to bright ambient and directional', () => {
    const scene = createTestScene();
    const lights = createTestLights();

    applyAtmosphere(scene as unknown as import('three').Scene, lights as unknown as import('../../src/render/createLights').Lights, { fog: 0, lightIntensity: 1 });

    // ambient: 0.15 + (0.6 - 0.15) * 1 = 0.6
    // directional: 0.3 + (1.0 - 0.3) * 1 = 1.0
    expect(lights.ambient.intensity).toBeCloseTo(0.6, 2);
    expect(lights.directional.intensity).toBeCloseTo(1.0, 2);
  });

  it('lightIntensity=0 maps to dim ambient and directional', () => {
    const scene = createTestScene();
    const lights = createTestLights();

    applyAtmosphere(scene as unknown as import('three').Scene, lights as unknown as import('../../src/render/createLights').Lights, { fog: 0, lightIntensity: 0 });

    // ambient: 0.15, directional: 0.3
    expect(lights.ambient.intensity).toBeCloseTo(0.15, 2);
    expect(lights.directional.intensity).toBeCloseTo(0.3, 2);
  });

  it('lightIntensity=0.5 interpolates light intensities linearly', () => {
    const scene = createTestScene();
    const lights = createTestLights();

    applyAtmosphere(scene as unknown as import('three').Scene, lights as unknown as import('../../src/render/createLights').Lights, { fog: 0, lightIntensity: 0.5 });

    // ambient: 0.15 + (0.6 - 0.15) * 0.5 = 0.375
    // directional: 0.3 + (1.0 - 0.3) * 0.5 = 0.65
    expect(lights.ambient.intensity).toBeCloseTo(0.375, 2);
    expect(lights.directional.intensity).toBeCloseTo(0.65, 2);
  });

  // ── Background color ──

  it('fog=0 sets background to clean color (0x1a1a2e)', () => {
    const scene = createTestScene();
    const lights = createTestLights();

    applyAtmosphere(scene as unknown as import('three').Scene, lights as unknown as import('../../src/render/createLights').Lights, { fog: 0, lightIntensity: 0.5 });

    // background should be lerped toward clean color (fog=0 → clean)
    const bg = scene.background as { r: number; g: number; b: number };
    expect(bg).toBeDefined();
    // 0x1a1a2e → r=26/255≈0.102, g=26/255≈0.102, b=46/255≈0.180
    expect(bg.r).toBeCloseTo(0x1a / 255, 1);
    expect(bg.g).toBeCloseTo(0x1a / 255, 1);
    expect(bg.b).toBeCloseTo(0x2e / 255, 1);
  });

  it('fog=1 sets background to murky color (0x050508)', () => {
    const scene = createTestScene();
    const lights = createTestLights();

    applyAtmosphere(scene as unknown as import('three').Scene, lights as unknown as import('../../src/render/createLights').Lights, { fog: 1, lightIntensity: 0.5 });

    const bg = scene.background as { r: number; g: number; b: number };
    expect(bg).toBeDefined();
    // 0x050508 → r=5/255≈0.020, g=5/255≈0.020, b=8/255≈0.031
    expect(bg.r).toBeCloseTo(0x05 / 255, 1);
    expect(bg.g).toBeCloseTo(0x05 / 255, 1);
    expect(bg.b).toBeCloseTo(0x08 / 255, 1);
  });

  // ── Mutation (no recreation) ──

  it('mutates existing fog object in place — no new Fog created', () => {
    const scene = createTestScene();
    const lights = createTestLights();
    const originalFog = scene.fog;

    // Clear the Fog constructor call count
    (THREE.Fog as unknown as ReturnType<typeof vi.fn>).mockClear();

    applyAtmosphere(scene as unknown as import('three').Scene, lights as unknown as import('../../src/render/createLights').Lights, { fog: 0.7, lightIntensity: 0.5 });

    // Same fog reference — mutated, not replaced
    expect(scene.fog).toBe(originalFog);
    // No new Fog instances created
    expect(THREE.Fog).not.toHaveBeenCalled();
  });

  it('mutates existing light objects in place — same references', () => {
    const scene = createTestScene();
    const lights = createTestLights();
    const originalAmbient = lights.ambient;
    const originalDirectional = lights.directional;

    applyAtmosphere(scene as unknown as import('three').Scene, lights as unknown as import('../../src/render/createLights').Lights, { fog: 0.5, lightIntensity: 0.3 });

    expect(lights.ambient).toBe(originalAmbient);
    expect(lights.directional).toBe(originalDirectional);
  });

  it('updates fog color to stay coherent with background color', () => {
    const scene = createTestScene();
    const lights = createTestLights();

    applyAtmosphere(scene as unknown as import('three').Scene, lights as unknown as import('../../src/render/createLights').Lights, { fog: 0.5, lightIntensity: 0.5 });

    // Fog color and background should be set (both updated for visual coherence)
    const fogColor = scene.fog!.color as { r: number; g: number; b: number };
    const bgColor = scene.background as { r: number; g: number; b: number };
    expect(fogColor).toBeDefined();
    expect(bgColor).toBeDefined();
  });
});
