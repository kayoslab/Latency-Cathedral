import { Color } from 'three';
import type { Scene } from 'three';
import type { Lights } from './createLights';

export interface AtmosphereParams {
  fog: number;
  lightIntensity: number;
}

// Clean = soft warm gallery gray, Degraded = dusty brown atmosphere
const CLEAN_COLOR = new Color(0xd5d0c8);
const MURKY_COLOR = new Color(0x4a4540);

// Fog NEVER closes in enough to hide the cathedral entirely
const FOG_NEAR_MIN = 200;
const FOG_NEAR_MAX = 80;
const FOG_FAR_MIN = 600;
const FOG_FAR_MAX = 250;

const AMBIENT_MIN = 0.15;
const AMBIENT_MAX = 0.5;
const DIRECTIONAL_MIN = 0.3;
const DIRECTIONAL_MAX = 1.8;
const RIM_MIN = 0.05;
const RIM_MAX = 0.4;
const INTERIOR_MIN = 0.2;
const INTERIOR_MAX = 1.5;
const HEMI_MIN = 0.08;
const HEMI_MAX = 0.3;

export function applyAtmosphere(
  scene: Scene,
  lights: Lights,
  params: AtmosphereParams,
): void {
  const { fog, lightIntensity } = params;

  const sceneFog = scene.fog as { near: number; far: number; color: { r: number; g: number; b: number; lerpColors: (a: Color, b: Color, t: number) => void } };
  sceneFog.near = FOG_NEAR_MIN + (FOG_NEAR_MAX - FOG_NEAR_MIN) * fog;
  sceneFog.far = FOG_FAR_MIN + (FOG_FAR_MAX - FOG_FAR_MIN) * fog;

  const bg = scene.background as Color;
  bg.lerpColors(CLEAN_COLOR, MURKY_COLOR, fog);
  sceneFog.color.lerpColors(CLEAN_COLOR, MURKY_COLOR, fog);

  lights.ambient.intensity = AMBIENT_MIN + (AMBIENT_MAX - AMBIENT_MIN) * lightIntensity;
  lights.directional.intensity = DIRECTIONAL_MIN + (DIRECTIONAL_MAX - DIRECTIONAL_MIN) * lightIntensity;
  lights.rim.intensity = RIM_MIN + (RIM_MAX - RIM_MIN) * lightIntensity;
  lights.interior.intensity = INTERIOR_MIN + (INTERIOR_MAX - INTERIOR_MIN) * lightIntensity;
  lights.hemisphere.intensity = HEMI_MIN + (HEMI_MAX - HEMI_MIN) * lightIntensity;
}
