export interface Shell {
  canvas: HTMLCanvasElement;
  overlay: HTMLDivElement;
}

export function initShell(): Shell {
  const el = document.getElementById('cathedral');
  if (!(el instanceof HTMLCanvasElement)) {
    throw new Error('Missing <canvas id="cathedral"> element');
  }
  const canvas: HTMLCanvasElement = el;

  const overlayEl = document.getElementById('overlay');
  if (!(overlayEl instanceof HTMLDivElement)) {
    throw new Error('Missing <div id="overlay"> element');
  }
  const overlay: HTMLDivElement = overlayEl;

  return { canvas, overlay };
}
