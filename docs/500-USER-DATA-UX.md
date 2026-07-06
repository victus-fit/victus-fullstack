# Victus WebApp V0.3 — User Data UX

## Goal

Start representing user-owned health data in a way that is understandable for end users and reusable by the backend.

This is not the LangGraph memory layer. It is the webapp product layer: data that should be visible, editable, chartable and easy to audit.

## Added tables

```txt
user_metric_entries
user_preference_items
```

`user_metric_entries` stores time-based values such as weight, sleep, energy and adherence.

`user_preference_items` stores stable user context such as food preferences, restrictions, schedule constraints and communication preferences.

## Added endpoint

```txt
GET /api/users/me/health-overview
```

The endpoint returns one frontend-ready object:

```txt
summary_cards
metrics
preference_groups
nutrition_focus
```

The first read creates safe demo seed data for a new authenticated user. This keeps the UI useful while the real onboarding and LangGraph write-path are still pending.

## UI views

`/app` now has product-ready shells for:

- Dietas
- Biometrics
- Profile
- About

The charts are intentionally lightweight SVG/CSS components. No charting dependency is introduced yet. This keeps the V0.3 frontend easy to read and portable to mobile/native patterns later.

## Future write-path

Later LangGraph should not write directly into arbitrary webapp tables. It should write through FastAPI-owned commands such as:

```txt
POST /api/users/me/metrics
POST /api/users/me/preferences
POST /api/conversations/{id}/artifacts
```

That keeps ownership, auth, validation and audit inside the webapp backend.
