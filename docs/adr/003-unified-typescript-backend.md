# ADR 003: Unify authentication and product APIs in TypeScript

## Status

Accepted

## Context

Victus previously ran FastAPI for product APIs and a separate TypeScript service for Better Auth. The services shared Postgres tables, JWT secrets, cookie names, and session semantics. This created a distributed runtime boundary without independent data ownership and left two authentication implementations active.

The product also uses TypeScript in the frontend and intends to standardize the web application runtime around that language.

## Decision

Use one TypeScript/Hono backend on port `8000` for Better Auth, browser sessions, OAuth PKCE, product APIs, persistence, and agent streaming.

Preserve the existing external contracts:

- API paths and response shapes;
- `victus_access`, `victus_refresh`, and `victus_csrf` cookies;
- HS256 JWT claims used by the browser and CLI;
- existing Postgres product tables and data;
- the external LangGraph boundary.

Better Auth remains responsible for Google identity-provider interaction, but the unified backend owns the application session issued after identity verification.

## Consequences

- One deployment and one runtime own authentication and product behavior.
- The direct shared-database coupling between two services disappears.
- TypeScript becomes the backend and frontend implementation language.
- The Python endpoints and tests had to be migrated before removing FastAPI.
- Authentication and database compatibility require contract-focused regression tests.

## Outcome

The migration is complete. The legacy FastAPI runtime and standalone auth service were removed after the TypeScript backend preserved the active session, OAuth, product API, and agent-gateway contracts.

## Alternatives considered

### Keep both services

Rejected for the current scale because the services share secrets, cookies, and database ownership without an independent identity-service boundary.

### Keep FastAPI and absorb Better Auth behavior

This is the smallest operational change, but it does not meet the selected TypeScript runtime standard.

### Create a fully independent identity service

Deferred until multiple applications, SSO, separate ownership, or independent scaling justify an OIDC/JWKS boundary and separate data ownership.
