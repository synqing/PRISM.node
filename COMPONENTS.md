# Components Map

Use these existing primitives and patterns before creating new ones.

UI primitives (import from `components/ui/*`)
- Buttons: `components/ui/button.tsx` (and `button-group.tsx`)
- Forms: `components/ui/input.tsx`, `textarea.tsx`, `select.tsx`, `form.tsx`, `label.tsx`
- Feedback: `toast.tsx` + `toaster.tsx`, `sonner.tsx`, `alert.tsx`, `progress.tsx`
- Overlays: `dialog.tsx`, `sheet.tsx`, `drawer.tsx`, `popover.tsx`, `tooltip.tsx`, `hover-card.tsx`
- Navigation: `tabs.tsx`, `menubar.tsx`, `navigation-menu.tsx`, `pagination.tsx`, `breadcrumb.tsx`, `sidebar.tsx`
- Inputs: `checkbox.tsx`, `radio-group.tsx`, `switch.tsx`, `input-otp.tsx`, `slider.tsx`
- Layout: `card.tsx`, `accordion.tsx`, `collapsible.tsx`, `resizable.tsx`, `scroll-area.tsx`, `separator.tsx`
- Data display: `table.tsx`, `badge.tsx`, `avatar.tsx`, `calendar.tsx`, `chart.tsx`

Project components
- K1 editor surface: `src/components/k1/*` (toolbar, node canvas, inspector, library)
- Screens go under: `src/components/screens/<ScreenName>/<ScreenName>.tsx`

Utilities
- Hooks: `src/hooks/*` or `src/lib/*` (e.g., `lib/utils.ts`)
- Global styles/tokens: `src/styles/globals.css`

Conventions
- Prefer composition of primitives over bespoke styles.
- Keep props typed and minimal; expose variant props that map to existing primitives where possible.

