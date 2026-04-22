# ADR-009: Metrics Aggregator

## Status

Accepted

## Context

The rendering layer needs a single `NetworkSnapshot` input each frame. Currently, `ProbeSampler` produces RTT/jitter data and `ResourceTimingCollector` produces resource load entries, but nothing merges them into one object. Preset mode also needs to override live telemetry seamlessly.

## Decision

Introduce `MetricsAggregator` in `src/metrics/aggregator.ts` that:

1. **Fuses sources** — reads `ProbeSampler.getSnapshot()` for base RTT, jitter, and samples; reads `ResourceTimingCollector.getEntries()` for resource timing data.
2. **Derives packet loss** — `computePacketLoss()` calculates the ratio of failed probes (statusCode 0 or non-finite RTT) in the current sample window.
3. **Estimates bandwidth** — `estimateBandwidth()` computes mean throughput in Mbps from resource timing entries with non-zero transferSize and duration.
4. **Preset override** — when `PresetState.current()` returns an active preset, its snapshot is used directly, short-circuiting live aggregation.
5. **Cadence** — aggregation runs on a configurable `setInterval` (default 2000 ms).
6. **Graceful degradation** — missing sources produce zero-value defaults; the snapshot always has valid numeric fields.
7. **Push interface** — `subscribe(cb)` notifies consumers on each tick; returns an unsubscribe function.

## Consequences

- Rendering code depends on a single `NetworkSnapshot` instead of multiple metric sources.
- New metric sources can be added to the aggregator without changing downstream consumers.
- Preset mode cleanly overrides live data at the aggregation boundary.
- Packet loss and bandwidth are derived metrics — their accuracy depends on the quality of underlying probe and resource timing data.
