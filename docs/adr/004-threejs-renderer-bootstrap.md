# ADR-004: Three.js Renderer Bootstrap

## Status

Accepted

## Context

US-004 introduces the three.js WebGL rendering pipeline. The renderer needs to manage canvas sizing, animation loop lifecycle, and accessibility features from the first frame.

## Decisions

### Renderer owns canvas sizing

The application shell (`initShell`) previously set `canvas.width`/`canvas.height` and attached a resize listener. With three.js, `renderer.setSize()` controls the canvas dimensions and internal render target size. Having two resize owners would cause conflicts.

**Decision:** Remove the resize handler from `initShell`. The shell's responsibility is limited to locating and returning DOM elements. All canvas sizing is handled by `initRenderer` via `renderer.setSize()`.

### Device pixel ratio capped via shared helper

High-DPI screens can have `devicePixelRatio` of 3 or higher, which quadruples or more the number of pixels the GPU must render. A shared `clampPixelRatio()` helper caps DPR at 2.

**Decision:** All rendering code must use `clampPixelRatio()` from `src/render/clampPixelRatio.ts` instead of reading `devicePixelRatio` directly.

### Reduced-motion and visibility-change handling from first render

Accessibility and performance requirements (`prefers-reduced-motion`, hidden-tab throttling) are wired into the render loop from the initial bootstrap, not deferred to a later ticket.

**Decision:** `initRenderer` queries `matchMedia('(prefers-reduced-motion: reduce)')` and listens for changes. When active, mesh rotation is skipped (scene still renders but is static). The `visibilitychange` event pauses/resumes `requestAnimationFrame` to avoid wasting resources on hidden tabs.

### Dispose contract

`initRenderer` returns a handle with a `dispose()` function that cancels the animation frame, removes all event listeners, and disposes geometry, materials, and the renderer. This ensures clean teardown and prevents GPU memory leaks.

## Consequences

- Future rendering code must go through the render barrel (`src/render/index.ts`) for DPR access.
- The placeholder mesh and rotation are temporary; US-011 and US-010 will replace them.
- Shell tests updated to reflect the narrower responsibility (element lookup only).
