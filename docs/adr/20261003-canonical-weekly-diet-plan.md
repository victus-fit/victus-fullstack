# Canonical weekly diet-plan contract

## Decision

Agent-created and refined diet plans must contain exactly Monday through Sunday in Spanish, daily targets, and two or three named meals per day. Each meal contains one or more foods with portions.

The agent exposes this structure through its tool schema. The fullstack internal agent endpoint independently validates it before a plan revision is written.

Diet-plan intake is an explicit three-step state (preferences, meals per day, cooking time). A completed document is saved as a draft and shown for review; only an explicit acceptance invokes activation.

## Rationale

The weekly-plan UI needs a predictable seven-day document. Validating only in the agent allowed abbreviated payloads such as two generic snacks to become active revisions.

## Consequences

Existing historical revisions remain readable through the frontend compatibility layer. New incomplete revisions receive HTTP 422 and are not saved; the agent must request or generate a complete proposal instead.

New drafts do not replace the active plan. Edits revise only the pending draft, and activation archives the prior active plan while selecting the accepted draft.
