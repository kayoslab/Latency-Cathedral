# ADR 007: Same-Origin Probe Sampler

## Status

Accepted

## Context

Latency Cathedral needs a continuous stream of RTT and jitter measurements to drive the generative scene. The telemetry path must work without privileged network access, cross-origin permissions, or optional browser APIs.

## Decision

### Same-origin fetch as baseline

The sampler issues timed `fetch()` requests against a small static asset (`public/probe.txt`) served from the same origin. This avoids CORS restrictions, requires no special headers, and works in all browsers that support `fetch`.

### Cache-busting strategy

Each request appends a `?t=<timestamp>` query parameter to bypass HTTP caching. This is simple and sufficient for same-origin assets where no service worker is registered.

### RTT measurement

RTT is measured with `performance.now()` before and after the fetch call. Browser timer resolution may be reduced to ~1 ms on some engines (Spectre mitigations), which sets a floor on measurement granularity. This is acceptable for the artistic use case.

### Jitter formula

Jitter is computed as the mean absolute difference of consecutive RTT samples, aligned with the interarrival jitter concept from RFC 3550. This was chosen over standard deviation because it responds faster to recent changes, which is desirable for a real-time visual.

### Window size and interval defaults

- **Interval:** 2 000 ms — low enough to track changing conditions, high enough to avoid flooding the network on poor connections.
- **Window size:** 20 samples — covers ~40 seconds of history, providing a stable median while still reflecting recent shifts.

### Placeholder fields

`packetLoss` and `bandwidth` are returned as `0` in `NetworkSnapshot`. These will be populated by US-008 (Resource Timing) and US-009 (aggregator) respectively.

## Consequences

- The sampler is the primary live telemetry path; downstream modules can call `getSnapshot()` on each animation frame.
- Adaptive back-off (reducing probe frequency on slow connections) is not included in this iteration but can be added by adjusting `intervalMs` dynamically.
- The probe asset must remain small to measure RTT rather than throughput.
