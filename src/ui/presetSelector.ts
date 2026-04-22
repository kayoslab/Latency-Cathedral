import type { PresetState } from '../domain/presetState';
import type { PresetName } from '../domain/presets';

const PRESETS: { name: PresetName; label: string }[] = [
  { name: 'fast', label: 'Fast' },
  { name: 'mixed', label: 'Mixed' },
  { name: 'poor', label: 'Poor' },
];

export function initPresetSelector(overlay: HTMLDivElement, state: PresetState): void {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.top = '12px';
  container.style.right = '12px';
  container.style.pointerEvents = 'auto';
  container.style.display = 'flex';
  container.style.gap = '6px';

  const buttons: HTMLButtonElement[] = [];

  for (const preset of PRESETS) {
    const btn = document.createElement('button');
    btn.textContent = preset.label;
    btn.setAttribute('data-preset', preset.name);
    btn.style.padding = '4px 10px';
    btn.style.cursor = 'pointer';
    btn.style.border = '1px solid #888';
    btn.style.borderRadius = '3px';
    btn.style.background = '#1a1a2e';
    btn.style.color = '#ccc';
    btn.style.fontSize = '12px';

    btn.addEventListener('click', () => {
      state.select(preset.name);
      for (const b of buttons) {
        b.classList.remove('active');
      }
      btn.classList.add('active');
    });

    buttons.push(btn);
    container.appendChild(btn);
  }

  overlay.appendChild(container);
}
