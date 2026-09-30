---
id: 009-multilingual-e5-food-search
title: Temporary multilingual-e5-large-instruct fallback for food search
status: superseded
superseded_by: 011-manual-meal-import-outbox
date: 2026-07-24
superseded_by: 008-bge-m3-food-search
---

# Context

The Hugging Face Inference Provider request for `BAAI/bge-m3` timed out, while the provider successfully returned a 1024-dimensional vector for `intfloat/multilingual-e5-large-instruct` using the configured `HF_TOKEN`.

# Decision

`intfloat/multilingual-e5-large-instruct` was temporarily selected while BGE-M3 timed out. A direct request and the production adapter subsequently returned valid BGE-M3 vectors in under one second, so the default returns to `BAAI/bge-m3`. The adapter retains E5 query formatting when that model is explicitly configured. The indexer treats a changed `embedding_model` as stale, so model changes regenerate derived vectors even if the food content is unchanged.

# Consequences

- The existing `vector(1024)` schema and HNSW index remain compatible.
- Backfill must be run to replace the temporary E5 vectors with BGE-M3 vectors.
