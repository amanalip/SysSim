# Accessibility qualification

SysSim targets WCAG 2.2 Level AA for its application shell, forms, dialogs, metrics, and
keyboard-accessible diagram editing. This record describes the current automated and manual
evidence; it is not a legal conformance claim.

## Interaction model

- All application controls use native buttons, inputs, selects, or links. Canvas components expose
  button semantics, selection state, Enter/Space activation, and arrow-key movement in 16-pixel grid
  steps. Connection labels expose keyboard-focusable protocol, purpose, cut, and delete controls.
- Single-key shortcuts can be disabled in Keyboard Shortcuts. Shortcuts never run from editable
  fields or dialogs. Modified commands use conventional Ctrl/Cmd combinations.
- Dialogs expose a name and description, move focus inside, trap Tab, close with Escape, restore the
  invoking focus, and render outside an inert application root.
- Sidebar and telemetry navigation use tablist, tab, and tabpanel semantics. Toggle controls expose
  `aria-pressed` or `aria-expanded` state.
- Toasts, simulation state, graph selection, and graph counts use polite live regions; errors use an
  assertive alert role.
- Charts have equivalent KPI summaries and a complete table view.

## Visual and motion checks

- Semantic theme tokens were checked in both themes. Primary and secondary text, accent focus rings,
  and status colors are paired with text or icons rather than used as the sole signal.
- The global three-pixel focus indicator uses the theme accent-hover token plus a contrasting halo.
- `prefers-reduced-motion: reduce` suppresses request particles and effectively disables decorative
  CSS animation and transition timing. Pausing the simulation also pauses particle movement.
- Forced-colors mode preserves native control borders and a system Highlight focus outline.
- UI labels do not use font sizes below 10 CSS pixels. Browser qualification includes 200% zoom.
- Chaos visualization changes status and labels without rapid flashing.

## Reading order

The DOM order follows header, design tools, canvas, properties, telemetry, then notifications.
Canvas users first hear a graph summary and keyboard help, followed by individually operable nodes
and connection controls. The visual zone layer and request particles are decorative.

## Verification

- `npm run test:accessibility` runs axe checks plus dialog, keyboard, semantics, contrast-token, and
  reduced-motion contracts.
- `npm run test:e2e -- --project=chromium e2e/responsive-visual.spec.ts` checks representative
  viewports from 360×800 through 1920×1080, keyboard movement, 200% zoom, reduced motion, and forced
  colors.

## Known exceptions and remediation

The React Flow canvas is spatial by nature and does not yet provide a linear, editable edge list.
Every component and visible edge control is keyboard operable, graph changes are announced, and
metrics have tables, but a future graph-outline view would improve non-visual topology exploration.
This limitation is tracked as product enhancement work rather than silently claimed as full canvas
equivalence.
