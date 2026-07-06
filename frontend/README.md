# Victus Frontend

Vite + React + TypeScript frontend for Victus WebApp.

## Routes

- `/`: public demo, the first face of the app.
- `/login`: login.
- `/register`: registration.
- `/app`: protected workspace.

## Run without Docker

```bash
npm install
npm run dev
```

Set this env var when running outside Docker:

```bash
export VITE_API_BASE_URL=http://localhost:8000
```
