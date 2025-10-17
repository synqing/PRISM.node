# K1 Light Lab — **WHY** We’re Building a Pro Node Editor (and why it must look/behave this way)

> North-star: adopt the patterns experts already proved—in game/VFX node editors, graph-drawing research, and accessibility standards—so creators move faster with fewer mistakes, at any scale.

> **We optimize scan-speed, flow, and control.**
> Light Lab implements the proven patterns of Blender/Blueprints/Nuke/Max and conforms to WCAG/WAI-ARIA. Concretely: **typed ports (color+shape+label)**, **directional smart edges with minimal or high-angle crossings**, a **hygiene toolkit** (minimap, grid, align/snap, backdrops, reroutes, collapse), **Edit vs Perform** modes, **keyboard-first wiring**, and a **compact density** for pro desktop use. These aren’t tastes; they’re evidence-based defaults designed to scale from toy patches to tour-grade rigs. ([docs.blender.org][1])


## 0) The case for a node editor at all

* **Creation speed & safety.** Typed inputs/outputs + visual patching let non-programmers build complex behavior without text code. Blender codifies this with **colored, typed sockets** (shader/geometry/boolean/color/float etc.), and it scales across workflows. We follow that because it’s how experts wire at speed—and it’s been stable across versions. ([docs.blender.org][1])
* **Live + structured work.** Best-in-class tools separate **edit** from **perform** so you can patch precisely and then operate with minimal chrome (Max/MSP **Presentation Mode**; Ableton **Session vs Arrangement**). Same patch, two mindsets. We need that for live visuals. ([Cycling '74 Documentation][2])
* **Scale without chaos.** Big graphs are inevitable. Experts fight entropy with **minimaps**, **smart/orthogonal edges**, **align/snap**, **comments/backdrops**, and **collapse/macros**. These are not luxuries; they’re survival gear. ([React Flow][3])

---

## 1) Typed ports (color **and** shape) are not decoration—they’re contracts

* **What the experts do:** Blender sockets are typed and **color-coded** (e.g., Color=yellow, Float=gray, Boolean=pink, etc.). That convention compresses cognition: users know what plugs where, instantly. ([docs.blender.org][1])
* **Accessibility law of the land:** Color alone is illegal UX: **WCAG 1.4.1** requires a second cue (shape, text, or icon). So we pair color with **shape/glyph + tooltip/label** and maintain visible **focus** for keyboard users. ([W3C][4])

**North-star rule:** Keep your port colors, add type-specific shapes and labels on hover/focus. Always provide a keyboard/focusable target. ([W3C][4])

---

## 2) Wires must tell a story (direction, crossings, routing)

* **Crossings hurt; high-angle crossings hurt less.** Cognitive studies and graph-drawing literature show edge crossings degrade readability; **right-angle crossings (RAC)** retain comprehension far better than shallow angles. When you must cross, do it at ~90°. ([jgaa.info][5])
* **Route around nodes when possible.** Modern libraries (React Flow + packages) ship **smart edges / edge routers** to avoid node overlaps and auto-path around obstacles; yFiles provides orthogonal routing for React Flow UIs. Use them. ([npm][6])

**North-star rules:**

* Default to **orthogonal/smart** edges; add a **tiny sink arrowhead** for direction.
* Offer **reroute dots** so users can straighten narratives manually when the auto-router can’t. ([yFiles, the diagramming library][7])

---

## 3) Graph hygiene is a first-class feature

* **Backdrops/comments**: Pro node tools ship grouping & annotation. Nuke’s **Backdrop** visually groups nodes; moving the frame moves the group; color/title aids scanning. Houdini supports comments and background images tied to nodes. We need equivalents (backdrops + sticky notes). ([Foundry Learn][8])
* **Collapse/macros**: Unreal guidance: use **comments**, **collapsed graphs**, **macros** to tame complexity and reuse logic. Same pattern here for reusability and clarity. ([Unreal Engine][9])

**North-star rules:** Ship **Backdrops/Comments**, **Reroute nodes**, **Align/Distribute**, **Grid-snap**, and **Collapse→Macro** from day one. ([Unreal Engine][9])

---

## 4) Zoom-aware UI & navigation

* **Minimap is table-stakes** for large graphs; React Flow exposes a `<MiniMap/>` component and docs highlight it as a built-in with custom coloring. Grid + controls are also built-ins. We mirror that. ([React Flow][3])

**North-star rules:** Minimap (click-to-pan), grid, **zoom presets** (50/75/100/150%), and **label visibility policy** (e.g., hide port labels below 0.8×; show ≥1.0×). ([React Flow][10])

---

## 5) Edit vs Perform modes (because live work != wiring)

* **Max/MSP:** Presentation Mode provides a separate, performance-focused view—**hide cords**, show only UI needed on stage. ([Cycling '74 Documentation][2])
* **Ableton:** **Session** (improv/launch) vs **Arrangement** (structure/record). Two views of the same project optimized for different tasks. Our editor should feel the same: quiet chrome in Perform; precision tools in Edit. ([Ableton][11])

**North-star rules:**

* **Edit Mode:** big ports, labels on, snap lines, delete-on-click.
* **Perform Mode:** slim ports, labels off, no accidental delete, transport front-and-center. ([Cycling '74 Documentation][2])

---

## 6) Accessibility is non-negotiable (and good for speed)

* **Use of color:** add shape/text—color-only indicators fail **WCAG 1.4.1**. ([W3C][4])
* **Keyboard drag/drop:** WAI-ARIA authoring practices define **aria-grabbed / aria-dropeffect**, with **Tab/Arrow** navigation between drop targets; **Enter** to drop; **Esc** to cancel. Implement a **keyboard-only wiring loop**. MDN and ARIA docs lay out expected tokens and flows; React-Aria shows reference UX. ([W3C][12])

**North-star rules:** Every port is a **button** with an aria-label; keyboard: focus port → **Enter** to start → **Arrows** to nearest compatible → **Enter** to connect → **Esc** cancels. Visible focus ring at all times. ([W3C][13])

---

## 7) Density policy: “compact, not cramped”

* Enterprise design systems formalize **compact vs cozy** density. **SAP Fiori**: compact for mouse/keyboard (denser tables/panels), cozy for touch; never mix densities in one hierarchy. This is exactly our desktop pro-tool case. ([experience.sap.com][14])

**North-star rules:** Inspector & library use **compact** spacing (8px rhythm), keep hit-targets accessible; dialogs and touch interactions remain cozy. ([experience.sap.com][14])

---

# WHAT this means for Light Lab (adopted backlog)

## Must-ship (foundation)

1. **Typed ports with color + shape + tooltip/label**; visible focus ring; keyboard wire-making per ARIA. ([docs.blender.org][1])
2. **Directional edges** with **orthogonal/smart routing** and small sink arrowheads; provide reroute dots; bias crossings toward right angles when unavoidable. ([yFiles, the diagramming library][7])
3. **Hygiene toolkit**: Minimap, grid, align/distribute, snap; Backdrops/Comments; Collapse→Macro. ([React Flow][3])
4. **Edit/Perform modes** (cords/tools vs clean performance UI). ([Cycling '74 Documentation][2])
5. **Density policy**: compact (desktop) for inspector/library; keep minimum interactive sizes. ([experience.sap.com][14])

## High-ROI next

6. **Smart edges package** option (`react-flow-smart-edge`) to route around nodes automatically. ([GitHub][15])
7. **Orthogonal edge router** preset (yFiles for React Flow) for clean enterprise-style graphs. ([yFiles, the diagramming library][7])
8. **Auto-layout / clean-up** actions guided by crossing-reduction heuristics; prefer layouts that minimize crossings or increase crossing angles. ([jgaa.info][5])

---

# HOW we implement (design + interaction spec)

## Ports

* **Visual:** 12px dot + 20px invisible hit-area; distinct shape mask per type; tooltip **“Output • Color”**, etc. (satisfies WCAG). ([W3C][4])
* **States:** default 80% opacity; hover 100% + subtle ring; dragging → pulsing ring.
* **Keyboard:** port is `button[aria-label]`. Press **Enter** to “grab”; **Tab/Arrows** to move among compatible targets; **Enter** to drop; **Esc** cancels. Update `aria-grabbed / aria-dropeffect` during the operation. ([W3C][13])

## Edges

* **Style:** dual-stroke (2px core + 6px glow) for contrast on glass; tiny arrowhead at sink clarifies flow.
* **Routing:** default **orthogonal**; toggle **smart** (pathfinding) to avoid overlaps; respect reroute handles. ([yFiles, the diagramming library][7])
* **Crossings:** prefer high-angle crossings; never shallow tangles if avoidable. ([jgaa.info][16])

## Hygiene tooling

* **Backdrops/Comments:** colorable frames with titles; dragging backdrop moves contained nodes (Nuke model). Sticky notes for spot annotations. ([Foundry Learn][8])
* **Align/Distribute & Snap:** 8px grid; show snap guides; shift to override.
* **Minimap & zoom presets:** `<MiniMap/>` plus 50/75/100/150% controls; background grid visible. ([React Flow][3])

## Modes

* **Edit:** labels visible; big hit-targets; delete-on-click wires; reroute handles shown.
* **Perform:** labels off; ports slim; prevent destructive clicks; transport prominent—mirrors Max Presentation Mode. ([Cycling '74 Documentation][2])

## Density

* **Inspector/Library:** compact spacing (8px vertical rhythm), consistent type scale (~11–13px UI text); keep row heights ≥ 32px for precision work with mouse. **Never mix densities in a single hierarchy**. ([experience.sap.com][14])

---

# Reference appendix (receipts)

* **Blender typed sockets (colors/types):** official manual. ([docs.blender.org][1])
* **WCAG 1.4.1 Use of Color:** W3C. ([W3C][4])
* **WAI-ARIA drag/drop keyboard model:** W3C APG & MDN. ([W3C][13])
* **React Flow minimap, grid, controls:** official docs. ([React Flow][10])
* **Smart/orthogonal edges:** react-flow-smart-edge, yFiles Edge Router. ([GitHub][15])
* **Right-angle crossings research (RAC):** JGAA; overview (RAC drawing). ([jgaa.info][16])
* **Edge crossings effects (user study):** Huang/Hong/Eades (JGAA). ([jgaa.info][5])
* **Unreal Blueprint hygiene (comments/collapse/macros):** Epic blog guidance. ([Unreal Engine][9])
* **Nuke Backdrop:** Foundry docs; Houdini network organization. ([Foundry Learn][8])
* **Max/MSP Presentation Mode:** Cycling ’74 tutorials & M4L UI docs. ([Cycling '74 Documentation][2])
* **Density policies:** SAP Fiori compact/cozy + implementation rules. ([experience.sap.com][14])


---


[1]: https://docs.blender.org/manual/en/latest/interface/controls/nodes/parts.html?utm_source=chatgpt.com "Node Parts - Blender 4.5 LTS Manual"
[2]: https://docs.cycling74.com/learn/articles/basicchapter20/?utm_source=chatgpt.com "Max Basic Tutorial 20: Presentation Mode | Cycling '74 Documentation"
[3]: https://reactflow.dev/api-reference/components/minimap?utm_source=chatgpt.com "The MiniMap component - React Flow"
[4]: https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html?utm_source=chatgpt.com "Understanding Success Criterion 1.4.1: Use of Color | WAI | W3C"
[5]: https://jgaa.info/index.php/jgaa/article/view/paper152?utm_source=chatgpt.com "Effects of Sociogram Drawing Conventions and Edge Crossings in Social Network Visualization | Journal of Graph Algorithms and Applications"
[6]: https://www.npmjs.com/package/%40kinsalvan/react-flow-smart-edge?utm_source=chatgpt.com "@kinsalvan/react-flow-smart-edge - npm"
[7]: https://docs.yworks.com/yfiles-layout-reactflow/layouts/edgerouter?utm_source=chatgpt.com "yFiles Layout Algorithms for React Flow"
[8]: https://learn.foundry.com/nuke/content/reference_guide/other_nodes/backdrop.html?utm_source=chatgpt.com "Backdrop"
[9]: https://www.unrealengine.com/zh-CN/blog/managing-complexity-in-blueprints?utm_source=chatgpt.com "Managing complexity in Blueprints - Unreal Engine"
[10]: https://reactflow.dev/learn/concepts/built-in-components?utm_source=chatgpt.com "Built-In Components - React Flow"
[11]: https://www.ableton.com/en/live-manual/11/session-view/?utm_source=chatgpt.com "Session View — Ableton Reference Manual Version 11 | Ableton"
[12]: https://www.w3.org/TR/2009/WD-wai-aria-practices-20091215/?utm_source=chatgpt.com "WAI-ARIA Authoring Practices 1.0"
[13]: https://www.w3.org/TR/2015/WD-wai-aria-practices-1.1-20150514/?utm_source=chatgpt.com "WAI-ARIA Authoring Practices 1.1"
[14]: https://experience.sap.com/fiori-design-web/cozy-compact/?utm_source=chatgpt.com "Content Density (Cozy and Compact) | SAP Fiori for Web Design Guidelines"
[15]: https://github.com/tisoap/react-flow-smart-edge?utm_source=chatgpt.com "GitHub - tisoap/react-flow-smart-edge: Custom Edge for React Flow that never intersects with other nodes"
[16]: https://jgaa.info/index.php/jgaa/article/view/paper217?utm_source=chatgpt.com "On the Perspectives Opened by Right Angle Crossing Drawings | Journal of Graph Algorithms and Applications"

## Now vs Later

The table below marks what we implement **this sprint (“Now”)** versus **optional pro extras (“Later”)**. Choices are grounded in what expert tools and standards already proved: **minimap/viewport controls are table-stakes**, **color-only meaning fails WCAG 1.4.1**, **deprecated ARIA DnD attributes should be avoided (build keyboard flows instead)**, and **orthogonal/high-angle crossings improve readability**. ([React Flow][1])

| Area                   | **Now (this sprint)**                                                                                                               | **Why now**                                                                                                | **Later (pro extras)**                                                      | **Why later**                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Orientation & nav      | **MiniMap** (click-to-pan), **zoom presets** (50/75/100/150), **grid toggle**                                                       | Minimap/controls are baseline in modern graph editors; improves orientation instantly. ([React Flow][1])   | Overview modes (bird’s-eye + fit-to-selection animations)                   | Nice polish; not required for correctness.                                                              |
| Edges                  | **Orthogonal routing option** + **tiny sink arrowheads**; keep Bezier as toggle                                                     | Orthogonal/high-angle crossings aid readability; arrows clarify direction. ([jgaa.info][2])                | **Smart/path-finding routing** (auto avoid nodes), premium routers          | Third-party deps (yFiles/others) add weight/cost; keep optional. ([yFiles, the diagramming library][3]) |
| Ports & semantics      | **Color + shape + label/tooltip** per type; visible **focus ring**                                                                  | WCAG 1.4.1 forbids color-only meaning; shape/text required. ([W3C][4])                                     | Customizable type palettes/themes                                           | Aesthetic refinement after semantics land.                                                              |
| Keyboard & a11y        | **Keyboard wiring loop** (Focus→Enter start → Tab/Arrows choose → Enter connect → Esc cancel). Don’t use deprecated ARIA DnD attrs. | Meets WCAG/WAI-ARIA intent; MDN marks `aria-grabbed`/`aria-dropeffect` **deprecated**. ([MDN Web Docs][5]) | Spatial search for nearest compatible port; command palette “quick connect” | Layer-two ergonomics; ship after core loop is stable.                                                   |
| Modes                  | **Edit vs Perform toggle** (labels & big ports in Edit; slim ports & no destructive actions in Perform)                             | Proven in live tools to separate wiring vs. operation; reduces stage-time mistakes.                        | Per-node “presentation skins”; MIDI/OSC focus mode                          | Performance sugar once the mode split exists.                                                           |
| Graph hygiene          | **Backdrops/notes**, **Align/Distribute**, **explicit Grid-snap**                                                                   | Canonical readability tools in pro node editors.                                                           | **Collapse→Macro** and reusable subgraphs                                   | Requires serialization/API design; stage after core hygiene.                                            |
| Docs & discoverability | **Legend** (port colors/shapes), **on-canvas hints** (Space-drag pan, Cmd-scroll zoom)                                              | Reduces ramp time; aligns with accessibility guidance (non-color cues). ([MDN Web Docs][6])                | Guided walkthroughs, “first-patch” template                                 | Nice-to-have onboarding.                                                                                |

**Notes & receipts:**

* **MiniMap/controls** are standard in React Flow’s API (evidence of “table-stakes” in web graph editors). ([React Flow][1])
* **WCAG 1.4.1 “Use of Color”** → color cannot be the only indicator; add shape/text. ([W3C][4])
* **ARIA DnD**: `aria-grabbed` / `aria-dropeffect` are **deprecated**; implement keyboard flows without them. ([MDN Web Docs][5])
* **Orthogonal/right-angle crossings (RAC)** → better readability than shallow crossings; orthogonal routers are well-documented. ([jgaa.info][2])
