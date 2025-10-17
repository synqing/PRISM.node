# v0 Project Rules — Custom Instructions

Project Facts
- Framework: Vite + React (SWC)
- Branch: `v0-friendly`
- Root: `./` (repo root)
- Entrypoints: `index.html`, `src/main.tsx`, `src/App.tsx`
- Build: `npm run build` → outputs to `dist`

Do
- Generate React + TypeScript (TSX) under `src/`.
- Reuse primitives from `components/ui/*` (shadcn/Radix) before creating new ones.
- Use standard imports; prefer relative paths from `src/` and `components/`.
- Keep code compile‑ready for Vite. No unresolved imports; no server APIs.
- Place assets in `public/` or `src/assets/` and import relatively.
- If something is missing, scaffold a minimal typed component in `src/components/...` and add a TODO.

Don’t
- Don’t use Next.js features or write under `app/` or `pages/`.
- Don’t change build tools, package manager, or directory layout.
- Don’t introduce custom aliases or version‑suffixed package imports.
- Don’t add backend code or API routes.

Design Guidance
- Mirror Figma Auto‑Layout with flex/grid; responsive by default.
- Use semantic HTML; label controls; include alt text; maintain visible focus.
- If a token (color/spacing/radius/typography) is missing, define a CSS var in `src/styles/globals.css` and use it.

File Placement
- Screens/pages: `src/components/screens/<ScreenName>/<ScreenName>.tsx`
- Shared UI: `components/ui/*`
- Hooks/utils: `src/hooks/*` or `src/lib/*`

Quality Bar (Self‑Check)
- `npm run build` passes with zero TS errors.
- No unused imports or console errors.
- Keyboard accessible, labeled inputs, proper roles/aria where needed.

Prompt Template
> Implement <Screen> from Figma <link/description> as React (Vite) in `src/components/screens/<Screen>/<Screen>.tsx` using `components/ui` primitives (Button, Tabs, Dialog, Input). Keep it responsive with flex/grid. No Next.js. Ensure `npm run build` succeeds.

