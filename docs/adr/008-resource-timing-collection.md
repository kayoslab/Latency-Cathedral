# ADR-008: Resource Timing Collection

## Status

Accepted

## Context

Latency Cathedral needs secondary telemetry beyond same-origin probe RTT to inform its generative visuals. The browser's Resource Timing API (via `PerformanceObserver`) provides detailed loading metrics for every resource fetched by the page, including duration, transfer size, and response timing.

## Decision

### Use PerformanceObserver, not polling

We observe `'resource'` entries via `PerformanceObserver` rather than polling `performance.getEntriesByType('resource')`. The observer approach is more efficient (event-driven, no timer overhead) and avoids the risk of missing entries that are cleared from the performance buffer.

### Same-origin entries only

Per the Timing-Allow-Origin specification, cross-origin resources report zero for most timing fields unless the server explicitly opts in via the `Timing-Allow-Origin` header. Since our baseline telemetry path uses same-origin probe assets in `public/`, all collected entries will have full timing data available. The collector does not filter by origin at the observer level — it collects all entries — but consumers should be aware that cross-origin durations may be zero.

### Rolling window of 50 entries

The collector maintains a configurable rolling window (default 50 entries) to bound memory usage. Oldest entries are evicted when the window overflows. The window size is configurable via `ResourceTimingCollectorOptions.windowSize`.

### Graceful degradation

`isResourceTimingSupported()` feature-detects `PerformanceObserver` and checks that `'resource'` is in `supportedEntryTypes`. When the API is unavailable:

- `ResourceTimingCollector.start()` no-ops silently
- `ResourceTimingCollector.stop()` no-ops silently
- `ResourceTimingCollector.getEntries()` returns an empty array

This ensures the collector never blocks first render or throws in unsupported environments.

### Duration as primary metric

`duration` (responseEnd - startTime) is the primary metric extracted from each entry. `transferSize` is available as a secondary signal but may be zero for cached resources — this is expected behavior, not an error.

## Consequences

- Downstream consumers (US-009 aggregator, snapshot-to-scene mapper) can use `ResourceTimingEntry` data to influence visuals based on actual page load behavior.
- The `normalizeLoadDuration` helper maps duration values to a 0–1 range (default 0–5000ms) consistent with existing normalization patterns.
- `computeMeanDuration` provides a simple aggregation of duration values, filtering non-finite values.
- No additional network requests are introduced — the observer passively collects timing data from requests that already occur.
