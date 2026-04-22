# ADR-015: Reduced Motion and Hidden-Tab Throttling

## Status

Accepted

## Context

Latency Cathedral runs a continuous animation loop and periodic network probes. Users who prefer reduced motion should see a static or near-static scene. When the tab is hidden, continuing to probe and animate wastes resources and battery.

## Decision

### Centralized Managers

Two small manager modules were introduced in `src/ui/`:

- **`visibilityManager.ts`** — Listens to `document.visibilitychange` and exposes `onHidden(cb)` / `onVisible(cb)` subscription hooks. This centralizes visibility tracking so the render loop, probe sampler, and aggregator can all react without each wiring their own listener.

- **`motionManager.ts`** — Listens to `matchMedia('(prefers-reduced-motion: reduce)')` and exposes `isReduced()` and `onChange(cb)`. Extracts the reduced-motion concern into a reusable, testable unit.

Both return unsubscribe functions and a `dispose()` for cleanup.

### Throttling Strategy

When the tab is hidden, **all timer-based work stops completely** rather than running at a reduced cadence:

- `ProbeSampler.stop()` — clears the probe interval
- `MetricsAggregator.stop()` — clears the aggregation interval
- The render loop pauses via `cancelAnimationFrame`

When the tab returns, all three resume via their existing `start()` methods.

This is preferable to reduced-cadence because:
1. Probes fired while hidden measure nothing useful (the browser throttles network activity)
2. Rendering to a hidden canvas is pure waste
3. The sampler's sliding window retains prior samples, so data isn't lost

The `ResourceTimingCollector` uses a `PerformanceObserver` (event-driven, not timer-based) and does not need throttling. Entries arriving during hidden state are still collected at negligible cost.

### Reduced Motion

When `prefers-reduced-motion: reduce` is active, mesh rotation is skipped entirely. The scene still renders each frame (so the canvas is not blank), but no animation occurs. This satisfies "lowers animation intensity" by eliminating motion rather than merely reducing it.

### Idempotency

Both `ProbeSampler.start()` and `MetricsAggregator.start()` guard against duplicate timers (`if (timerId !== null) return`). This makes rapid hide/show cycles safe without additional debouncing logic.

## Consequences

- Probe history will have gaps during hidden periods. This is acceptable because the sampler window retains prior samples and probes during hidden state would be unreliable anyway.
- The `initRenderer` module retains its own inline `visibilitychange` and `matchMedia` listeners for the render loop, keeping the renderer self-contained. The visibility manager in `main.ts` handles metrics throttling separately.
- Adding future timer-based modules requires wiring them to the visibility manager in `main.ts`.
