# Victus landing and chat visual update

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
