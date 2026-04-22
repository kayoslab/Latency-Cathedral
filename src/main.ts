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

const { canvas, overlay } = initShell();
const renderer = initRenderer(canvas);

const presetState = createPresetState();
initPresetSelector(overlay, presetState);

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

// Seed HUD with initial snapshot so it has content before first aggregator tick
{
  const initialSnapshot = aggregator.getSnapshot();
  debugHud.update(initialSnapshot, mapSnapshotToScene(initialSnapshot));
}

aggregator.subscribe((snapshot) => {
  const scene = mapSnapshotToScene(snapshot);
  debugHud.update(snapshot, scene);
  console.log('[aggregator] snapshot → scene', scene);
});

presetState.subscribe((snapshot, name) => {
  const scene = mapSnapshotToScene(snapshot);
  debugHud.update(snapshot, scene);
  console.log(`[preset] ${name}`, snapshot);
});

// References available for future disposal
void renderer;
void visibilityManager;
void keyboardToggle;
