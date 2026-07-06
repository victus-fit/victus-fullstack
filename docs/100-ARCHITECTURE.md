# Victus WebApp — Architecture

```txt
Browser
  -> Vite React frontend
  -> FastAPI backend
  -> Postgres webapp database
  -> LangGraph service later, behind FastAPI
```

V1 includes a backend mock gateway for `/api/chat/stream`. This is intentional: it proves auth, cookies, CSRF, ownership, persistence and streaming before connecting the real LangGraph service.

## Public routes

- `/`: public demo. This is the first face of the product.
- `/login`: session creation.
- `/register`: account creation.

## Protected route

- `/app`: authenticated workspace with chat, dietas, biometrics, profile and about.

## Backend responsibilities

- User creation.
- Password hashing.
- JWT issuing.
- HttpOnly cookie session storage.
- Refresh token rotation.
- CSRF validation for unsafe requests.
- Conversation and message ownership.
- Gateway endpoint for streaming chat responses.
- Security headers.
- CORS restricted to configured frontend origins.
