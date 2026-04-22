/**
 * Info button + overlay — EAVI-style.
 * Circular ⓘ button in bottom-right, opens an overlay with project info.
 */

const BTN_STYLE = `
  position: fixed;
  bottom: max(1rem, env(safe-area-inset-bottom, 0px));
  right: max(1rem, env(safe-area-inset-right, 0px));
  z-index: 10;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  color: rgba(0, 0, 0, 0.5);
  font-size: 1.25rem;
  cursor: pointer;
  transition: opacity 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
`;

const OVERLAY_STYLE = `
  position: fixed;
  inset: 0;
  z-index: 20;
  display: none;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: env(safe-area-inset-top, 1rem) env(safe-area-inset-right, 1rem) env(safe-area-inset-bottom, 1rem) env(safe-area-inset-left, 1rem);
`;

const PANEL_STYLE = `
  max-width: 28rem;
  width: 90%;
  padding: 2rem;
  position: relative;
  color: rgba(255, 255, 255, 0.85);
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 0.9rem;
  line-height: 1.65;
`;

const CLOSE_STYLE = `
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 1.25rem;
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export function createInfoButton(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.style.cssText = BTN_STYLE;
  btn.textContent = 'ⓘ';
  btn.setAttribute('aria-label', 'About this project');
  btn.addEventListener('mouseenter', () => { btn.style.opacity = '0.9'; });
  btn.addEventListener('mouseleave', () => { btn.style.opacity = '1'; });
  return btn;
}

export function createInfoOverlay(): HTMLDivElement {
  const overlay = document.createElement('div');
  overlay.style.cssText = OVERLAY_STYLE;

  const panel = document.createElement('div');
  panel.style.cssText = PANEL_STYLE;

  const close = document.createElement('button');
  close.style.cssText = CLOSE_STYLE;
  close.textContent = '✕';
  close.setAttribute('aria-label', 'Close');

  panel.innerHTML = `
    <p><strong>Latency Cathedral</strong> is a browser-based generative artwork that
    turns your current network conditions into a gothic cathedral rendered in WebGL.</p>

    <p>The cathedral's form is shaped entirely by live network measurements — round-trip
    time, jitter, and packet loss. A fast, stable connection produces a tall, pristine
    cathedral with glowing stained glass and sharp spires. As conditions degrade, the
    stone darkens, pinnacles crumble, windows shatter, and the structure weathers into
    atmospheric ruins.</p>

    <p>Every network condition creates a unique cathedral. No two moments produce exactly
    the same building.</p>

    <p>No data is stored. No cookies, no tracking. The measurements stay in your browser
    and are used only to shape the geometry you see.</p>

    <p style="margin-top: 1.5rem; opacity: 0.6; font-size: 0.8rem;">
      <a href="https://github.com/kayoslab/Latency-Cathedral"
         target="_blank" rel="noopener noreferrer"
         style="color: rgba(255,255,255,0.7); text-decoration: underline;">
        GitHub Repository
      </a>
    </p>
  `;

  panel.prepend(close);
  overlay.appendChild(panel);

  // Close handlers
  function hide() { overlay.style.display = 'none'; }
  close.addEventListener('click', hide);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) hide(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.style.display === 'flex') hide();
  });

  return overlay;
}

export function initInfoUI(): void {
  const btn = createInfoButton();
  const overlay = createInfoOverlay();

  btn.addEventListener('click', () => {
    overlay.style.display = 'flex';
  });

  document.body.appendChild(btn);
  document.body.appendChild(overlay);
}
