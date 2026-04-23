/**
 * Day/night cycle driven by local time of day.
 *
 * 0 = midnight, 0.25 = 6am, 0.5 = noon, 0.75 = 6pm, 1 = midnight
 */
import {
  Group, Mesh, SphereGeometry, BufferGeometry, Float32BufferAttribute,
  Points, PointsMaterial, MeshBasicMaterial, Color,
  PlaneGeometry, ShaderMaterial, DoubleSide,
} from 'three';

export interface DayNightState {
  timeOfDay: number;
  /** 0=full night, 1=full day */
  sunIntensity: number;
  sunX: number;
  sunY: number;
  sunZ: number;
  skyColor: Color;
  fogColor: Color;
  groundColor: Color;
  /** How much interior glow (higher at night) */
  interiorGlow: number;
  /** 0-1, how much sunset/sunrise glow */
  horizonGlow: number;
  /** Horizon glow color */
  horizonColor: Color;
}

const NOON_SKY = new Color(0xb8c8d8);
const DUSK_SKY = new Color(0x2a2040);
const NIGHT_SKY = new Color(0x060810);

const NOON_FOG = new Color(0xc5c0b8);
const NIGHT_FOG = new Color(0x060608);

const NOON_GROUND = new Color(0xc5c0b8);
const NIGHT_GROUND = new Color(0x0a0a0e);

/** Get current time of day as 0-1. */
export function getTimeOfDay(): number {
  const now = new Date();
  return (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400;
}

/** Smooth sun intensity. Dawn 5-7, dusk 19-21. */
function sunCurve(t: number): number {
  const h = t * 24;
  if (h >= 7 && h <= 19) return 1;
  if (h <= 5 || h >= 21) return 0;
  if (h < 7) return smoothstep((h - 5) / 2);
  return smoothstep((21 - h) / 2);
}

function smoothstep(x: number): number {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

function lerpC(a: Color, b: Color, t: number): Color {
  return new Color().lerpColors(a, b, t);
}

export function computeDayNight(timeOfDay: number): DayNightState {
  const sun = sunCurve(timeOfDay);

  // Sun position: arc from east to west, Y follows sine curve
  const sunAngle = (timeOfDay - 0.25) * Math.PI * 2;
  const rawSunY = Math.sin(sunAngle);
  // Sun Y tracks its actual geometric position — goes negative below horizon
  const sunY = rawSunY * 100 + 5;
  const sunX = Math.cos(sunAngle) * 80;
  const sunZ = 40;

  // Horizon glow: strongest during dawn/dusk transition (sun near 0.1-0.6)
  const horizonGlow = sun > 0 && sun < 0.8 ? Math.sin(sun / 0.8 * Math.PI) : 0;

  // Sky color: multi-stage blend
  // night → dusk purple → noon blue-gray
  let skyColor: Color;
  if (sun > 0.6) {
    skyColor = lerpC(DUSK_SKY, NOON_SKY, (sun - 0.6) / 0.4);
  } else if (sun > 0) {
    skyColor = lerpC(NIGHT_SKY, DUSK_SKY, sun / 0.6);
  } else {
    skyColor = NIGHT_SKY.clone();
  }

  // Horizon glow color: warm orange → pink → pale yellow as sun rises
  let horizonColor: Color;
  if (sun < 0.3) {
    horizonColor = lerpC(new Color(0xff4400), new Color(0xff8855), sun / 0.3);
  } else if (sun < 0.7) {
    horizonColor = lerpC(new Color(0xff8855), new Color(0xffddaa), (sun - 0.3) / 0.4);
  } else {
    horizonColor = lerpC(new Color(0xffddaa), new Color(0xffffff), (sun - 0.7) / 0.3);
  }

  const fogColor = lerpC(NIGHT_FOG, NOON_FOG, sun);
  const groundColor = lerpC(NIGHT_GROUND, NOON_GROUND, sun);
  const interiorGlow = 1 - sun * 0.7;

  return {
    timeOfDay, sunIntensity: sun,
    sunX, sunY, sunZ,
    skyColor, fogColor, groundColor,
    interiorGlow, horizonGlow, horizonColor,
  };
}

/** Create star field + moon + sun disc + horizon glow plane. */
export function createSkyObjects(): Group {
  const group = new Group();

  // Stars
  const starCount = 1000;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random());
    const r = 450 + Math.random() * 30;
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.cos(phi);
    starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starGeo = new BufferGeometry();
  starGeo.setAttribute('position', new Float32BufferAttribute(starPositions, 3));
  const starMat = new PointsMaterial({ color: 0xffffff, size: 1.0, sizeAttenuation: true, fog: false });
  const stars = new Points(starGeo, starMat);
  stars.userData._skyObj = 'stars';
  group.add(stars);

  // Moon
  const moon = new Mesh(new SphereGeometry(5, 16, 16), new MeshBasicMaterial({ color: 0xeeeedd, fog: false }));
  moon.position.set(-200, 160, -120);
  moon.userData._skyObj = 'moon';
  group.add(moon);

  // Sun disc
  const sunDisc = new Mesh(new SphereGeometry(12, 24, 24), new MeshBasicMaterial({ color: 0xffeecc, fog: false }));
  sunDisc.userData._skyObj = 'sun';
  group.add(sunDisc);

  // Horizon glow plane — large vertical plane behind the scene, with gradient shader
  const horizonGeo = new PlaneGeometry(1200, 200);
  const horizonMat = new ShaderMaterial({
    transparent: true,
    side: DoubleSide,
    depthWrite: false,
    uniforms: {
      uColor: { value: new Color(0xff8844) },
      uIntensity: { value: 0.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uIntensity;
      varying vec2 vUv;
      void main() {
        // Gradient: strong at bottom (horizon), fading to transparent at top
        float fade = 1.0 - vUv.y;
        fade = fade * fade; // quadratic falloff
        gl_FragColor = vec4(uColor, fade * uIntensity * 0.6);
      }
    `,
  });
  const horizonPlane = new Mesh(horizonGeo, horizonMat);
  horizonPlane.userData._skyObj = 'horizon';
  group.add(horizonPlane);

  return group;
}

/** Update sky object positions, visibility, colors. */
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
      // Sun disc tracks the light source position exactly
      const scale = 4.5;
      obj.position.set(state.sunX * scale, state.sunY * scale, state.sunZ * scale);
      // Only visible when sun intensity > 0 (tied to light emission)
      obj.visible = sun > 0.02;

      const mat = (obj as Mesh).material as MeshBasicMaterial;
      // Fade in/out with sun intensity
      mat.transparent = true;
      mat.opacity = Math.min(1, sun * 3);

      // Color: deep red-orange when low, white-yellow when high
      if (sun < 0.3) {
        mat.color.lerpColors(new Color(0xff3300), new Color(0xffaa44), sun / 0.3);
      } else if (sun < 0.7) {
        mat.color.lerpColors(new Color(0xffaa44), new Color(0xfff8e0), (sun - 0.3) / 0.4);
      } else {
        mat.color.setHex(0xfff8e0);
      }
    }
    if (obj.userData._skyObj === 'horizon') {
      // Position the horizon glow plane where the sun is, at ground level
      obj.position.set(state.sunX * 3, 40, state.sunZ * 3);
      // Face the camera (always perpendicular to the sun direction)
      obj.lookAt(0, 40, 0);

      const mat = (obj as Mesh).material as ShaderMaterial;
      mat.uniforms.uIntensity.value = state.horizonGlow;
      mat.uniforms.uColor.value.copy(state.horizonColor);
    }
  });
}
