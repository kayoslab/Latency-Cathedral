export function initPngExport(
  overlay: HTMLDivElement,
  canvas: HTMLCanvasElement,
): { dispose(): void } {
  const btn = document.createElement('button');
  btn.textContent = 'Save PNG';
  btn.setAttribute('data-action', 'export-png');
  btn.style.position = 'absolute';
  btn.style.bottom = '12px';
  btn.style.right = '12px';
  btn.style.pointerEvents = 'auto';
  btn.style.padding = '4px 10px';
  btn.style.cursor = 'pointer';
  btn.style.border = '1px solid #888';
  btn.style.borderRadius = '3px';
  btn.style.background = '#1a1a2e';
  btn.style.color = '#ccc';
  btn.style.fontSize = '12px';

  btn.addEventListener('click', () => {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'latency-cathedral.png';
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  });

  overlay.appendChild(btn);

  return {
    dispose() {
      btn.remove();
    },
  };
}
