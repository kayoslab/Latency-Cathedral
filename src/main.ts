import { initShell } from './ui/shell';
import { initRenderer } from './render';

const { canvas, overlay } = initShell();
const renderer = initRenderer(canvas);

// References available for future wiring (HUD, dispose on unload)
void overlay;
void renderer;
