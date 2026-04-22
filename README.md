# Latency Cathedral

A browser-based generative artwork that turns live network conditions into a gothic cathedral rendered in WebGL.

## Concept

Every network condition creates a different cathedral. The building's form is shaped entirely by real-time measurements — round-trip time, jitter, and packet loss — taken from same-origin probe fetches and Resource Timing data.

- **Fast, stable connection** — tall, pristine cathedral with glowing stained glass, sharp spires, and clean stone
- **Degraded connection** — weathered stone, missing pinnacles, broken windows, moss growth
- **Poor connection** — atmospheric ruins, collapsed elements, debris, darkened materials

No two moments produce exactly the same building.

## How It Works

The application measures your network by periodically fetching a small probe asset and observing browser Resource Timing entries. These measurements are normalized into scene parameters that drive the procedural geometry:

| Metric | Effect |
|--------|--------|
| **RTT** | Cathedral height — low latency = tall and elegant |
| **Jitter** | Symmetry — stable = clean alignment, chaotic = fractured |
| **Packet Loss** | Ruin level — drives weathering, material decay, and structural collapse |

The cathedral is built from hundreds of procedural meshes — nave walls, flying buttresses, twin towers, transept, apse, interior columns, stained glass windows, and a rose window — all rendered with normal-mapped stone materials, cinematic tone mapping, and bloom post-processing.

## Tech Stack

- **TypeScript** + **Vite**
- **three.js** for WebGL rendering
- **Vitest** for unit tests, **Playwright** for browser smoke tests

## Development

```bash
npm install
npm run dev
```

Press backtick (`` ` ``) to toggle the debug HUD showing live metrics.

## Testing

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm run test        # Unit tests (Vitest)
npm run test:e2e    # Browser smoke tests (Playwright)
```

## Privacy

No data is stored. No cookies, no tracking. Network measurements stay in the browser and are used only to shape the geometry.

## License

See repository for license details.
