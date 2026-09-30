# Victus landing and chat visual update

## Authenticated-app routing and sign out

### Goal

Keep authenticated users in `/app`, prevent the public landing from rendering for an active session, and provide a clear sign-out action that returns users to the unauthenticated David demo landing.

### Scope

- Frontend route guard based on the established `AuthContext` session.
- Sidebar sign-out control and handoff from the protected page.
- No authentication API, cookie, or backend session changes.

### Assumptions

- `AuthProvider` is the source of truth for whether the current browser session is active.
- Calling the existing `logout` method clears local auth state even if the best-effort logout request cannot complete.

### Steps

1. Make the top-level router render a loading state while the session is checked, then replace any public/auth route with `/app` for an authenticated user.
2. Pass a sign-out callback from the protected app page to the shared sidebar.
3. Add a sidebar footer action that logs out and navigates to the public landing.
4. Validate frontend typechecking and production build.

### Validation

- `npm run typecheck` in `frontend/`.
- Production Vite build in a temporary output directory.

### Risks

- Routing is client-side only; a direct request for `/` may briefly show the loading state while the session is verified.


## Agent contract alignment and David-plan scoping

### Goal

Restore authenticated chat compatibility with the current Victus Agent contract and ensure David's beta weekly-plan fixture is not presented as an assigned plan for newly registered users.

### Scope

- Normal chat gateway payload only.
- Frontend weekly-plan state for demo/David versus other authenticated users.
- No changes to the public demo endpoint, database schema, or plan persistence.

### Assumptions

- `/chat` in Victus Agent is authoritative and expects `locale` and `timezone`.
- `/demo/chat` remains a distinct, scoped demo contract that accepts `language`.
- David's weekly plan is a display fixture until persistent plan assignment exists.

### Steps

1. Translate the normal web chat language setting into the Agent's `locale` field and forward the authenticated user's timezone.
2. Pass the active user context to the weekly-plan workspace.
3. Render David's fixture only for the public demo or David's demo identity; render an explicit no-plan-assigned state for all other users.
4. Validate backend and frontend typechecks/builds.

### Validation

- `npm run build` in `backend/`.
- `npm run typecheck` and a production Vite build in `frontend/`.

### Risks

- This deliberately does not invent a persistence model for plans; plan assignment remains unavailable to ordinary accounts.


## Sidebar and David weekly-plan beta view

### Goal

Expose four clearly named primary areas in the shared app/demo sidebar—Chat, Registro de comidas, Plan semanal, and Biométricas—and provide a read-only weekly plan selected for David in the beta experience.

### Scope

- Frontend-only navigation labels and workspace selection.
- A static, read-only weekly-plan workspace for David.
- Shared sidebar behavior used by both the landing demo and authenticated app.

### Assumptions

- The requested plan is a beta visual/data fixture; no persistence or API endpoint is introduced.
- The existing editable meal-log screen becomes Registro de comidas.
- Profile remains implemented but is not part of the requested primary navigation.

### Steps

1. Split the current diet workspace identifier into meal-log and weekly-plan views.
2. Update the common sidebar to show the four requested primary labels and route each item to its appropriate workspace.
3. Add David's read-only weekly plan, with per-day meals, targets, and an explicit beta/read-only label.
4. Add responsive styles that reuse the existing workspace visual system.
5. Validate TypeScript and the production frontend build.

### Validation

- `npm run typecheck` in `frontend/`.
- `npm run build` in `frontend/`.

### Risks

- The plan is deliberately non-persistent. It must not be mistaken for the meal-log source of truth.


## Goal

Replace the old Victus frontend visual identity for the currently developed landing page and chat experience with the current dark diet and wellbeing product UI, restrained Google-Sheets-inspired green accent, dense product previews, and practical recommendation copy.

## Scope

- Frontend design tokens and global interaction styling.
- Landing page React markup and landing CSS.
- Chat shell/sidebar/message/composer styling and small copy adjustments.
- Permanent frontend design documentation under `docs/design/`.
- Root `AGENTS.md` frontend documentation requirement.

## Assumptions

- React/Vite/TypeScript and vanilla CSS stay in place.
- No new dependencies are needed.
- The current React implementation and `docs/design/` are the visual source of truth.
- Existing chat behavior, route names, auth flow, and backend contracts remain unchanged.

## Steps

