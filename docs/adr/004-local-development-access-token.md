---
id: adr-004
title: Local development access token
status: accepted
updated_at: 2026-07-21
owners:
  - Victus engineering
related_docs:
  - ../Runbook.md
  - ../Security-Model.md
  - ../../contracts/dev-access-token.contract.json
---

# ADR 004: Local development access token

## Context

Local Victus Agent development needs a real bearer identity without automating browser login or weakening the agent. The agent already resolves bearer identity through the normal backend `GET /v1/me` contract, which validates both the JWT and its server-side session.

## Decision

Provide `POST /oauth/dev-token` only when `ENABLE_DEV_AUTH=true` and `APP_ENV` is `local`, `development`, or `test`.

The backend seeds one fixed, minimally configured development user only in that mode. Each request creates a real one-hour `web_sessions` row and issues an access JWT through the same signer and claims used by normal sessions. It returns no refresh token and accepts no client-selected identity.

The route is not registered when disabled. Enabling it in staging, production, or any unknown environment fails backend configuration during startup.

## Tradeoffs

- Local agent work becomes deterministic and does not need an interactive browser flow.
- Each token creates a short-lived session row that can be audited or expired normally.
- The endpoint remains intentionally unsuitable for shared development or staging environments.

## Alternatives considered

- A fixed token was rejected because it cannot expire safely and would embed a reusable credential.
- A header-based user bypass was rejected because it would weaken normal middleware and agent authentication.
- Returning a refresh token was rejected because the one-hour local workflow does not require renewable access.
- Accepting a user id in the request was rejected because it would turn the endpoint into an impersonation primitive.

## Consequences

Operators must opt in explicitly and request tokens on demand. Tokens must stay out of logs, repository files, shell history, metrics, and documentation. Victus Agent remains unchanged and continues to trust only the normal `/v1/me` validation result.
