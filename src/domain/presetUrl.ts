import type { PresetName } from './presets';
import { PRESET_SNAPSHOTS } from './presets';

const VALID_PRESETS = Object.keys(PRESET_SNAPSHOTS) as PresetName[];

export function parsePresetFromUrl(search: string): PresetName | null {
  const params = new URLSearchParams(search);
  const value = params.get('preset');
  if (value && VALID_PRESETS.includes(value as PresetName)) {
    return value as PresetName;
  }
  return null;
}

export function buildPresetUrl(base: string, preset: PresetName): string {
  const questionIdx = base.indexOf('?');
  if (questionIdx === -1) {
    return `${base}?preset=${preset}`;
  }
  const origin = base.slice(0, questionIdx);
  const params = new URLSearchParams(base.slice(questionIdx + 1));
  params.set('preset', preset);
  return `${origin}?${params.toString()}`;
}
