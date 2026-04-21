import { initShell } from './ui/shell';

const { canvas, overlay } = initShell();

// Shell references available for future wiring (renderer, HUD)
void canvas;
void overlay;
