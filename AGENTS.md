# AGENTS.md

## Purpose

This repository is developed with Codex CLI as the primary engineering runtime.

The agent must:

- preserve project structure and conventions;
- prefer small, testable changes;
- explain plans before complex edits;
- validate work before claiming completion;
- avoid unrelated refactors.

## Working Rules

1. For non-trivial tasks, plan first before editing files.
2. Prefer the smallest correct change.
3. Do not rename public APIs unless explicitly asked.
4. Do not introduce new dependencies unless necessary.
5. If a task affects architecture, write a short ADR in `docs/adr/`.
6. If a task affects operations, update or create a runbook in `docs/runbooks/`.
7. Before finishing, run the relevant validation commands.
8. If tests cannot be run, state exactly why.
9. Do not claim success without evidence.

## Frontend Design Requirement

Before any frontend visual or interaction change, read:

- `docs/design/VICTUS-UI.md`
- `docs/design/COMPONENT-RULES.md`
- `docs/design/INTERACTION-SPEC.md`

For landing and chat work, use the current implementation and design docs as the source of truth. Do not reintroduce the old Victus look for landing or chat.

## Repository Structure

- `skills/` -> reusable task workflows
- `docs/adr/` -> architecture decision records
- `docs/runbooks/` -> operational instructions
- `docs/design/` -> frontend visual and interaction system
- `ops/scripts/` -> helper scripts
- `ops/checks/` -> validation scripts
- `PLANS.md` -> step-by-step plan for larger tasks

## Planning Policy

Use `PLANS.md` when:

- the task spans multiple files;
- the task involves architecture or infrastructure;
- the task is ambiguous;
- the task may take multiple iterations.

When using `PLANS.md`, include:

- goal;
- scope;
- assumptions;
- steps;
- validation;
- risks.

## Validation Policy

Before marking work complete, run relevant checks from this list when available:

- formatting;
- lint;
- typecheck;
- unit tests;
- integration tests;
- build;
- security or config sanity checks.

## Editing Policy

Prefer:

- focused diffs;
- explicit tradeoffs;
- comments only where they add value;
- stable interfaces.

Avoid:

- broad rewrites;
- speculative abstractions;
- style-only changes;
- hidden behavior changes.

## Skill Usage

When relevant, prefer using a local skill from `skills/` instead of ad-hoc prompting.

Available core skills:

- `task-intake`
- `backend-feature`
- `debug`
- `handoff`
- `planner`
- `coder`
