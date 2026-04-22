import type { NetworkSnapshot, SceneParams } from '../domain/types';
import { deriveQualityBand } from '../domain/qualityBand';

export interface DebugHud {
  update(snapshot: NetworkSnapshot, scene: SceneParams): void;
  toggle(): void;
  isVisible(): boolean;
  dispose(): void;
}

export function createDebugHud(overlay: HTMLDivElement): DebugHud {
  const el = document.createElement('pre');
  el.setAttribute('data-testid', 'debug-hud');
  el.style.position = 'absolute';
  el.style.bottom = '12px';
  el.style.left = '12px';
  el.style.margin = '0';
  el.style.padding = '8px 12px';
  el.style.background = 'rgba(0, 0, 0, 0.75)';
  el.style.color = '#0f0';
  el.style.fontSize = '11px';
  el.style.fontFamily = 'monospace';
  el.style.pointerEvents = 'none';
  el.style.whiteSpace = 'pre';
  el.style.display = 'none';

  el.textContent =
    'Latency (RTT): -- ms\n' +
    'Jitter:        -- ms\n' +
    'Packet Loss:   --%\n' +
    'Quality Band:  --\n' +
    '───────────────────\n' +
    'Awaiting first snapshot…';

  overlay.appendChild(el);

  let visible = false;
  let disposed = false;

  return {
    update(snapshot: NetworkSnapshot, scene: SceneParams) {
      if (disposed) return;
      const band = deriveQualityBand(snapshot);
      el.textContent =
        `Latency (RTT): ${snapshot.medianRtt.toFixed(1)} ms\n` +
        `Jitter:        ${snapshot.jitter.toFixed(1)} ms\n` +
        `Packet Loss:   ${(snapshot.packetLoss * 100).toFixed(1)}%\n` +
        `Quality Band:  ${band}\n` +
        `───────────────────\n` +
        `Height:        ${scene.height.toFixed(2)}\n` +
        `Symmetry:      ${scene.symmetry.toFixed(2)}\n` +
        `Fracture:      ${scene.fracture.toFixed(2)}\n` +
        `Fog:           ${scene.fog.toFixed(2)}\n` +
        `Light:         ${scene.lightIntensity.toFixed(2)}\n` +
        `Ruin Level:    ${scene.ruinLevel.toFixed(2)}`;
    },

    toggle() {
      if (disposed) return;
      visible = !visible;
      el.style.display = visible ? 'block' : 'none';
    },

    isVisible() {
      return visible && !disposed;
    },

    dispose() {
      disposed = true;
      visible = false;
      el.remove();
    },
  };
}
