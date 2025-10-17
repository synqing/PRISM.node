# Guardrails

These rules keep the codebase predictable and v0-friendly.

- Source of truth: `v0-friendly` branch. Do not change build tools or structure.
- Tech: Vite + React (SWC), TypeScript. No Next.js files or APIs.
- File layout: app code under `src/`; screens in `src/components/screens/<Name>/`.
- UI primitives: reuse `components/ui/*` before adding new ones.
- Imports: standard ESM; no custom aliases; use relative paths.
- Assets: `public/` or `src/assets/` with relative imports.
- Tokens: define CSS variables in `src/styles/globals.css`.
- Accessibility: labeled inputs, keyboard focus, alt text.
- Build: `npm run build` must pass with zero TS errors.
- Commits: small, descriptive; avoid unrelated changes.
- PRs: must include what/why and pass CI build.

Violations can be changed only with a short Design Decision (see `docs/ADR/`).

