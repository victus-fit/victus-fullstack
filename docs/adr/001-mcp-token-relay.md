# ADR 001: MCP token relay profile endpoint

## Status

Accepted

## Context

The local `victus-agent` MCP server needs to authenticate backend requests on behalf of a user who has already logged in from the local CLI. The CLI stores a JWT locally, and the MCP server forwards that token to the web backend.

The existing web session endpoint, `/api/auth/me`, is cookie-based and should remain optimized for browser sessions. The MCP integration needs a stable HTTP contract that accepts `Authorization: Bearer <jwt>` and returns a minimal public profile.

## Decision

Add `GET /v1/me` as a backend API contract for MCP token relay.

The endpoint:

- accepts only Bearer access JWTs,
- validates the JWT with the existing signing settings,
- uses `sub` as the backend user id,
- verifies the referenced web session is active and unexpired,
- returns only stable public user/profile fields,
- returns a fixed 401 body for missing, invalid, or expired tokens.

Profile data is assembled from active `UserPreferenceItem` records into `goals`, `restrictions`, and `preferences` arrays.

## Consequences

The MCP server can use `BACKEND_API_URL=http://localhost:8000/v1` and call `/me` with the saved JWT without depending on browser cookies.

The web app's existing cookie session contract remains unchanged.

The response intentionally excludes JWT claims, session identifiers, password hashes, metadata blobs, and other internal fields.
