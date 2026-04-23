import { initShell } from './ui/shell';
import { initRenderer } from './render';
import { mapSnapshotToScene } from './domain/snapshotToScene';
import { ProbeSampler } from './metrics/probeSampler';
import { ResourceTimingCollector } from './metrics/resourceTiming';
import { MetricsAggregator } from './metrics/aggregator';
import { createVisibilityManager } from './ui/visibilityManager';
import { createDebugHud } from './ui/debugHud';
import { createKeyboardToggle } from './ui/keyboardToggle';
import { initInfoUI } from './ui/infoOverlay';
import { createDebugSlider } from './ui/debugSlider';

const { canvas, overlay } = initShell();
const renderer = initRenderer(canvas);

// Live network metrics
const probeSampler = new ProbeSampler();
const resourceTimingCollector = new ResourceTimingCollector();

const aggregator = new MetricsAggregator({
  probeSampler,
  resourceTimingCollector,
});

probeSampler.start();
resourceTimingCollector.start();
aggregator.start();

// Throttle when tab is hidden
const visibilityManager = createVisibilityManager();

visibilityManager.onHidden(() => {
  probeSampler.stop();
  aggregator.stop();
});

visibilityManager.onVisible(() => {
  probeSampler.start();
  aggregator.start();
});

// Debug HUD (backtick key)
const debugHud = createDebugHud(overlay);
const keyboardToggle = createKeyboardToggle('`', () => debugHud.toggle());

// Debug slider (?debug URL param)
const debugSlider = createDebugSlider();

// Info overlay
initInfoUI();

function applySnapshot(snapshot: import('./domain/types').NetworkSnapshot): void {
  const sceneParams = mapSnapshotToScene(snapshot);
  debugHud.update(snapshot, sceneParams);
  renderer.update(sceneParams);
  // Pass time override to renderer (null = use real clock)
  renderer.setTimeOverride(debugSlider.getTimeOverride());
}

// Initial render
applySnapshot(aggregator.getSnapshot());

// Live updates — debug slider overrides live data when active
aggregator.subscribe((snapshot) => {
  const override = debugSlider.getOverride();
  applySnapshot(override ?? snapshot);
});

void renderer;
void visibilityManager;
void keyboardToggle;
