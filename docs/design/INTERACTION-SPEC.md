# Interaction Spec

## Required States

Interactive controls need:

- default;
- hover;
- active or pressed;
- keyboard focus;
- disabled where applicable;
- loading or streaming where behavior exists.

Focus rings use `--color-accent` plus `--color-accent-subtle`.

## Motion

Use restrained motion:

- hover lift: `translateY(-1px)`;
- drawer open: opacity plus small translate/scale;
- streaming caret or pulse for live state;
- message entry animations already provided by `motion/react`.

Respect `prefers-reduced-motion: reduce`.

## Landing Interactions

The product preview supports:

- selecting days in the weekly plan;
- selecting meals;
- opening and closing the Victus chat drawer;
- visible progress updates through the context rail.

Mobile behavior:

- hide the preview sidebar and context rail;
- keep week chips horizontally scrollable;
- allow the chat drawer to fit between screen edges.

## Chat Interactions

The chat experience supports:

- starting a new conversation;
- selecting existing conversations;
- sending prompt chips;
- streaming state;
- reset;
- sidebar collapse.

Desktop chat shows the right context rail. On smaller screens, hide it to preserve reading space.

## Visual Validation Workflow

Before finishing frontend visual work:

1. Compare the current landing and chat implementation against `docs/design/VICTUS-UI.md` and `docs/design/COMPONENT-RULES.md`.
2. Run `npm run build` in `frontend/`.
3. Capture or inspect desktop and mobile views with Playwright when available.
4. Confirm no new HEX colors were added in page or component files.
