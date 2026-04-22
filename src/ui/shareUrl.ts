import type { PresetState } from '../domain/presetState';
import { buildPresetUrl } from '../domain/presetUrl';

export function initShareUrl(
  overlay: HTMLDivElement,
  presetState: PresetState,
): { dispose(): void } {
  const btn = document.createElement('button');
  btn.textContent = 'Share';
  btn.setAttribute('data-action', 'share-url');
  btn.style.position = 'absolute';
  btn.style.bottom = '12px';
  btn.style.right = '100px';
  btn.style.pointerEvents = 'auto';
  btn.style.padding = '4px 10px';
  btn.style.cursor = 'pointer';
  btn.style.border = '1px solid #888';
  btn.style.borderRadius = '3px';
  btn.style.background = '#1a1a2e';
  btn.style.color = '#ccc';
  btn.style.fontSize = '12px';

  btn.addEventListener('click', () => {
    const current = presetState.current();
    if (!current) return;
    const shareUrl = buildPresetUrl(
      location.origin + location.pathname,
      current.name,
    );
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(shareUrl).catch(() => {
        // Clipboard unavailable or permission denied — silently ignore
      });
    }
  });

  const unsubscribe = presetState.subscribe((_snapshot, name) => {
    const url = buildPresetUrl(
      location.origin + location.pathname,
      name,
    );
    history.replaceState(null, '', url);
  });

  overlay.appendChild(btn);

  return {
    dispose() {
      btn.remove();
      unsubscribe();
    },
  };
}
