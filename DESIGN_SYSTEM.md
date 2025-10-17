# Design System (Starter)

Use CSS variables in `src/styles/globals.css` for tokens. Extend as needed.

## Tokens
- Color: `--color-bg`, `--color-fg`, `--color-muted`, `--color-primary`
- Radius: `--radius-sm`, `--radius-md`, `--radius-lg`
- Shadow: `--shadow-sm`, `--shadow-md`
- Spacing: `--space-1`…`--space-6`
- Typography: `--font-sans`, `--font-mono`, `--text-sm`, `--text-md`, `--text-lg`

## Usage
- Components should consume tokens via classes or inline styles, not hardcoded values.
- If a token is missing, add it to `globals.css` and reference it; do not hardcode.

