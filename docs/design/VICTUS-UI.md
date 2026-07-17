# Victus UI

## Product Personality

Victus is a personal diet and wellbeing recommendation agent. The interface should feel calm, practical, private, and focused on helping a person adapt food decisions to real life.

Victus must not look like an agent-orchestration dashboard, research console, generic chatbot, or futuristic AI landing page.

## Visual Source Of Truth

The current React implementation, `frontend/src/styles/tokens.css`, `frontend/src/styles/globals.css`, and this design documentation are the source of truth.

Frontend changes to landing or chat must preserve the existing composition, density, dark palette, restrained accent usage, border treatment, and responsive behavior.

## Theme

Victus uses a single fixed dark identity in this version. Do not add light mode, theme switching, or alternate palette behavior. `useTheme()` exists only as a compatibility shim and always returns `dark`.

## Implemented Tokens

Tokens live in `frontend/src/styles/tokens.css`.

Colors:

- `--color-bg-canvas: #030504`
- `--color-bg-surface: #080c09`
- `--color-bg-subtle: #0d120f`
- `--color-bg-elevated: #121914`
- `--color-border-subtle: rgba(255, 255, 255, 0.07)`
- `--color-border-default: rgba(255, 255, 255, 0.11)`
- `--color-border-strong: rgba(255, 255, 255, 0.18)`
- `--color-text-primary: #f2f5f3`
- `--color-text-secondary: #a9b2ac`
- `--color-text-muted: #747f78`
- `--color-accent: #0f9d58`
- `--color-accent-hover: #13ad63`
- `--color-accent-active: #0b8249`
- `--color-accent-subtle: rgba(15, 157, 88, 0.12)`
- `--color-accent-border: rgba(15, 157, 88, 0.32)`

Spacing:

- `--space-1: 4px`
- `--space-2: 8px`
- `--space-3: 12px`
- `--space-4: 16px`
- `--space-6: 24px`
- `--space-8: 32px`
- `--space-12: 48px`
- `--space-16: 64px`
- `--space-24: 96px`

Radii:

- `--radius-1: 4px`
- `--radius-2: 6px`
- `--radius-3: 8px`
- `--radius-4: 12px`

Motion:

- `--duration-fast: 120ms`
- `--duration-base: 180ms`
- `--duration-slow: 240ms`

Layout:

- `--content-max: 1248px`
- `--nav-height: 70px`
- `--chat-sidebar-width: 252px`
- `--chat-context-width: 300px`
- `--shadow-overlay`
- `--shadow-browser`

## Typography

Use `--font-sans`, currently Inter/system fallback. Landing headlines use large, tight, balanced text. Product and chat UI use compact labels and dense line-height matching the references.

Do not use oversized hero type inside dashboards, sidebars, message bubbles, cards, or context rails.

## Accent Usage

The green accent is inspired by Google Sheets and must remain contained. Use it only for:

- primary CTA;
- active navigation or selected item;
- progress;
- focus ring;
- selection;
- positive state;
- small logo detail.

Do not use green as a large background wash or decorative section color.

## Composition

Landing uses:

- sticky 70px navigation;
- centered hero copy;
- browser-like product preview;
- three-column app preview on desktop;
- feature sections with restrained borders and no decorative cards.

Chat uses:

- left navigation rail;
- central conversation column;
- right context rail on desktop;
- compact message surfaces;
- bottom composer.

## Responsive

At narrow widths, hide nonessential nav links, remove the product preview side/context rails, make day chips horizontally scrollable, and hide the chat context rail.
