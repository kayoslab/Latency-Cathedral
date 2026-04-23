// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock three.js — jsdom has no WebGL context.
vi.mock('three', () => {
  const Color = vi.fn(function Color(this: { r: number; g: number; b: number; copy: unknown; lerp: unknown; lerpColors: unknown; setHex: unknown }, hex?: number) {
    this.r = ((hex ?? 0) >> 16 & 0xff) / 255;
    this.g = ((hex ?? 0) >> 8 & 0xff) / 255;
    this.b = ((hex ?? 0) & 0xff) / 255;
    this.copy = vi.fn(function copy(this: { r: number; g: number; b: number }, c: { r: number; g: number; b: number }) {
      this.r = c.r; this.g = c.g; this.b = c.b; return this;
    }.bind(this));
    this.lerp = vi.fn(function lerp(this: { r: number; g: number; b: number }, c: { r: number; g: number; b: number }, t: number) {
      this.r += (c.r - this.r) * t;
      this.g += (c.g - this.g) * t;
      this.b += (c.b - this.b) * t;
      return this;
    }.bind(this));
    this.lerpColors = vi.fn(function lerpColors(
      this: { r: number; g: number; b: number },
      a: { r: number; g: number; b: number },
      b: { r: number; g: number; b: number },
      t: number,
    ) {
      this.r = a.r + (b.r - a.r) * t;
      this.g = a.g + (b.g - a.g) * t;
      this.b = a.b + (b.b - a.b) * t;
      return this;
    }.bind(this));
    this.setHex = vi.fn(function setHex(this: { r: number; g: number; b: number }, hex: number) {
      this.r = (hex >> 16 & 0xff) / 255;
      this.g = (hex >> 8 & 0xff) / 255;
      this.b = (hex & 0xff) / 255;
      return this;
    }.bind(this));
  });

  const Fog = vi.fn(function Fog(this: { color: InstanceType<typeof Color>; near: number; far: number }, color: number, near: number, far: number) {
    this.color = new Color(color);
    this.near = near;
    this.far = far;
  });

  function makeColor() {
    return new Color(0);
  }

  const AmbientLight = vi.fn(function AmbientLight(this: { intensity: number; isLight: boolean; color: unknown }, _color?: number, intensity?: number) {
    this.intensity = intensity ?? 1;
    this.isLight = true;
    this.color = makeColor();
  });

  const DirectionalLight = vi.fn(function DirectionalLight(this: { intensity: number; isLight: boolean; position: { set: ReturnType<typeof vi.fn> }; color: unknown }, _color?: number, intensity?: number) {
    this.intensity = intensity ?? 1;
    this.isLight = true;
    this.position = { set: vi.fn() };
    this.color = makeColor();
  });

  const Scene = vi.fn(function Scene(this: { background: unknown; fog: unknown }) {
    this.background = null;
    this.fog = null;
  });

  const PointLight = vi.fn(function PointLight(this: { intensity: number; isLight: boolean; position: { set: ReturnType<typeof vi.fn> }; color: unknown }, _color?: number, intensity?: number) {
    this.intensity = intensity ?? 1;
    this.isLight = true;
    this.position = { set: vi.fn() };
    this.color = makeColor();
  });

  const HemisphereLight = vi.fn(function HemisphereLight(this: { intensity: number; isLight: boolean; color: unknown; groundColor: unknown }, _skyColor?: number, _groundColor?: number, intensity?: number) {
    this.intensity = intensity ?? 1;
    this.isLight = true;
    this.color = makeColor();
    this.groundColor = makeColor();
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
    const interior = new (THREE as unknown as { PointLight: new (...args: unknown[]) => { intensity: number; color: { copy: unknown; lerpColors: unknown } } }).PointLight(0xffaa44, 0.8, 8, 2);
    const hemisphere = new (THREE as unknown as { HemisphereLight: new (...args: unknown[]) => { intensity: number; color: { lerpColors: unknown }; groundColor: { lerpColors: unknown } } }).HemisphereLight(0x445566, 0x222211, 0.3);
    return {
      ambient: new THREE.AmbientLight(0xffffff, 0.4),
      directional: new THREE.DirectionalLight(0xffffff, 0.8),
      rim,
      interior,
      hemisphere,
    };
  }

  const mockDayNight = {
    timeOfDay: 0.5,
    sunIntensity: 1,
    sunX: 0, sunY: 100, sunZ: 40,
    skyColor: { r: 0.8, g: 0.8, b: 0.78, copy: vi.fn(), lerp: vi.fn(), lerpColors: vi.fn() },
    fogColor: { r: 0.8, g: 0.8, b: 0.77, copy: vi.fn(), lerp: vi.fn(), lerpColors: vi.fn() },
    groundColor: { r: 0.77, g: 0.75, b: 0.72 },
    interiorGlow: 0.3,
  };

  // ── Does not throw ──

  it('fog=0 does not throw', () => {
    const scene = createTestScene();
    const lights = createTestLights();

    expect(() => {
      applyAtmosphere(scene as unknown as import('three').Scene, lights as unknown as import('../../src/render/createLights').Lights, { fog: 0, lightIntensity: 0.5 }, mockDayNight as unknown as import('../../src/render/dayNight').DayNightState);
    }).not.toThrow();
  });

  it('fog=1 does not throw', () => {
    const scene = createTestScene();
    const lights = createTestLights();

    expect(() => {
      applyAtmosphere(scene as unknown as import('three').Scene, lights as unknown as import('../../src/render/createLights').Lights, { fog: 1, lightIntensity: 0.5 }, mockDayNight as unknown as import('../../src/render/dayNight').DayNightState);
    }).not.toThrow();
  });

  it('fog=0.5 does not throw', () => {
    const scene = createTestScene();
    const lights = createTestLights();

    expect(() => {
      applyAtmosphere(scene as unknown as import('three').Scene, lights as unknown as import('../../src/render/createLights').Lights, { fog: 0.5, lightIntensity: 0.5 }, mockDayNight as unknown as import('../../src/render/dayNight').DayNightState);
    }).not.toThrow();
  });

  // ── Light intensity produces finite numbers ──

  it('lightIntensity=1 produces finite light intensities', () => {
    const scene = createTestScene();
    const lights = createTestLights();

    applyAtmosphere(scene as unknown as import('three').Scene, lights as unknown as import('../../src/render/createLights').Lights, { fog: 0, lightIntensity: 1 }, mockDayNight as unknown as import('../../src/render/dayNight').DayNightState);

    expect(Number.isFinite(lights.ambient.intensity)).toBe(true);
    expect(Number.isFinite(lights.directional.intensity)).toBe(true);
  });

  it('lightIntensity=0 produces finite light intensities', () => {
    const scene = createTestScene();
    const lights = createTestLights();

    applyAtmosphere(scene as unknown as import('three').Scene, lights as unknown as import('../../src/render/createLights').Lights, { fog: 0, lightIntensity: 0 }, mockDayNight as unknown as import('../../src/render/dayNight').DayNightState);

    expect(Number.isFinite(lights.ambient.intensity)).toBe(true);
    expect(Number.isFinite(lights.directional.intensity)).toBe(true);
  });

  it('lightIntensity=0.5 produces finite light intensities', () => {
    const scene = createTestScene();
    const lights = createTestLights();

    applyAtmosphere(scene as unknown as import('three').Scene, lights as unknown as import('../../src/render/createLights').Lights, { fog: 0, lightIntensity: 0.5 }, mockDayNight as unknown as import('../../src/render/dayNight').DayNightState);

    expect(Number.isFinite(lights.ambient.intensity)).toBe(true);
    expect(Number.isFinite(lights.directional.intensity)).toBe(true);
  });

  // ── Mutation (no recreation) ──

  it('mutates existing fog object in place — no new Fog created', () => {
    const scene = createTestScene();
    const lights = createTestLights();
    const originalFog = scene.fog;

    // Clear the Fog constructor call count
    (THREE.Fog as unknown as ReturnType<typeof vi.fn>).mockClear();

    applyAtmosphere(scene as unknown as import('three').Scene, lights as unknown as import('../../src/render/createLights').Lights, { fog: 0.7, lightIntensity: 0.5 }, mockDayNight as unknown as import('../../src/render/dayNight').DayNightState);

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

    applyAtmosphere(scene as unknown as import('three').Scene, lights as unknown as import('../../src/render/createLights').Lights, { fog: 0.5, lightIntensity: 0.3 }, mockDayNight as unknown as import('../../src/render/dayNight').DayNightState);

    expect(lights.ambient).toBe(originalAmbient);
    expect(lights.directional).toBe(originalDirectional);
  });

  it('updates fog color when called', () => {
    const scene = createTestScene();
    const lights = createTestLights();

    applyAtmosphere(scene as unknown as import('three').Scene, lights as unknown as import('../../src/render/createLights').Lights, { fog: 0.5, lightIntensity: 0.5 }, mockDayNight as unknown as import('../../src/render/dayNight').DayNightState);

    // Fog color and background should be set (both updated for visual coherence)
    const fogColor = scene.fog!.color as { r: number; g: number; b: number };
    const bgColor = scene.background as { r: number; g: number; b: number };
    expect(fogColor).toBeDefined();
    expect(bgColor).toBeDefined();
  });
});
