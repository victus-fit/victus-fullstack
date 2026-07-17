# Component Rules

## Global Rules

- Use semantic tokens from `frontend/src/styles/tokens.css`.
- Do not add HEX colors directly in pages or components.
- Keep green restrained to active, primary, progress, focus, selection, and positive states.
- Prefer tight radii: 4px, 6px, 8px, 12px.
- Avoid pill badges except tiny quick actions already present in the current UI.
- Do not add large gradients, decorative blobs, purple/blue AI styling, or broad green surfaces.
- Do not create cards inside cards.
- Do not add theme toggles, light-mode variants, or alternate color palettes.

## Landing

- Use `.victus-landing` and `.vl-*` classes for the new landing identity.
- The first viewport must show Victus as a diet and wellbeing product.
- The main visual is a product preview, not an abstract AI illustration.
- CTAs must route to real app flows.
- Product preview interactions should be small and practical: day selection, meal selection, and chat drawer.

## Chat

- Keep the desktop chat layout as sidebar, conversation, and context rail.
- Messages should feel like a focused recommendation surface, not a generic bubble stack.
- Assistant messages may include evidence cards, but they must stay compact.
- The composer must have focus, disabled, hover, and active states.
- Suggested prompts should ask diet/wellbeing adjustment questions.

## Copy

Use plain, specific Spanish. Avoid generic AI language and architecture vocabulary on product-facing screens.

Preferred terms:

- plan alimentario;
- preferencias;
- restricciones;
- biométricas;
- adherencia;
- bienestar;
- ajustar;
- alternativa.

Avoid:

- health intelligence workspace;
- agent apps;
- orchestration;
- LangGraph;
- autonomous systems;
- generic “AI assistant” framing.

## Assets

Use `frontend/public/victus-logo.svg` for landing and chat brand marks.
