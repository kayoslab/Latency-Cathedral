import { initShell } from './ui/shell';
import { initRenderer } from './render';
import { createPresetState } from './domain/presetState';
import { initPresetSelector } from './ui/presetSelector';
import { mapSnapshotToScene } from './domain/snapshotToScene';
import { ProbeSampler } from './metrics/probeSampler';
import { ResourceTimingCollector } from './metrics/resourceTiming';
import { MetricsAggregator } from './metrics/aggregator';
import { createVisibilityManager } from './ui/visibilityManager';
import { createDebugHud } from './ui/debugHud';
import { createKeyboardToggle } from './ui/keyboardToggle';
import { parsePresetFromUrl } from './domain/presetUrl';
import { initPngExport } from './ui/pngExport';
import { initShareUrl } from './ui/shareUrl';

const { canvas, overlay } = initShell();
const renderer = initRenderer(canvas);

const initialPreset = parsePresetFromUrl(location.search);
const presetState = createPresetState(initialPreset ?? undefined);
initPresetSelector(overlay, presetState, initialPreset);
const pngExport = initPngExport(overlay, canvas);
const shareUrl = initShareUrl(overlay, presetState);

const probeSampler = new ProbeSampler();
const resourceTimingCollector = new ResourceTimingCollector();

const aggregator = new MetricsAggregator({
  probeSampler,
  resourceTimingCollector,
  presetState,
});

probeSampler.start();
resourceTimingCollector.start();
aggregator.start();

// Throttle metrics collection when tab is hidden
const visibilityManager = createVisibilityManager();

visibilityManager.onHidden(() => {
  probeSampler.stop();
  aggregator.stop();
});

visibilityManager.onVisible(() => {
  probeSampler.start();
  aggregator.start();
});

const debugHud = createDebugHud(overlay);
const keyboardToggle = createKeyboardToggle('`', () => debugHud.toggle());

// Seed HUD with initial snapshot and build initial cathedral geometry
{
  const initialSnapshot = aggregator.getSnapshot();
  const initialScene = mapSnapshotToScene(initialSnapshot);
  debugHud.update(initialSnapshot, initialScene);
  renderer.update(initialScene);
}

aggregator.subscribe((snapshot) => {
  const sceneParams = mapSnapshotToScene(snapshot);
  debugHud.update(snapshot, sceneParams);
  renderer.update(sceneParams);
  console.log('[aggregator] snapshot → scene', sceneParams);
});

presetState.subscribe((snapshot, name) => {
  const sceneParams = mapSnapshotToScene(snapshot);
  debugHud.update(snapshot, sceneParams);
  renderer.update(sceneParams);
  console.log(`[preset] ${name}`, snapshot);
});

// References available for future disposal
void renderer;
void visibilityManager;
void keyboardToggle;
void pngExport;
void shareUrl;
