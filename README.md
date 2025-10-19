# User-Facing App Wireframes

  This is a code bundle for User-Facing App Wireframes. The original project is available at https://www.figma.com/design/eayz14gawTVzpWXPXVMnlK/User-Facing-App-Wireframes.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.
# K1 Light Lab — Phase A (Mode C Full Device Path)
![CI](https://github.com/synqing/PRISM.node/actions/workflows/ci.yml/badge.svg)

This repository contains the Vite + React (SWC) implementation of the K1 Light Lab node editor. It ships a pro‑grade desktop UI for authoring graph‑based animations for a dual‑strip WS2812B device (320 RGB8 LEDs; identity concat mapping 2×160 on GPIO 9/10). This readme reflects the current, shipped state (Phase‑A lock) and provides a high‑signal orientation for new contributors.

## App Structure

- Entry: `src/main.tsx`
- Workspace/tokens/grid: `src/styles/globals.css` (+ `src/index.css`)
- Editor shell/state/export/loop: `src/components/k1/LightLab.tsx`
- Toolbar: `src/components/k1/K1Toolbar.tsx`
- Canvas/wiring: `src/components/k1/NodeCanvas.tsx`
- Node cards: `src/components/k1/Node.tsx`
- Library/Inspector: `src/components/k1/NodeLibrary.tsx`, `src/components/k1/NodeInspector.tsx`
- Engine: `src/components/k1/engine.ts`
- Transport (WS TLV): `src/components/k1/transport/wsTlv.ts`

## Running

- Dev: `npm install && npm run dev` (Vite server)
- Build: `npm run build` → `dist/`

## Device/Engine

- Pixels: 320 RGB8; mapping: `concat-2x160`; channels: GPIO 9: 0–159, GPIO 10: 160–319
- Preview spec default: `{ length: 320, fps: 120 }` (user selectable 120/60/30)
- Engine kernels: Gradient (OKLCH LUT), HueShift, Blend, K1 Output

## Export

Export payload produced by the toolbar Export menu and by the WS TLV sender:

```
{
  nodes, wires, params,
  preview: Uint8Array (320×3 RGB8) serialized to JSON array,
  framesMeta: { length: 320, fps: <toolbar_fps> },
  meta: {
    pixelCount: 320,
    colorFormat: 'RGB8',
    mapping: 'concat-2x160',
    fps: <toolbar_fps>,
    brightnessCap?: <byte_when_enabled>
  },
  exportedAt: ISO string
}
```

Payload size guard: ≤ 262,144 bytes enforced before TLV send. Optional multi‑frame clamp logic is in place (≤ 273 frames) for future multi‑frame export.

## Transport (WS TLV)

- TLV framing: `[TYPE:1][LEN_BE:2][PAYLOAD][CRC32_BE:4]`
- Types: `0x10 PUT_BEGIN`, `0x11 PUT_DATA (≤ 4089)`, `0x12 PUT_END`
- CRC32 computed over payloads
- “Dry‑run” button computes plan + CRC and logs a summary; “Send” prompts for `ws://` URL and streams frames

## Persistence (localStorage)

`k1.leftWidth, k1.rightWidth, k1.libraryMini, k1.grid, k1.mode, k1.density, k1.zoomPreset, k1.fps, k1.capEnabled, k1.capPercent, k1.edges`

### Keys Table

| Key                | Type    | Default          | Notes                         |
| ------------------ | ------- | ---------------- | ----------------------------- |
| k1.leftWidth       | number  | 280              | Library width (px)            |
| k1.rightWidth      | number  | 320              | Inspector width (px)          |
| k1.libraryMini     | boolean | false            | Library mini mode             |
| k1.grid            | boolean | true             | Canvas grid                   |
| k1.mode            | string  | "edit"           | Placeholder for perform mode  |
| k1.density         | string  | "compact"        | UI density                    |
| k1.zoomPreset      | number  | 100              | 50/75/100/150                 |
| k1.edges           | string  | "bezier"         | "bezier" or "orthogonal"      |
| k1.fps             | number  | 120              | 120/60/30                     |
| k1.capEnabled      | boolean | false            | Brightness cap                |
| k1.capPercent      | number  | 100              | 10–100%                       |
| k1.sequenceEnabled | boolean | false            | Export multiple frames        |
| k1.sequenceFrames  | number  | 1                | 1–273                         |
| k1.wsUrl           | string  | ws://k1.local:80 | Device URL                    |

## Phase‑A Acceptance Checklist (Implemented)

- Toolbar 56 px; Library 280 default (mini 72); Inspector 320 default
- Panels scroll internally; canvas pans/zooms only; no document scroll bleed
- Row height 32 px; base font 14 px (compact)
- Library/Inspector resizable with snap + persistence; Reset restores defaults
- Toolbar: zoom presets, grid toggle, bezier/orthogonal toggle, FPS selector (120/60/30), brightness cap toggle + slider
- Preview loop throttled to selected FPS; brightness cap applied to preview when enabled
- Export includes correct `framesMeta.fps` and `meta.brightnessCap` only when enabled; payload guard enforced
- OKLCH gradient LUT with conservative gamut clip; HueShift/Blend/K1 Output intact
- TLV dry‑run/send with CRC32 and chunking
- Build passes; no console errors in normal UX

## Notes on Legacy Paths

Some Next.js‑style files exist outside `src/` (e.g., `app/`). These are legacy wireframes and are not part of the Vite app build. Keep all product work in `src/`. If you need to reference design tokens, use `src/styles/globals.css`.

## Repository Strategy (single‑repo)

- Authoritative repo: `synqing/PRISM.node`, branch `v0-friendly` (protected; requires "build" check).
- Mirror repos are no longer maintained for development. Do not open PRs or issues on mirrors.
- Local git housekeeping (optional):
  - Remove mirror remote: `git remote remove v0`
  - Confirm default remote: `git remote -v` should only show `origin` → `synqing/PRISM.node`.
