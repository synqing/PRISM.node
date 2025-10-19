# K1 Light Lab — Design Checklist (Research-backed, testable)

> North star: maximize **scan-speed, flow, and control** using patterns proven in Blender/Blueprints/Nuke/React-Flow, and **meet WCAG/WAI-ARIA** so the editor works for everyone.
> Citations are at the end of each section.

---

## 1) Ports (types, semantics, affordance)

**Why**
Blender encodes data types in **socket color** (float, vector, color, shader…). Experts read graphs faster when type is visible; **but** WCAG 1.4.1 forbids color-only meaning—must add a second cue (shape, label, or icon). ([docs.blender.org][1])

**Do**

* Use **fixed colors + distinct shapes** per type (e.g., ◯ Color, ◇ Scalar, ⬣ Field) + tooltip “Input • Color”.
* Port size: **12px dot** with **20px invisible hit area** (comfortable targets).
* Show **focus rings**; every port is a **button with aria-label**.

**Accept**

* Ports identifiable at 100%, 75%, 50% zoom (shape still distinct).
* Keyboard focus lands on ports; SR reads “Output • Color”.

---

## 2) Edges (direction, routing, crossings)

**Why**
Edge crossings hurt readability; **high-angle / right-angle** crossings degrade far less (RAC). Orthogonal/path-finding **smart edges** avoid node overlaps and reduce crossings. ([Wikipedia][2])

**Do**

* Default **orthogonal** routing; add **smart-edge** toggle (pathfinding) for dense patches.
* Draw a **2px core** + **6px glow** (contrast on glass) and a **tiny arrowhead** at the sink to indicate direction.
* Provide **reroute/dot nodes** users can drop to straighten lines or force detours. ([React Flow][3])

**Accept**

* In stress tests, smart edges do not overlap nodes; arrowheads visible at 100% zoom.
* Reroute handle drag updates edge without reselecting nodes.

---

## 3) Graph hygiene (scale w/o spaghetti)

**Why**
Pro node tools ship **Backdrops/Comments**, **Align/Distribute**, **Collapse/Macros** to keep graphs legible. Nuke’s **Backdrop** is canonical; Unreal recommends comments, collapse, macros to manage complexity. ([Foundry Learn][4])

**Do**

* **Backdrop**: colored frame + title; dragging moves contained nodes.
* **Sticky notes**: small comments that scale legibly on zoom-out.
* **Align/Distribute & Grid-snap** (shift to override); **Collapse→Macro** for reuse.

**Accept**

* Backdrop drag moves set; z-order works; keyboard rename.
* One-click **Clean Up** aligns selection to 8px grid.

---

## 4) Zoom, navigation, orientation

**Why**
Large patches need a **MiniMap** and zoom policy; this is table-stakes in React Flow. ([React Flow][3])

**Do**

* Ship **MiniMap** (click-to-pan), **zoom presets** (50/75/100/150), **grid** toggle.
* **Label policy**: hide port labels <0.8×; show ≥1.0×; always keep numeric badges visible.

**Accept**

* Minimap pans/zooms viewport; aria-label set for SR per docs. ([React Flow][3])

---

## 5) Modes: **Edit** vs **Perform**

**Why**
Max/MSP’s **Presentation Mode** and Ableton’s **Session vs Arrangement** split shows one artifact, two mindsets: edit precisely vs perform cleanly. ([Ableton][5])

**Do**

* **Edit Mode**: big ports, labels on, snap lines, delete-on-click wires.
* **Perform Mode**: slim ports, labels off, disable destructive clicks, transport prominent.

**Accept**

* Mode switch is instant; state persists; hotkey toggles; toolbar reflects mode.

---

## 6) Accessibility (keyboard & non-color cues)

**Why**
WCAG 1.4.1 requires non-color indicators; WAI-ARIA patterns require keyboard drag/drop equivalents. (Note: `aria-grabbed`/`aria-dropeffect` are now deprecated on MDN; implement keyboard flow but don’t rely on deprecated attributes.) ([W3C][6])

**Do**

* **Keyboard wiring loop**: focus port → **Enter** to start → **Arrows/Tab** to next compatible → **Enter** to connect → **Esc** cancels.
* Visible **focus ring**; tooltips describe port type/direction.
* Provide non-drag alternatives (port list / quick connect palette). ([W3C][7])

**Accept**

* All wiring tasks are achievable with keyboard only; SR announces start/target/cancel.

---

## 7) Density policy (compact, not cramped)

**Why**
Fiori formalizes “**Cozy vs Compact**”: compact boosts info density for mouse/keyboard; don’t mix densities within one hierarchy. That matches our desktop pro-tool reality. ([experience.sap.com][8])

**Do**

* **Inspector & Library** use **compact** (8px rhythm, ≥32px row height).
* Dialogs & touch views remain **cozy**.
* Never mix densities in the same subtree.

**Accept**

* Snapshot audit: inspector rows 32px; no mixed density classes on a page.

---

## 8) Documentation & discoverability

**Do**

