# ADR-016: PNG Export and Shareable Preset URLs

## Status

Accepted

## Context

Users want to save interesting cathedral renders as images and share specific preset configurations with others via URL. This requires reading pixels from the WebGL canvas and encoding preset state in the URL query string.

## Decisions

### PNG Export via `canvas.toBlob`

We use `canvas.toBlob('image/png')` instead of `canvas.toDataURL()`. `toBlob` is asynchronous and avoids creating a large base64 string in memory, which matters for high-resolution canvases. The blob is turned into a download via a temporary `<a>` element with the `download` attribute.

This depends on `preserveDrawingBuffer: true` in the WebGL renderer configuration (`src/render/createRenderer.ts`). If that flag is changed to `false`, PNG export will produce blank images because the drawing buffer is cleared after compositing.

### URL Serialization: Preset Name Only

Shareable URLs encode only the preset name (`?preset=fast|mixed|poor`), not the full `NetworkSnapshot`. This keeps URLs short, stable across code changes, and human-readable. The trade-off is that users cannot share arbitrary custom states — only the three named presets.

### `history.replaceState` over `pushState`

When the user switches presets, the URL bar is updated via `history.replaceState`. Using `pushState` would create a new history entry on every preset click, polluting the back-button history and making it frustrating to navigate away from the page.

### Clipboard API with Graceful Fallback

The Share button attempts `navigator.clipboard.writeText()`. This API requires a secure context (HTTPS or localhost). If the clipboard API is unavailable or the permission is denied, the error is silently caught. The URL bar already reflects the current preset, so the user can copy it manually.

### No UI Framework

Both the PNG export and share buttons follow the existing pattern of imperative DOM creation with inline styles, consistent with `presetSelector.ts` and `debugHud.ts`. No UI framework is introduced.

## Consequences

- Users can save PNG snapshots of any cathedral state
- Preset URLs are bookmarkable and shareable
- Invalid or missing `?preset=` values are safely ignored (app loads with default live metrics)
- The clipboard fallback path requires no extra dependencies
- Future work could extend URL params to encode more state (e.g., camera position) if needed
