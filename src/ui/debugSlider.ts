/**
 * Debug sliders — activated via ?debug URL parameter.
 * Degradation slider: controls RTT override (0-1000ms).
 * Time slider: controls time of day override (0-24h).
 */
import type { NetworkSnapshot } from '../domain/types';

export interface DebugSliderHandle {
  getOverride(): NetworkSnapshot | null;
  getTimeOverride(): number | null;
}

export function createDebugSlider(): DebugSliderHandle {
  const enabled = new URLSearchParams(location.search).has('debug');
  if (!enabled) {
    return { getOverride: () => null, getTimeOverride: () => null };
  }

  let rttOverride = 0;
  let timeOverride: number | null = null;

  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 15;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 10px 16px;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    border-radius: 6px;
    pointer-events: auto;
    font-family: monospace;
    font-size: 11px;
    color: rgba(255,255,255,0.7);
  `;

  // ── Degradation slider ──
  const row1 = document.createElement('div');
  row1.style.cssText = 'display: flex; align-items: center; gap: 8px;';

  const label1 = document.createElement('span');
  label1.textContent = 'Degradation';
  label1.style.minWidth = '80px';

  const slider1 = document.createElement('input');
  slider1.type = 'range'; slider1.min = '0'; slider1.max = '1000'; slider1.value = '0';
  slider1.style.cssText = 'width: 180px; cursor: pointer;';

  const val1 = document.createElement('span');
  val1.textContent = '0ms';
  val1.style.minWidth = '45px';

  slider1.addEventListener('input', () => {
    rttOverride = parseInt(slider1.value);
    val1.textContent = `${rttOverride}ms`;
  });

  row1.appendChild(label1);
  row1.appendChild(slider1);
  row1.appendChild(val1);

  // ── Time slider ──
  const row2 = document.createElement('div');
  row2.style.cssText = 'display: flex; align-items: center; gap: 8px;';

  const label2 = document.createElement('span');
  label2.textContent = 'Time of day';
  label2.style.minWidth = '80px';

  const slider2 = document.createElement('input');
  slider2.type = 'range'; slider2.min = '0'; slider2.max = '1440'; slider2.value = '-1';
  slider2.style.cssText = 'width: 180px; cursor: pointer;';

  const val2 = document.createElement('span');
  val2.textContent = 'live';
  val2.style.minWidth = '45px';

  slider2.addEventListener('input', () => {
    const mins = parseInt(slider2.value);
    if (mins < 0) {
      timeOverride = null;
      val2.textContent = 'live';
    } else {
      timeOverride = mins / 1440;
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      val2.textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
  });

  row2.appendChild(label2);
  row2.appendChild(slider2);
  row2.appendChild(val2);

  container.appendChild(row1);
  container.appendChild(row2);
  document.body.appendChild(container);

  return {
    getOverride(): NetworkSnapshot | null {
      if (rttOverride === 0) return null;
      return {
        samples: [],
        medianRtt: rttOverride,
        jitter: rttOverride * 0.4,
        packetLoss: Math.min(rttOverride / 2000, 0.5),
        bandwidth: Math.max(1, 50 - rttOverride / 25),
        timestampMs: Date.now(),
      };
    },
    getTimeOverride(): number | null {
      return timeOverride;
    },
  };
}
