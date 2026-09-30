# ADR 007: Phoenix gateway observability

## Status

Accepted.

## Context

Chat failures can occur before the agent enters LangGraph, especially at the webapp backend gateway
boundary. Agent-only Phoenix traces show graph execution, but they do not explain gateway request
payloads, agent HTTP status codes, stream finalization, or the final UI message persisted by the
webapp.

## Decision

The webapp backend emits Phoenix/OpenTelemetry spans for `/api/chat/stream` using the official
`@arizeai/phoenix-otel` package. The gateway records non-secret operational attributes such as
conversation IDs, request IDs, agent status, sent mode, response sizes, and final UI-message
previews. It injects W3C trace context headers into the downstream `victus-agent`, which extracts
that context and continues the same trace in project `victus-local`.

## Consequences

- Phoenix becomes the primary place to inspect a complete chat turn across gateway and agent in one
  readable trace.
- Local Phoenix keeps LLM inputs, messages, and outputs visible; curated `victus.*` node attributes
  summarize graph state alongside serialized tool results when forensic debugging is needed.
- Local tracing is enabled with environment variables and can be disabled without code changes.
- The frontend browser is intentionally not instrumented yet; backend gateway telemetry is the
stable operational boundary.
- Chat resume behavior is unchanged.
