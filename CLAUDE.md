# Latency Cathedral Project Context

## Project Purpose

Latency Cathedral is a browser-based generative artwork that turns current network conditions into a 3D cathedral rendered in WebGL.

Low RTT, low jitter, and healthy resource loading should feel tall, clean, and symmetrical. High latency, unstable probes, and slow resource loads should feel fractured, heavy, and ruinous.

The default experience must work without any privileged network access. Start with same-origin probe fetches and Resource Timing. Treat `navigator.connection` as progressive enhancement. Keep WebRTC diagnostics optional and disabled by default.

## Tech Stack

- Language: TypeScript
- Build tool and dev server: Vite
- Rendering: three.js with `WebGLRenderer`
- Testing: Vitest for unit tests, Playwright for browser smoke tests
- Linting: ESLint
- Deployment target: static hosting with same-origin probe assets in `public/`

## Repository Conventions

- `src/domain/` contains pure types, normalization helpers, and snapshot-to-scene mapping
- `src/metrics/` contains probe sampling, resource timing, browser adapters, and smoothing logic
- `src/render/` contains scene setup, geometry builders, materials, lights, and camera utilities
- `src/ui/` contains the HUD, controls, and fallback surfaces
- `public/` contains same-origin probe assets used by the sampler
- `tests/` contains unit and browser smoke tests
- Architectural changes should add or update docs in `docs/adr/`

## Coding Conventions

- Prefer small pure functions for math and mapping logic
- Do not import three.js into `src/domain/`
- Any new metric source must return typed data and must not write directly into renderer state
- Feature-detect optional browser APIs before use
- Keep WebRTC diagnostics behind a separate module and explicit flag
- Dispose replaced geometries and materials to avoid GPU memory leaks
- Cap device pixel ratio through one shared helper instead of repeating logic
- Do not modify generated output in `dist/`, `coverage/`, or Playwright report folders

## Testing Requirements

- Run `npm run lint`
- Run `npm run typecheck`
- Run `npm run test`
- Run `npm run test:e2e`
- Every pure mapping or normalization function must have a unit test
- User-facing features should have at least one smoke path in Playwright when practical
- Tickets are not complete until the required tests pass locally

## Constraints Agents Must Respect

- Keep same-origin probe measurement as the baseline telemetry path
- Do not assume cross-origin Resource Timing details are available
- Do not make `navigator.connection` or WebRTC a hard requirement for first render
- Never remove reduced-motion handling or hidden-tab throttling
- Do not add a UI framework without documenting the decision in `docs/adr/`
- If architecture changes, update both `CLAUDE.md` and the relevant ADR
- Prefer additive, easily reversible changes over wide refactors