1. Audit current frontend stack, routes, components, CSS cascade, and design references.
2. Replace old visual tokens with semantic Victus tokens for colors, spacing, radius, motion, layout, and overlays.
3. Rebuild the landing page composition around the interactive product preview.
4. Restyle chat/sidebar/composer/messages to match the chat preview density and surfaces.
5. Document the implemented system in `docs/design/` and require those docs from `AGENTS.md`.
6. Validate with TypeScript/build and Playwright visual smoke checks where possible.

## Validation

- `npm run build` in `frontend/`.
- Playwright screenshots for references and implemented pages at desktop/mobile sizes.

## Risks

- The existing CSS file contains older styles for auth and workspaces; this phase intentionally prioritizes landing and chat while keeping other screens functional.
- The app has a dirty worktree with unrelated changes, so edits must stay focused and avoid reverting user work.

---

# OAuth PKCE for victus-agent MCP

## Goal

Replace the manual CLI token handoff with an OAuth Authorization Code + PKCE flow for `victus-agent`, so `victus login` can authenticate through the web backend, exchange a loopback callback code for bearer tokens, and call `GET /v1/me`.

## Scope

- Backend OAuth endpoints at `/oauth/authorize`, `/oauth/token`, and `/oauth/revoke`.
- Public CLI OAuth client `victus-cli` with required S256 PKCE and dynamic `127.0.0.1` loopback redirects.
- Short-lived, single-use authorization code storage.
- Refresh-token issuance, rotation, reuse detection, and revocation using the existing `WebSession` model.
- Focused backend tests for OAuth validation, token exchange, refresh, revoke, and `/v1/me` bearer behavior.

## Assumptions

- Existing web session cookies remain the browser authentication mechanism for `/oauth/authorize`.
- The CLI stores tokens locally; this backend only issues and validates them.
- Existing JWT access/refresh token format can be reused for CLI bearer tokens.
- No new dependency is needed.

## Steps

1. Add an `OAuthAuthorizationCode` persistence model for hashed authorization codes and PKCE metadata.
2. Add request/response schemas for token and revoke requests.
3. Implement `/oauth/authorize` validation, loopback redirect acceptance, browser-session user loading, code issuance, and state echo.
4. Implement `/oauth/token` for authorization code and refresh token grants with PKCE validation and refresh rotation.
5. Implement `/oauth/revoke` for refresh-token session revocation.
6. Wire the OAuth router into the FastAPI app.
7. Add focused backend tests for required OAuth and bearer-profile scenarios.
8. Run backend validation.

## Validation

- `python -m unittest discover backend/tests`
- Syntax/import check for `app.main`.

## Risks

- The current repo has many unrelated dirty files, so backend edits must stay narrowly scoped.
- Browser consent is implemented as a first-party authorization redirect for the existing logged-in web session; a richer consent UI can be layered on later without changing the CLI protocol.

---

# Repository cleanup and artifact hygiene

## Goal

Remove generated local artifacts and duplicate visual scratch files from the repository root while preserving active source, documentation, design references, and local developer dependencies needed for immediate testing.

## Scope

- Root `.gitignore` hygiene for generated folders and known screenshot artifacts.
- Removal of Playwright MCP logs/snapshots, Python bytecode caches, frontend build output, and root-level PNG scratch files.
- No source refactors, route changes, auth changes, or dependency changes.

## Assumptions

- `newlook/` is obsolete after the current design was integrated and should be removed.
- `frontend/public/` assets are active app assets and must stay.
- `frontend/node_modules/` is ignored but kept so local frontend validation remains available without reinstalling.
- Root PNGs are generated screenshots or duplicates, not active source assets.

## Steps

1. Extend `.gitignore` for `.playwright-mcp/`, frontend build/dependency output, Python caches, and root visual scratch artifacts.
2. Remove generated folders: `.playwright-mcp/`, `frontend/dist/`, and Python `__pycache__/`.
3. Remove root PNG scratch/duplicate files.
4. Run status and relevant smoke validation.

## Validation

- `git status --short`
- `SECRET_KEY=... /tmp/victus-backend-venv/bin/python -m unittest discover backend/tests`

## Risks

- Root PNG and obsolete reference deletion is based on current references; active visual assets are preserved in `frontend/public/`.

---

# Better Auth Google login service

## Goal

Add Better Auth with Google sign-in as the primary web login path while keeping the existing FastAPI product API and session contract working.

## Scope

