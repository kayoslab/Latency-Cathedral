import type { PresetState } from '../domain/presetState';
import type { PresetName } from '../domain/presets';

const PRESETS: { name: PresetName | 'live'; label: string; hint: string }[] = [
  { name: 'live', label: 'Live', hint: 'Real network' },
  { name: 'fast', label: 'Fast', hint: '20ms RTT' },
  { name: 'mixed', label: 'Mixed', hint: '350ms RTT' },
  { name: 'poor', label: 'Poor', hint: '950ms RTT' },
];

const BASE_STYLE = `
  padding: 6px 14px;
  cursor: pointer;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 4px;
  background: rgba(13,13,26,0.8);
  color: #aaa;
  font-size: 12px;
  font-family: monospace;
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);
`;

const ACTIVE_BG = 'rgba(100,80,180,0.5)';
const ACTIVE_BORDER = 'rgba(160,120,255,0.6)';

export function initPresetSelector(
  overlay: HTMLDivElement,
  state: PresetState,
  initialPreset?: PresetName | null,
): void {
  const container = document.createElement('div');
  container.style.cssText = `
    position: absolute;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    z-index: 10;
  `;

  // Title label
  const label = document.createElement('span');
  label.textContent = 'LATENCY CATHEDRAL';
  label.style.cssText = `
    font-size: 10px;
    font-family: monospace;
    color: rgba(255,255,255,0.25);
    letter-spacing: 3px;
    white-space: nowrap;
  `;
  container.appendChild(label);

  // Button row
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display: flex; gap: 4px;';

  const buttons: HTMLButtonElement[] = [];

  function setActive(activeBtn: HTMLButtonElement) {
    for (const b of buttons) {
      b.classList.remove('active');
      b.style.background = 'rgba(13,13,26,0.8)';
      b.style.borderColor = 'rgba(255,255,255,0.15)';
      b.style.color = '#aaa';
    }
    activeBtn.classList.add('active');
    activeBtn.style.background = ACTIVE_BG;
    activeBtn.style.borderColor = ACTIVE_BORDER;
    activeBtn.style.color = '#ddd';
  }

  for (const preset of PRESETS) {
    const btn = document.createElement('button');
    btn.textContent = preset.label;
    btn.title = preset.hint;
    btn.setAttribute('data-preset', preset.name);
    btn.style.cssText = BASE_STYLE;

    btn.addEventListener('mouseenter', () => {
      if (btn.style.background !== ACTIVE_BG) {
        btn.style.background = 'rgba(40,35,60,0.8)';
      }
    });
    btn.addEventListener('mouseleave', () => {
      if (btn.style.borderColor !== ACTIVE_BORDER) {
        btn.style.background = 'rgba(13,13,26,0.8)';
      }
    });

    btn.addEventListener('click', () => {
      if (preset.name === 'live') {
        state.clear();
      } else {
        state.select(preset.name);
      }
      setActive(btn);
    });

    buttons.push(btn);
    btnRow.appendChild(btn);
  }

  container.appendChild(btnRow);

  // Set initial active state
  const activeName = initialPreset ?? 'live';
  const activeBtn = buttons.find(
    (b) => b.getAttribute('data-preset') === activeName,
  );
  if (activeBtn) {
    setActive(activeBtn);
    if (initialPreset) state.select(initialPreset);
  }

  overlay.appendChild(container);
}
