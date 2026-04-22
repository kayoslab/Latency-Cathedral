import { Color } from 'three';
import type { Scene } from 'three';
import type { Lights } from './createLights';

export interface AtmosphereParams {
  fog: number;
  lightIntensity: number;
}

const CLEAN_COLOR = new Color(0x1a1a2e);
const MURKY_COLOR = new Color(0x050508);

const FOG_NEAR_MIN = 50;
const FOG_NEAR_MAX = 1;
const FOG_FAR_MIN = 100;
const FOG_FAR_MAX = 8;

const AMBIENT_MIN = 0.15;
const AMBIENT_MAX = 0.6;
const DIRECTIONAL_MIN = 0.3;
const DIRECTIONAL_MAX = 1.0;

export function applyAtmosphere(
  scene: Scene,
  lights: Lights,
  params: AtmosphereParams,
): void {
  const { fog, lightIntensity } = params;

  // Fog near/far: interpolate from clean (far fog) to dense (near fog)
  const sceneFog = scene.fog as { near: number; far: number; color: { r: number; g: number; b: number; lerpColors: (a: Color, b: Color, t: number) => void } };
  sceneFog.near = FOG_NEAR_MIN + (FOG_NEAR_MAX - FOG_NEAR_MIN) * fog;
  sceneFog.far = FOG_FAR_MIN + (FOG_FAR_MAX - FOG_FAR_MIN) * fog;

  // Background and fog color: lerp between clean and murky based on fog
  const bg = scene.background as Color;
  bg.lerpColors(CLEAN_COLOR, MURKY_COLOR, fog);
  sceneFog.color.lerpColors(CLEAN_COLOR, MURKY_COLOR, fog);

  // Light intensities: lerp from dim to bright
  lights.ambient.intensity = AMBIENT_MIN + (AMBIENT_MAX - AMBIENT_MIN) * lightIntensity;
  lights.directional.intensity = DIRECTIONAL_MIN + (DIRECTIONAL_MAX - DIRECTIONAL_MIN) * lightIntensity;
}