- New TypeScript `auth-service/` using Better Auth on `/api/auth/*`.
- Google social provider configuration.
- Session bridge endpoint that validates Better Auth session, upserts FastAPI user/session rows, and sets existing FastAPI-compatible cookies.
- Docker Compose service and environment wiring.
- Frontend auth page redesign around Google-first login and `return_to`.
- No replacement of `/oauth/authorize` PKCE CLI endpoints in this phase.

## Assumptions

- Better Auth runs in Node/Hono, not inside FastAPI.
- FastAPI remains the owner of product APIs, `/v1/me`, and OAuth PKCE token exchange.
- During migration, email/password and demo FastAPI auth remain available as fallback.
- Google Cloud redirect URI will point to the auth service route configured by Better Auth.

## Steps

1. Create `auth-service/` with Better Auth, Hono, Postgres connection, Google provider, CORS, health check, and FastAPI session bridge.
2. Add Dockerfile and compose service on port `8001`.
3. Add env vars for Better Auth URL/secret, auth service origin, and frontend auth base URL.
4. Add frontend Better Auth client and update `AuthPage` to use Google-first login with `return_to`.
5. Keep demo/email fallback for development.
6. Validate auth-service TypeScript, frontend build, and backend tests.

## Validation

- `npm run build` in `auth-service/`.
- `npm run build` in `frontend/`.
- `SECRET_KEY=... /tmp/victus-backend-venv/bin/python -m unittest discover backend/tests`.

## Risks

