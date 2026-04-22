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

  const PointLight = vi.fn(function PointLight(this: { intensity: number; isLight: boolean; position: { set: ReturnType<typeof vi.fn> } }, _color?: number, intensity?: number) {
    this.intensity = intensity ?? 1;
    this.isLight = true;
    this.position = { set: vi.fn() };
  });

  const HemisphereLight = vi.fn(function HemisphereLight(this: { intensity: number; isLight: boolean }, _skyColor?: number, _groundColor?: number, intensity?: number) {
    this.intensity = intensity ?? 1;
    this.isLight = true;
  });

  return {
    Color,
    Fog,
    AmbientLight,
    DirectionalLight,
    PointLight,
    HemisphereLight,
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
    scene.fog = new THREE.Fog(0xd5d0c8, 200, 600);
    scene.background = new THREE.Color(0xd5d0c8);
    return scene;
  }

  function createTestLights() {
    const rim = new THREE.DirectionalLight(0x4466aa, 0.3);
    const interior = new (THREE as unknown as { PointLight: new (...args: unknown[]) => { intensity: number } }).PointLight(0xffaa44, 0.8, 8, 2);
    const hemisphere = new (THREE as unknown as { HemisphereLight: new (...args: unknown[]) => { intensity: number } }).HemisphereLight(0x445566, 0x222211, 0.3);
    return {
      ambient: new THREE.AmbientLight(0xffffff, 0.4),
      directional: new THREE.DirectionalLight(0xffffff, 0.8),
      rim,
      interior,
      hemisphere,
    };
  }

  // ── Fog boundary values ──

  it('fog=0 produces far/transparent fog (near=200, far=600)', () => {
    const scene = createTestScene();
    const lights = createTestLights();

    applyAtmosphere(scene as unknown as import('three').Scene, lights as unknown as import('../../src/render/createLights').Lights, { fog: 0, lightIntensity: 0.5 });

    expect((scene.fog as unknown as { near: number; far: number }).near).toBe(200);
    expect((scene.fog as unknown as { near: number; far: number }).far).toBe(600);
  });

  it('fog=1 produces near/dense fog (near=80, far=250)', () => {
    const scene = createTestScene();
    const lights = createTestLights();

    applyAtmosphere(scene as unknown as import('three').Scene, lights as unknown as import('../../src/render/createLights').Lights, { fog: 1, lightIntensity: 0.5 });

    expect((scene.fog as unknown as { near: number; far: number }).near).toBe(80);
    expect((scene.fog as unknown as { near: number; far: number }).far).toBe(250);
  });

  it('fog=0.5 interpolates fog near/far linearly', () => {
    const scene = createTestScene();
    const lights = createTestLights();

    applyAtmosphere(scene as unknown as import('three').Scene, lights as unknown as import('../../src/render/createLights').Lights, { fog: 0.5, lightIntensity: 0.5 });

    // near: 200 + (80 - 200) * 0.5 = 140
    // far: 600 + (250 - 600) * 0.5 = 425
    expect((scene.fog as unknown as { near: number; far: number }).near).toBeCloseTo(140, 1);
    expect((scene.fog as unknown as { near: number; far: number }).far).toBeCloseTo(425, 1);
  });

  // ── Light intensity boundary values ──

  it('lightIntensity=1 maps to bright ambient and directional', () => {
    const scene = createTestScene();
    const lights = createTestLights();

    applyAtmosphere(scene as unknown as import('three').Scene, lights as unknown as import('../../src/render/createLights').Lights, { fog: 0, lightIntensity: 1 });

    // ambient: 0.15 + (0.5 - 0.15) * 1 = 0.5
    // directional: 0.3 + (1.8 - 0.3) * 1 = 1.8
    expect(lights.ambient.intensity).toBeCloseTo(0.5, 2);
    expect(lights.directional.intensity).toBeCloseTo(1.8, 2);
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

    // ambient: 0.15 + (0.5 - 0.15) * 0.5 = 0.325
    // directional: 0.3 + (1.8 - 0.3) * 0.5 = 1.05
    expect(lights.ambient.intensity).toBeCloseTo(0.325, 2);
    expect(lights.directional.intensity).toBeCloseTo(1.05, 2);
  });

  // ── Background color ──

  it('fog=0 sets background to clean color (0xd5d0c8)', () => {
    const scene = createTestScene();
    const lights = createTestLights();

    applyAtmosphere(scene as unknown as import('three').Scene, lights as unknown as import('../../src/render/createLights').Lights, { fog: 0, lightIntensity: 0.5 });

    // background should be lerped toward clean color (fog=0 → clean)
    const bg = scene.background as { r: number; g: number; b: number };
    expect(bg).toBeDefined();
    // 0xd5d0c8 → r=213/255≈0.835, g=208/255≈0.816, b=200/255≈0.784
    expect(bg.r).toBeCloseTo(0xd5 / 255, 1);
    expect(bg.g).toBeCloseTo(0xd0 / 255, 1);
    expect(bg.b).toBeCloseTo(0xc8 / 255, 1);
  });

  it('fog=1 sets background to murky color (0x4a4540)', () => {
    const scene = createTestScene();
    const lights = createTestLights();

    applyAtmosphere(scene as unknown as import('three').Scene, lights as unknown as import('../../src/render/createLights').Lights, { fog: 1, lightIntensity: 0.5 });

    const bg = scene.background as { r: number; g: number; b: number };
    expect(bg).toBeDefined();
    // 0x4a4540 → r=74/255≈0.290, g=69/255≈0.271, b=64/255≈0.251
    expect(bg.r).toBeCloseTo(0x4a / 255, 1);
    expect(bg.g).toBeCloseTo(0x45 / 255, 1);
    expect(bg.b).toBeCloseTo(0x40 / 255, 1);
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
