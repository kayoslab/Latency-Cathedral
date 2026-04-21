# Technology Context

## Overview

Latency Cathedral is a browser-based generative artwork that visualises real-time network conditions as a 3D cathedral rendered in WebGL. The project is built as a static single-page application with no server-side runtime.

## Core Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Language | TypeScript | latest stable | Type-safe application code |
| Build / Dev Server | Vite | latest stable | Fast HMR dev server, production bundler |
| Rendering | three.js | latest stable | WebGL 3D scene graph and renderer |
| Unit Testing | Vitest | latest stable | Fast Vite-native test runner |
| E2E Testing | Playwright | latest stable | Cross-browser smoke tests |
| Linting | ESLint | latest stable | Static analysis and style enforcement |
| Deployment | Static hosting | — | Pre-built assets served from any CDN or file server |

## Browser APIs Used

| API | Role | Requirement Level |
|---|---|---|
| `fetch` | Same-origin latency probe requests | Required — baseline telemetry path |
| `Performance` / `PerformanceObserver` | Resource Timing collection | Required — feature-detected at startup |
| `navigator.connection` (Network Information API) | Supplementary bandwidth / RTT hints | Optional — progressive enhancement only |
| `WebRTC` (`RTCPeerConnection`) | Advanced diagnostics (ICE candidate RTT) | Optional — disabled by default, behind explicit flag |
| `matchMedia('prefers-reduced-motion')` | Accessibility-aware animation | Required — must never be removed |
| `document.visibilityState` | Hidden-tab throttling | Required — must never be removed |
| `canvas.toDataURL` / `canvas.toBlob` | PNG export of current frame | Required for US-016 |
| `URL` / `URLSearchParams` | Shareable preset state via query string | Required for US-016 |
| `navigator.clipboard` | Copy share URL to clipboard | Optional — graceful fallback if unavailable |

## Project Structure

```
latency-cathedral/
├── public/                  # Same-origin probe assets (served as-is by Vite)
├── src/
│   ├── domain/              # Pure types, normalization, snapshot-to-scene mapping
│   ├── metrics/             # Probe sampler, Resource Timing, browser adapters, smoothing
│   ├── render/              # three.js scene, geometry builders, materials, lights, camera
│   └── ui/                  # HUD overlay, controls, fallback surfaces
├── tests/                   # Unit tests (Vitest) and browser smoke tests (Playwright)
├── docs/adr/                # Architecture Decision Records
├── index.html               # Vite entry point
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript compiler options
├── vitest.config.ts         # Vitest configuration (or inline in vite.config.ts)
├── playwright.config.ts     # Playwright configuration
└── package.json             # Scripts, dependencies, metadata
```

## Key npm Scripts

| Script | Command | Purpose |
|---|---|---|
| `dev` | `vite` | Start local dev server with HMR |
| `build` | `tsc && vite build` | Type-check then produce production bundle |
| `preview` | `vite preview` | Serve production build locally |
| `lint` | `eslint .` | Run static analysis |
| `typecheck` | `tsc --noEmit` | Type-check without emitting files |
| `test` | `vitest run` | Run unit tests once |
| `test:e2e` | `playwright test` | Run browser smoke tests |

## Dependency Graph (User Stories)

```
US-001  (Vite + TS workspace)
├── US-002  (lint, typecheck, test scripts)
│   └── US-005  (domain models)
│       ├── US-006  (presets)
│       ├── US-007  (probe sampler)
│       │   └── US-008  (resource timing)
│       └── US-009  (aggregator) ← US-005, US-006, US-007, US-008
│           ├── US-010  (snapshot → scene mapper)
│           │   ├── US-013  (atmosphere / fog / lighting)
│           │   └── US-011  (cathedral geometry) ← US-004, US-010
│           │       ├── US-012  (ruin modifiers)
│           │       ├── US-013  (atmosphere) ← US-010, US-011
│           │       └── US-016  (export / share) ← US-006, US-011, US-014
│           ├── US-014  (debug HUD) ← US-003, US-009
│           └── US-015  (reduced motion / throttle) ← US-004, US-009
├── US-003  (application shell)
│   ├── US-004  (three.js renderer)
│   │   ├── US-011
│   │   ├── US-015
│   │   └── US-017  (smoke tests) ← US-002, US-003, US-004, US-006
│   └── US-014
└── US-007
```

## Architectural Constraints

1. **No privileged network access.** The default telemetry path uses same-origin `fetch` probes against assets in `public/`. Cross-origin Resource Timing details must not be assumed available.
2. **Progressive enhancement only.** `navigator.connection` and WebRTC enrich data when present but must never gate first render.
3. **Domain purity.** `src/domain/` must not import three.js or any rendering library. All mapping and normalization logic stays pure and unit-testable.
4. **GPU hygiene.** Replaced geometries and materials must be explicitly disposed. Device pixel ratio is capped through a single shared helper.
5. **Accessibility.** `prefers-reduced-motion` handling and hidden-tab throttling are mandatory and must never be removed.
6. **No UI framework.** The project uses vanilla TypeScript DOM manipulation. Adding a UI framework requires an ADR in `docs/adr/`.

## Build and Deploy Pipeline

1. **Development** — `npm run dev` starts Vite's dev server with hot module replacement.
2. **Quality gate** — `npm run lint && npm run typecheck && npm run test && npm run test:e2e` must all pass before a ticket is considered complete.
3. **Production build** — `npm run build` type-checks then bundles to `dist/`.
4. **Deployment** — The contents of `dist/` are deployed to any static hosting provider. No server-side runtime is required.

## Key Technical Risks

| Risk | Mitigation |
|---|---|
| Cross-origin timing restrictions hide resource durations | Use same-origin probes as baseline; treat Resource Timing as best-effort |
| `navigator.connection` absent or lying | Feature-detect and validate; never hard-depend |
| GPU memory leaks from geometry churn | Dispose protocol enforced in geometry builders; review in code review |
| High-frequency probe traffic on poor connections | Adaptive back-off and cadence cap in sampler |
| Reduced-motion preference ignored | Media query listener wired at startup; tested in smoke suite |
| Large three.js bundle size | Tree-shake unused three.js modules via Vite's Rollup config |