- A real Google OAuth test requires valid `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- Better Auth schema creation/migration may require running Better Auth CLI or startup-generated schema depending on installed version.

---

# Redesign web application

## Goal

Upgrade the Victus webapp visual system and primary screens to a more premium, product-grade interface without changing framework, API contracts, authentication, or chat behavior.

## Scope

- Frontend CSS tokens, global interaction states, metadata, and small React markup adjustments where required.
- Public demo chat shell, auth screens, sidebar, composer, message surfaces, and workspace dashboard surfaces.
- No backend behavior changes.

## Assumptions

- Existing React/Vite/TypeScript stack stays in place.
- Vanilla CSS remains the styling system.
- No new npm dependencies are needed.
- External font loading through CSS is acceptable with system fallbacks.
- Lucide icons remain for now to avoid adding a dependency, but usage should be less visually generic through sizing, containers, and layout.

## Steps

1. Audit current UI patterns and identify generic or weak areas.
2. Update foundational tokens: typography, palette, shadows, radii, focus, and motion.
3. Add metadata and favicon assets so the app has a branded browser surface.
4. Improve shell/sidebar/chat/auth/workspace styling with targeted CSS and minimal markup changes.
5. Validate build, TypeScript, and runtime smoke checks.

## Validation

- `npm run build` in `frontend/`.
- `docker compose ps` and backend health check if containers are running.
- Visual smoke check in browser-sized viewports when tooling is available.

## Risks

- External font CDN may be unavailable; fallbacks must remain acceptable.
- Large CSS file has historical sections; changes must avoid fighting later cascade blocks.
- Existing Docker containers may keep old frontend build state until rebuilt.

---

# Landing page visual upgrade

## Goal

Make the Victus landing page feel more visually attractive and product-grade while keeping the existing React/Vite app, navigation behavior, and logo interaction intact.

## Scope

- `frontend/src/pages/LandingPage.tsx`
- Landing-specific CSS in `frontend/src/styles/globals.css`
- No new dependencies, routes, backend changes, or public API changes.

## Assumptions

- The active brand assets live in `frontend/public/`.
- The app palette remains moss, graphite, celadon, warm surfaces, and dark-mode equivalents from `tokens.css`.
- The landing should show more product context without becoming a marketing-only splash page.

## Steps

1. Add richer landing content: status strip, product preview, metric chips, and stronger bento details.
2. Refine layout and surfaces with layered backgrounds, subtle texture, asymmetry, and responsive constraints.
3. Keep pointer-driven logo rotation and existing CTA navigation.
4. Validate with frontend build.

## Validation

- `npm run build` in `frontend/`.

## Risks

- Large CSS cascade may override landing styles later in the file.
- Added visual density must remain readable on mobile.

---

# Dark mode palette cleanup

## Goal

Remove noisy dark-mode lighting and replace the current generic moss dark palette with a more distinctive Victus palette that feels calm, premium, and readable.

## Scope

- Dark theme tokens in `frontend/src/styles/tokens.css`.
- Global and landing background treatment in `frontend/src/styles/globals.css`.
- No component behavior, routes, or dependencies.

## Assumptions

- Light mode can remain close to the existing warm grid direction.
- Dark mode should keep the grid, but avoid radial glows, bright washes, and decorative lighting.
- The new palette should still work with the recolored compass logo.

## Steps

1. Replace dark tokens with obsidian, oxide sage, lichen frost, and muted brass accents.
2. Disable global dark-mode wash lighting and diagonal/radial effects.
3. Add dark-specific landing overrides so the grid is restrained and surfaces are flat.
4. Validate build and take dark-mode screenshots.

## Validation

- `npm run build` in `frontend/`.
- Playwright screenshots in dark mode for desktop and mobile.

## Risks

- Existing color-mix usage may amplify accent colors in unexpected places.
- Dark-mode contrast needs visual verification after token changes.

---

# MCP token relay `/v1/me`

## Goal

Expose a stable backend contract for the local `victus-agent` MCP server to validate a saved JWT and load the authenticated user's public profile through `GET /v1/me`.

## Scope

- Backend FastAPI route under `/v1`.
- Bearer-token authentication using the existing access JWT and session model.
- Public response schema for user identity and profile summary.
- Focused backend tests for 401/200 behavior, sensitive-field filtering, and `sub`-based user loading.

## Assumptions

- `victus-agent` will send the same access JWT format issued by the web backend.
- The existing web `/api/auth/me` cookie session contract must remain unchanged.
- Profile data can be assembled from active `UserPreferenceItem` rows without adding new tables.
- No frontend changes are required for this integration.

## Steps

1. Add a `/v1/me` router that accepts `Authorization: Bearer <jwt>`.
2. Validate access JWT type, `sub`, `sid`, active user, active session, and session expiry.
3. Return only stable public fields and profile arrays.
4. Ensure missing/invalid/expired tokens return the required 401 JSON shape.
5. Add tests for the required backend contract.
6. Run relevant backend validation.

## Validation

- `python -m unittest discover backend/tests`
- Import/syntax check for the FastAPI app if the environment has backend dependencies installed.

## Risks

- Existing local dependencies may be installed only in Docker, so host-side tests may require the backend environment.
- The CLI token issuer is outside this repository; this change validates the backend half of the relay contract.

---

# Landing interactive preview

## Goal

Connect the landing-page preview to the existing authenticated chat controller while retaining the login handoff for visitors.

## Scope

- Landing preview chat UI and its existing login handoff.
- No separate conversation API, agent API, or persistence model.

## Validation

- Frontend typecheck and production build where filesystem permissions allow it.

---

# Ephemeral interactive demo

## Goal

Let an anonymous landing-page visitor add, edit, and remove meals and record
biometrics during one demo session, using the product's existing response
shapes without persisting or sharing their data.

## Scope

- Add an in-memory, TTL-bound demo session store keyed by a client-generated
  identifier that exists only for the page lifetime.
- Expose demo endpoints returning the same meal-log, food-search, and health
  overview shapes consumed by the authenticated application.
- Route the landing preview through those endpoints and reuse the existing
  diet and workspace UI.
- Add a small metric-entry form to the biometrics workspace.

## Assumptions

- In-memory storage is acceptable for the current single-instance demo.
- Reloading creates a new identifier, making prior state unreachable even if
  its server-side TTL has not elapsed.

## Steps

1. Define table-shaped in-memory demo records and scoped demo API routes.
2. Add a frontend page-lifetime demo session client and direct existing data
   requests to the demo routes only while the landing preview is active.
3. Reuse the normal diet and biometrics components in the preview.
4. Cover API isolation behaviour and validate both projects.

## Validation

- `npm test` and `npm run build` in `backend/`
- `npm run typecheck` and a Vite build to a temporary output directory in
  `frontend/`
- `git diff --check`

## Risks

- The upstream `demo:david` agent remains read-only; session-specific diet
  recommendations need a compatible agent endpoint in a later change.

---

# Persisted David demo template

## Goal

Store David's immutable demo baseline in the existing application user data
tables, then initialize every anonymous demo session from that persisted
template while preserving session-only edits.

## Scope

- Seed a reserved David user, baseline metrics, and profile preferences.
- Load that template when an ephemeral demo session is first created.
- Keep visitor changes in the existing TTL-bound session map.

## Non-goals

- No visitor demo change is written to PostgreSQL.
- No new permanent diet-plan model is introduced; the current product schema
  has meal logs but no recipe-plan table.

## Validation

- Backend unit tests for template seeding/session cloning.
- Backend typecheck and test suite.
