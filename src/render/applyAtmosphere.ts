import { Color } from 'three';
import type { Scene } from 'three';
import type { Lights } from './createLights';
import type { DayNightState } from './dayNight';

export interface AtmosphereParams {
  fog: number;
  lightIntensity: number;
}

// Fog distances (orbit ~220)
const FOG_NEAR_DAY = 200;
const FOG_NEAR_NIGHT = 120;
const FOG_FAR_DAY = 600;
const FOG_FAR_NIGHT = 500;

// Degradation fog close-in
const FOG_NEAR_DEGRADED = 80;
const FOG_FAR_DEGRADED = 250;

export function applyAtmosphere(
  scene: Scene,
  lights: Lights,
  params: AtmosphereParams,
  dayNight: DayNightState,
): void {
  const { fog, lightIntensity } = params;
  const { sunIntensity, sunX, sunY, sunZ, skyColor, fogColor, interiorGlow } = dayNight;

  // ── Sky + fog color ──
  const degradedColor = new Color(0x4a4540);
  const bg = scene.background as Color;
  bg.copy(skyColor);
  bg.lerp(degradedColor, fog * 0.6);

  const sceneFog = scene.fog as { near: number; far: number; color: Color };
  sceneFog.color.copy(fogColor);
  sceneFog.color.lerp(degradedColor, fog * 0.5);

  // Fog distances: blend day/night base, then tighten with degradation
  const baseNear = FOG_NEAR_DAY + (FOG_NEAR_NIGHT - FOG_NEAR_DAY) * (1 - sunIntensity);
  const baseFar = FOG_FAR_DAY + (FOG_FAR_NIGHT - FOG_FAR_DAY) * (1 - sunIntensity);
  sceneFog.near = baseNear + (FOG_NEAR_DEGRADED - baseNear) * fog;
  sceneFog.far = baseFar + (FOG_FAR_DEGRADED - baseFar) * fog;

  // ── Sun light (directional) ──
  lights.directional.position.set(sunX, sunY, sunZ);
  lights.directional.intensity = sunIntensity * (0.3 + lightIntensity * 1.5);

  // Sun color: warm at low angles, white at noon
  const sunColor = new Color();
  if (sunIntensity > 0.5) {
    sunColor.setHex(0xfff5e0); // noon white-warm
  } else if (sunIntensity > 0) {
    sunColor.lerpColors(new Color(0xff8844), new Color(0xfff5e0), sunIntensity * 2);
  } else {
    sunColor.setHex(0x222244); // no sun
  }
  lights.directional.color.copy(sunColor);

  // ── Ambient ──
  const ambientDay = 0.15 + lightIntensity * 0.35;
  const ambientNight = 0.04 + lightIntensity * 0.06;
  lights.ambient.intensity = ambientDay * sunIntensity + ambientNight * (1 - sunIntensity);
  lights.ambient.color.lerpColors(new Color(0x223344), new Color(0xeeeeff), sunIntensity);

  // ── Rim / moonlight ──
  // At night: strong cool moonlight. During day: subtle fill.
  const moonIntensity = (1 - sunIntensity) * 0.6;
  lights.rim.intensity = sunIntensity * (0.05 + lightIntensity * 0.35) + moonIntensity;
  lights.rim.color.lerpColors(new Color(0x6688bb), new Color(0x8899bb), sunIntensity);
  // Moon position: opposite the sun, high in the sky
  if (sunIntensity < 0.5) {
    lights.rim.position.set(-sunX * 0.8, Math.max(60, 120 - sunY), -sunZ);
  }

  // ── Interior glow ──
  // At night: strong warm glow through windows. During day: subtle.
  // When degraded: flickering creepy glow (computed per frame with slight randomness)
  const baseInterior = interiorGlow * (0.3 + lightIntensity * 1.2);
  const creepyFlicker = fog > 0.3 ? (1 - sunIntensity) * fog * (0.8 + Math.random() * 0.4) : 0;
  lights.interior.intensity = baseInterior + creepyFlicker;
  // Shift interior color: warm gold during good state, sickly green-orange when degraded
  const interiorColor = new Color();
  interiorColor.lerpColors(new Color(0xffaa44), new Color(0x88aa33), fog * 0.4);
  lights.interior.color.copy(interiorColor);

  // ── Hemisphere ──
  lights.hemisphere.intensity = sunIntensity * (0.08 + lightIntensity * 0.22) + 0.03;
  lights.hemisphere.color.lerpColors(new Color(0x112233), new Color(0xccddee), sunIntensity);
  lights.hemisphere.groundColor.lerpColors(new Color(0x111108), new Color(0x886644), sunIntensity);
}
