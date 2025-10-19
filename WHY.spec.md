# K1 Light Lab — Layout, Sizing, and Hierarchy Spec (Phase A)

BLUF: Keep the canonical grid — top Toolbar, left Library, center Canvas, right Inspector — and fix the foundation: sizes, density, scroll behavior, persistence, and contrast. Defer the minimap until the workspace is solid. (Captain’s directive.)

note: Mini‑map is explicitly deferred. Do not design or implement a minimap in this phase.

## 1) Pattern justification

- Unreal Blueprint editor: left Palette / right Details inspector around a central graph.
- Blender node editors: left Toolbar / right Sidebar (N) with properties.
- Conclusion: The “library left, inspector right” grid is the industry norm for node editors; we keep it.

## 2) Concrete layout spec (desktop, compact density)

### Regions & sizes (tokens)

- Top toolbar height: `56px` (compact). If a context bar is added later, use 56–64px.
- Left Library width: `280px` default; resizable `240–360px`; optional mini icon‑only at `72px`.
- Right Inspector width: `320px` default; resizable `280–420px`.
- Canvas inner padding (gutter): `12px`.
- Panel scroll behavior: side panels scroll independently; the canvas pans/zooms only (no document scroll during pan).

### Density & type

- Base font: `14px`.
- Row height in Library/Inspector lists: `32px` (compact). Don’t mix densities in one hierarchy.

### Toolbar grouping

- Top toolbar = global (Play/Export/Import/Save/Fullscreen).
- If needed later, introduce a “context bar” below for graph‑specific actions (56–64px).

### Z‑order (guideline)

- Toolbar 30, side panels 20, canvas 10, wires SVG 12, nodes 15, overlays 40.

## 3) Persistence

Persist across sessions (localStorage):

- `k1.leftWidth`, `k1.rightWidth`, `k1.libraryMini`
- `k1.zoom` (last), `k1.zoomPreset` (50/75/100/150)
- `k1.mode` ("edit" | "perform")
- `k1.grid` (on/off), `k1.density` ("compact")
- `k1.legendDismissed`

Session‑only: transient selection, drags, unsaved scratch graph, modal visibility.

## 4) Contrast targets for glass UI

- Text (WCAG 1.4.3 AA): normal text ≥ 4.5:1; large text ≥ 3:1.
- Non‑text UI (WCAG 1.4.11 AA): components & meaningful graphics ≥ 3:1 in default/hover/focus/selected.
- Recipe: add subtle scrims behind text on translucent cards; ensure focus rings, port outlines, and arrowheads meet ≥ 3:1 on both card and canvas.

## 5) Token recommendations (add to globals)

```
--toolbar-h: 56px;            /* can bump to 64px if needed */
--lib-w: 280px;               /* min 240, max 360, mini 72 */
--insp-w: 320px;              /* min 280, max 420 */
--panel-pad: 12px;
--row-h: 32px;                /* compact density */
--font-base: 14px;

--focus-outline: rgba(255,255,255,0.9);  /* ensure ≥3:1 on dark glass */
--scrim: rgba(0,0,0,0.12);               /* bump locally until text meets 4.5:1 */
```

## 6) Immediate improvements to current UI (from screenshot)

- Tighten the top bar to 56px; move graph‑specific actions to context bar only if needed.
- Lock the library at 280px and add a mini (72px) mode; inspector 320px with 280–420px resize.
- Raise contrast for node titles, port labels, and focus rings with scrims until text ≥ 4.5:1 and non‑text ≥ 3:1.
- Prevent page scroll bleed: panels scroll internally; canvas pans only.

## 7) Acceptance checklist (Phase A)

- [ ] Toolbar = 56px (±8px), Library = 280px default, Inspector = 320px default.
- [ ] Library mini state at 72px with tooltips on icons.
- [ ] No document scroll while panning; sidebars scroll independently.
- [ ] Row height = 32px; base text = 14px (compact density).
- [ ] Persist widths, zoom preset, grid toggle, mode, density; “Reset layout” returns to defaults.
- [ ] Contrast: text ≥ 4.5:1; non‑text ≥ 3:1 (borders/focus/icons/wires/port outlines).

## 8) Out of scope for Phase A

- Minimap (explicitly deferred).
- Orthogonal/smart edges; keyboard wiring; backdrops; snapping.

---

References: Unreal Blueprint (Palette/Details), Blender Node Editor (Toolbar/Sidebar), Material Design app bars & drawers, Fluent side panes, SAP Fiori compact density, WCAG 1.4.3/1.4.11.