* **Legend** (port colors/shapes) in Help.
* **On-canvas hints** (Space+drag, Cmd/scroll) with zoom-aware visibility.
* **Shortcuts** overlay (Cmd+/): add node, align, backdrop, mode toggle.

**Accept**

* All hints are SR-readable; users can navigate help with keyboard.

---

## 9) Optional “pro” enhancements (next sprints)

* **Smart edges** via package (`@xyflow/react` smart-edge variants). ([GitHub][9])
* **Orthogonal router** (yFiles for React Flow) for enterprise-clean layouts. ([yFiles, the diagramming library][10])
* **Auto-layout / Clean Up** heuristics that minimize crossings or maximize crossing angles (RAC-biased). ([Wikipedia][2])

---

## Issue template (paste into tracker)

```
Title: [Feature] <Area — short verb>

Area:
- Ports | Edges | Hygiene | Zoom/Nav | Modes | A11y | Density | Docs

Why (evidence):
- <1–2 lines referencing citations below>

Design spec:
- Behavior:
- Visual:
- States:
- Keyboard flow:

Acceptance criteria:
- [ ] <measurable #1>
- [ ] <measurable #2>
- [ ] A11y: keyboard-only works; labels/tooltips present
- [ ] Docs: shortcut added; legend updated

Risks/notes:
- <perf, deps, migration>
```

---

## Quick “NOW” list (open these first)

1. **MiniMap + zoom presets + grid** (with aria-label on MiniMap). ([React Flow][3])
2. **Orthogonal edges + tiny arrowhead**; add **reroute/dot** handles. ([Wikipedia][2])
3. **Backdrops & Sticky notes**; **Align/Distribute**; **Grid-snap**. ([Foundry Learn][4])
4. **Keyboard wiring** loop; visible focus rings; non-color port cues. ([W3C][6])
5. **Compact inspector/library**; keep dialogs cozy; no mixed density. ([experience.sap.com][8])
6. **Mode toggle** (Edit/Perform) with distinct affordances. ([Ableton][5])

---

## Sources (selected)

* **Blender sockets (typed colors):** Blender Manual. ([docs.blender.org][1])
* **WCAG 1.4.1 (Use of Color):** W3C Understanding SC 1.4.1. ([W3C][6])
* **WAI-ARIA drag & drop:** historical APG guidance; see MDN deprecations for `aria-grabbed`/`aria-dropeffect`. Implement keyboard flow without deprecated attrs. ([W3C][7])
* **React Flow MiniMap:** official docs (interactive/pannable/zoomable, accessible). ([React Flow][3])
* **Smart/orthogonal edges:** react-flow-smart-edge packages; yFiles Edge Router for React Flow. ([GitHub][9])
* **Edge crossing research / RAC:** overviews & studies on high-angle crossings readability. ([Wikipedia][2])
* **Unreal Blueprint hygiene (comments/collapse/macros):** Epic article. ([Unreal Engine][11])
* **Nuke Backdrop (grouping):** Foundry docs. ([Foundry Learn][4])
* **Edit vs Perform precedent:** Ableton Session vs Arrangement (live vs structure). ([Ableton][5])
* **Density policy:** SAP Fiori compact vs cozy; never mix densities within a hierarchy. ([experience.sap.com][8])

---

[1]: https://docs.blender.org/manual/en/latest/interface/controls/nodes/parts.html?utm_source=chatgpt.com "Node Parts - Blender 4.5 LTS Manual"
[2]: https://en.wikipedia.org/wiki/RAC_drawing?utm_source=chatgpt.com "RAC drawing"
[3]: https://reactflow.dev/api-reference/components/minimap?utm_source=chatgpt.com "The MiniMap component - React Flow"
[4]: https://learn.foundry.com/nuke/content/reference_guide/other_nodes/backdrop.html?utm_source=chatgpt.com "Backdrop"
[5]: https://www.ableton.com/en/live-manual/11/session-view/?utm_source=chatgpt.com "Session View — Ableton Reference Manual Version 11 | Ableton"
[6]: https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html?utm_source=chatgpt.com "Understanding Success Criterion 1.4.1: Use of Color | WAI | W3C"
[7]: https://www.w3.org/TR/2009/WD-wai-aria-practices-20091215/?utm_source=chatgpt.com "WAI-ARIA Authoring Practices 1.0"
[8]: https://experience.sap.com/fiori-design-web/cozy-compact/?utm_source=chatgpt.com "Content Density (Cozy and Compact) | SAP Fiori for Web Design Guidelines"
[9]: https://github.com/tisoap/react-flow-smart-edge?utm_source=chatgpt.com "GitHub - tisoap/react-flow-smart-edge: Custom Edge for React Flow that never intersects with other nodes"
[10]: https://docs.yworks.com/yfiles-layout-reactflow/layouts/edgerouter?utm_source=chatgpt.com "yFiles Layout Algorithms for React Flow"
[11]: https://www.unrealengine.com/en-US/blog/managing-complexity-in-blueprints?utm_source=chatgpt.com "Managing complexity in Blueprints - Unreal Engine"
