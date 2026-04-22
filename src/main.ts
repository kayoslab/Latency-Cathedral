import { initShell } from './ui/shell';
import { initRenderer } from './render';
import { createPresetState } from './domain/presetState';
import { initPresetSelector } from './ui/presetSelector';
import { mapSnapshotToScene } from './domain/snapshotToScene';
import { ProbeSampler } from './metrics/probeSampler';
import { ResourceTimingCollector } from './metrics/resourceTiming';
import { MetricsAggregator } from './metrics/aggregator';

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

aggregator.subscribe((snapshot) => {
  const scene = mapSnapshotToScene(snapshot);
  console.log('[aggregator] snapshot → scene', scene);
});

presetState.subscribe((snapshot, name) => {
  console.log(`[preset] ${name}`, snapshot);
});

// References available for future wiring (HUD, dispose on unload)
void renderer;
