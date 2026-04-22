/**
 * Debug degradation slider — activated via ?debug URL parameter.
 * Provides a manual slider to control ruinLevel from 0 to 1,
 * overriding live network measurements.
 */
import type { NetworkSnapshot } from '../domain/types';

export interface DebugSliderHandle {
  /** Returns an override snapshot if the slider is active, null otherwise. */
  getOverride(): NetworkSnapshot | null;
}

export function createDebugSlider(): DebugSliderHandle {
  const enabled = new URLSearchParams(location.search).has('debug');
  if (!enabled) {
    return { getOverride: () => null };
  }

  let rttOverride = 0;

  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 15;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 16px;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    border-radius: 6px;
    pointer-events: auto;
    font-family: monospace;
    font-size: 11px;
    color: rgba(255,255,255,0.7);
  `;

  const label = document.createElement('span');
  label.textContent = 'Degradation';

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '1000';
  slider.value = '0';
  slider.style.cssText = 'width: 200px; cursor: pointer;';

  const valueLabel = document.createElement('span');
  valueLabel.textContent = '0ms';
  valueLabel.style.minWidth = '50px';

  slider.addEventListener('input', () => {
    rttOverride = parseInt(slider.value);
    valueLabel.textContent = `${rttOverride}ms`;
  });

  container.appendChild(label);
  container.appendChild(slider);
  container.appendChild(valueLabel);
  document.body.appendChild(container);

  return {
    getOverride(): NetworkSnapshot | null {
      if (rttOverride === 0) return null;
      // Map slider 0-1000 to RTT, with jitter proportional
      return {
        samples: [],
        medianRtt: rttOverride,
        jitter: rttOverride * 0.4,
        packetLoss: Math.min(rttOverride / 2000, 0.5),
        bandwidth: Math.max(1, 50 - rttOverride / 25),
        timestampMs: Date.now(),
      };
    },
  };
}
