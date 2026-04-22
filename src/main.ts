import { initShell } from './ui/shell';
import { initRenderer } from './render';
import { createPresetState } from './domain/presetState';
import { initPresetSelector } from './ui/presetSelector';

const { canvas, overlay } = initShell();
const renderer = initRenderer(canvas);

const presetState = createPresetState();
initPresetSelector(overlay, presetState);

presetState.subscribe((snapshot, name) => {
  console.log(`[preset] ${name}`, snapshot);
});

// References available for future wiring (HUD, dispose on unload)
void renderer;
