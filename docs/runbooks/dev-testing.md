---
id: victus-dev-testing
title: Dev testing
status: current
updated_at: 2026-07-21
owners:
  - Victus engineering
related_services:
  - victus-backend
  - victus-agent-chat
---

# Dev testing

## 1. Habilitar autenticación local

En `.env`:

```dotenv
APP_ENV=development
ENABLE_DEV_AUTH=true
```

Reinicia el stack después de cambiar la configuración.

## 2. Obtener y validar el token

Desde la raíz de `victus-fullstack`, captura el token en la sesión actual de la terminal:

```bash
TOKEN="$(make dev-token)"
curl --fail \
  --header "Authorization: Bearer ${TOKEN}" \
  http://localhost:8000/v1/me
```

La respuesta debe identificar a `dev-user@victus.invalid`.

## 3. Usar el token en victus-agent

En la misma terminal:

```bash
curl --fail \
  --request POST \
  --header "Authorization: Bearer ${TOKEN}" \
  --header 'Content-Type: application/json' \
  --data '{"conversation_id":"dev-test-1","request_id":"turn-1","message":"Hola, preséntate brevemente"}' \
  http://localhost:8766/chat
```

Usa un `request_id` nuevo para cada turno y conserva el mismo `conversation_id` para continuar la conversación.

## Problemas comunes

- `404` en `/oauth/dev-token`: revisa `ENABLE_DEV_AUTH=true` y reinicia el backend.
- `401` en `/chat`: genera otro token; dura una hora y debe enviarse como `Bearer`.

No guardes, registres ni agregues el token al repositorio. Al terminar, ejecuta `unset TOKEN` y vuelve a deshabilitar `ENABLE_DEV_AUTH` si ya no lo necesitas.
