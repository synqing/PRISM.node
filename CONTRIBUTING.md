# Contributing Guide (v0/Vercel friendly)

Project facts
- Framework: Vite + React (SWC)
- Branch to deploy: `v0-friendly`
- Root: `./` (repo root)
- Entrypoints: `index.html`, `src/main.tsx`, `src/App.tsx`
- Build: `npm run build` → outputs to `dist`

Do
- Write React + TypeScript (TSX) under `src/`.
- Reuse primitives from `components/ui/*` (shadcn/Radix) before adding new ones.
- Keep imports standard and relative; no custom aliases or version-suffixed imports.
- Keep assets local via relative imports; put images in `public/` or `src/assets/`.
- Be proactive: if a needed component is missing, scaffold it under `src/components/...` with minimal typed props and TODOs.
- Ensure `npm run build` succeeds (no TS errors) before pushing.

Don’t
- Don’t use Next.js APIs or place files under `app/` or `pages/`.
- Don’t modify build tools, package manager, or directory layout.
- Don’t add server code or API routes.

Design guidance
- Use semantic HTML with accessible labels and alt text.
- Prefer flex/grid with responsive behavior that mirrors Figma Auto‑Layout.
- If a token (color/spacing/radius/typography) is missing, add CSS variables in `src/styles/globals.css` and reference them.

File placement
- Screens/pages: `src/components/screens/<ScreenName>/<ScreenName>.tsx`
- Shared UI: `components/ui/*`
- Hooks/utils: `src/hooks/*` or `src/lib/*`

Quality bar (self‑check)
- Builds locally with `npm run build`.
- No unused imports, no console errors.
- a11y: labeled form fields, focus visible, keyboard navigable.

Commit etiquette
- Small, focused commits with clear messages.
- If you change a UI primitive, update affected screens in the same branch.

Prompt template (for v0 or agents)
> Implement <Screen> from Figma <link/description> as React (Vite) in `src/components/screens/<Screen>/<Screen>.tsx` using components/ui primitives (Button, Tabs, Dialog, Input). Keep it responsive with flex/grid. No Next.js. Ensure `npm run build` succeeds.

