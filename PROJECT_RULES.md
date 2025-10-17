Project facts

Framework: Vite + React (SWC)
Branch: v0-friendly
Root: ./ (repo root)
Entrypoints: index.html, src/main.tsx, src/App.tsx
Build: npm run build → outputs to dist
Styling: CSS modules + globals at src/styles/globals.css (no Next.js)

Do

Generate React (TSX) components that mount under src/ and import from components/ui/* when possible.
Use existing shadcn/Radix components for UI primitives (buttons, dialogs, tabs, etc.).
Keep imports standard (e.g., import { Button } from "components/ui/button";). Prefer relative paths inside src/.
Keep code compile‑ready: no unresolved imports, no Node/Next APIs, no server components.
Keep assets local and imported via relative paths; place new images in public/ or src/assets/.
Be proactive: if a component is missing, scaffold it in src/components/... with a minimal, typed implementation and TODOs.
Respect Vite build: ensure output compiles to dist without config changes.

Don’t

Don’t use Next.js features or write files under app/ or pages/.
Don’t introduce nonstandard aliases or version‑suffixed imports (e.g., “@radix-ui/...@x.y.z”).
Don’t change build tools, package manager, or directory layout.
Don’t add server code or API routes.

Design guidance

Honor consistent spacing, radii, and typography. If a token is undefined, define CSS variables in src/styles/globals.css and use them.
For Figma conversions: use Auto‑Layout semantics (stack direction, gaps), responsive flex/grid, and semantic HTML.

File placement

Screens/pages: src/components/screens/<ScreenName>/
Shared UI: components/ui/* (reuse first; extend only if necessary)
Hooks/utils: src/lib/* or src/hooks/*

Quality bar (agent must self‑check)

Builds locally with npm run build (no TS errors).
No unused imports, no dead code, no console errors.
Accessibility: label form fields, alt text for images, keyboard focus visible.

When converting a Figma frame

Create a screen component under src/components/screens/<Name>/<Name>.tsx.
Compose from components/ui/* primitives.
Add state with React hooks; avoid external libs unless already present.
Replace placeholder copy with sensible defaults; mark unclear parts with TODO comments.

Commit etiquette

Small, focused commits with meaningful messages.
If you change UI primitives, update all affected screens in the same branch.

Prompt template (use when in doubt)

“Implement <Screen> from Figma <link/description> as React (Vite) in src/components/screens/<Screen>/<Screen>.tsx using components/ui primitives (Button, Tabs, Dialog, Input). Keep responsive with flex/grid. No Next.js. Ensure npm run build succeeds.”

## Phase A — Active Scope (Agent Read Me First)

- Do ONLY layout/sizing/hierarchy work per WHY.spec.md. Defer minimap and all new features.
- Implement these SPECs and nothing else:
  - SPEC-LAYOUT-01: Workspace Shell (grid + scroll rules)
  - SPEC-LAYOUT-02: Persistence + Reset Layout
  - SPEC-LAYOUT-03: Panel Density + Contrast
- Keep sizes as tokens: `--toolbar-h: 56px`, `--lib-w: 280px` (mini 72; resize 240–360), `--insp-w: 320px` (resize 280–420), `--panel-pad: 12px`, `--row-h: 32px`, `--font-base: 14px`.
- Scroll rules: side panels scroll; canvas pans/zooms only; no document scroll during pan.
- Contrast targets: text ≥ 4.5:1; non-text UI ≥ 3:1. Use scrims/focus.
- Persist prefs to localStorage (keys in WHY.spec.md). Add a “Reset layout” action.

PR rules
- Title format: `feat(layout): <spec-name> (SPEC-LAYOUT-0x)`
- Body: link WHY.spec.md, paste acceptance checklist, check all boxes.
- Do not add a minimap, smart edges, or new components outside the listed files.
