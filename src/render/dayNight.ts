/**
 * Day/night cycle driven by local time of day.
 *
 * Computes sun position, sky colors, and lighting parameters.
 * 0 = midnight, 0.25 = 6am (dawn), 0.5 = noon, 0.75 = 6pm (dusk), 1 = midnight
 */
import {
  Group, Mesh, SphereGeometry, BufferGeometry, Float32BufferAttribute,
  Points, PointsMaterial, MeshBasicMaterial, Color,
} from 'three';

export interface DayNightState {
  /** 0-1 where 0=midnight, 0.5=noon */
  timeOfDay: number;
  /** 0=full night, 1=full day, smooth transition at dawn/dusk */
  sunIntensity: number;
  /** Sun position on a hemisphere (x, y, z) */
  sunX: number;
  sunY: number;
  sunZ: number;
  /** Sky color for this time */
  skyColor: Color;
  /** Fog color */
  fogColor: Color;
  /** Ground color */
  groundColor: Color;
  /** How much interior glow (higher at night) */
  interiorGlow: number;
}

// Sky colors at different times
const NOON_SKY = new Color(0xd5d0c8);     // warm gallery gray
const SUNSET_SKY = new Color(0xc07040);   // warm orange
const NIGHT_SKY = new Color(0x080810);    // deep blue-black
const DAWN_SKY = new Color(0x8888a0);     // cool pre-dawn

const NOON_FOG = new Color(0xd0ccc5);
const NIGHT_FOG = new Color(0x060608);

const NOON_GROUND = new Color(0xc5c0b8);
const NIGHT_GROUND = new Color(0x0a0a0e);

/** Get current time of day as 0-1 from local clock. */
export function getTimeOfDay(): number {
  const now = new Date();
  return (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400;
}

/** Compute smooth sun intensity from time. Dawn 5-7am, dusk 19-21. */
function sunCurve(t: number): number {
  // Convert to hours
  const h = t * 24;
  if (h >= 7 && h <= 19) return 1; // full day
  if (h <= 5 || h >= 21) return 0; // full night
  if (h < 7) return smoothstep((h - 5) / 2); // dawn
  return smoothstep((21 - h) / 2); // dusk
}

function smoothstep(x: number): number {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

function lerpColor(a: Color, b: Color, t: number): Color {
  return new Color().lerpColors(a, b, t);
}

export function computeDayNight(timeOfDay: number): DayNightState {
  const sun = sunCurve(timeOfDay);

  // Sun arc: rises in east (+X), peaks overhead, sets in west (-X)
  const sunAngle = (timeOfDay - 0.25) * Math.PI * 2; // 6am = horizon, noon = top
  const sunY = Math.max(0, Math.sin(sunAngle)) * 100 + 5;
  const sunX = Math.cos(sunAngle) * 80;
  const sunZ = 40;

  // Sky color: blend based on sun intensity + special sunset/dawn tint
  let skyColor: Color;
  if (sun > 0.8) {
    skyColor = lerpColor(SUNSET_SKY, NOON_SKY, (sun - 0.8) / 0.2);
  } else if (sun > 0.1) {
    skyColor = lerpColor(NIGHT_SKY, SUNSET_SKY, (sun - 0.1) / 0.7);
  } else {
    skyColor = lerpColor(NIGHT_SKY, DAWN_SKY, sun / 0.1);
  }

  const fogColor = lerpColor(NIGHT_FOG, NOON_FOG, sun);
  const groundColor = lerpColor(NIGHT_GROUND, NOON_GROUND, sun);

  // Interior glow: brighter at night, dim during day
  const interiorGlow = 1 - sun * 0.7;

  return {
    timeOfDay,
    sunIntensity: sun,
    sunX, sunY, sunZ,
    skyColor, fogColor, groundColor,
    interiorGlow,
  };
}

/** Create star field + moon + sun disc. */
export function createSkyObjects(): Group {
  const group = new Group();

  // Stars: random points on upper hemisphere
  const starCount = 1000;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random()); // upper hemisphere only
    const r = 450 + Math.random() * 30;
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.cos(phi);
    starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starGeo = new BufferGeometry();
  starGeo.setAttribute('position', new Float32BufferAttribute(starPositions, 3));
  const starMat = new PointsMaterial({ color: 0xffffff, size: 1.0, sizeAttenuation: true });
  const stars = new Points(starGeo, starMat);
  stars.userData._skyObj = 'stars';
  group.add(stars);

  // Moon
  const moonGeo = new SphereGeometry(5, 16, 16);
  const moonMat = new MeshBasicMaterial({ color: 0xeeeedd });
  const moon = new Mesh(moonGeo, moonMat);
  moon.position.set(-200, 160, -120);
  moon.userData._skyObj = 'moon';
  group.add(moon);

  // Sun disc — bright glowing sphere that tracks the directional light position
  const sunGeo = new SphereGeometry(12, 24, 24);
  const sunMat = new MeshBasicMaterial({ color: 0xffeecc });
  const sunDisc = new Mesh(sunGeo, sunMat);
  sunDisc.userData._skyObj = 'sun';
  group.add(sunDisc);

  return group;
}

/** Update sky object visibility, positions, and brightness. */
export function updateSkyObjects(group: Group, sun: number, state: DayNightState): void {
  const nightFade = Math.max(0, 1 - sun * 2);

  group.traverse((obj) => {
    if (obj.userData._skyObj === 'stars') {
      const mat = (obj as Points).material as PointsMaterial;
      mat.opacity = nightFade * 0.8;
      mat.transparent = true;
      obj.visible = nightFade > 0.01;
    }
    if (obj.userData._skyObj === 'moon') {
      obj.visible = nightFade > 0.05;
      const mat = (obj as Mesh).material as MeshBasicMaterial;
      mat.opacity = nightFade;
      mat.transparent = true;
    }
    if (obj.userData._skyObj === 'sun') {
      // Position sun disc far away in the direction of the directional light
      const scale = 4.5; // push it far toward the horizon
      obj.position.set(state.sunX * scale, state.sunY * scale, state.sunZ * scale);
      obj.visible = state.sunY > 2; // hide when below horizon

      // Color: white-yellow at noon, deep orange at sunrise/sunset
      const mat = (obj as Mesh).material as MeshBasicMaterial;
      if (sun > 0.5) {
        mat.color.setHex(0xfff8e0);
      } else if (sun > 0) {
        mat.color.lerpColors(new Color(0xff6622), new Color(0xfff8e0), sun * 2);
      }
    }
  });
}
