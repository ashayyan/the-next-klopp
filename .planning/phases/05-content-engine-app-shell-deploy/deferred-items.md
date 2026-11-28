# Phase 5 deferred items

## Primary button hover fails WCAG AA contrast in the light theme (found in 05-04)

- **Where:** `src/ui/Button.tsx`, primary variant, `hov:opacity-90`.
- **Evidence:** axe `color-contrast` on the lesson "Continue" button while the pointer rests on it, light theme: foreground `#ebf4f1` on background `#218268`, ratio 4.2 (needs 4.5). At rest the colours are `#FFFFFF` on `#0A7558`, which pass.
- **Why deferred:** the Phase 4 design system owns the button look, and the hover state has Linux visual baselines that a change would invalidate. The walker parks the pointer in the corner before axe so it checks screen state, not the hover look.
- **Suggested fix:** a hover treatment that does not blend the accent with the page (a darker accent token for `hov:`), then regenerate the button baselines with the update-snapshots workflow.
