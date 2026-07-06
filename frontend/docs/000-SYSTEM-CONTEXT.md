# Victus WebApp V1 — System Context

Victus WebApp V1 is a chat-first frontend for demonstrating scientific health intelligence to companies.

The first screen must always lead into the chat experience. Dashboard surfaces, charts and deeper navigation can come later, but they should not compete with the conversation in V1.

## Product thesis

Victus is not a generic AI chat. The differentiator is the combination of:

- conversational interface
- evidence retrieval
- traceability
- risk-aware recommendations
- practical plan reasoning

## V1 scope

Frontend only:

- React app
- professional chat UI
- local mock streaming
- light/dark tokens
- evidence card rail
- agent trace mini rail
- demo-ready animations

Backend later:

- FastAPI auth/session layer
- `/api/chat` or `/api/chat/stream`
- LangGraph adapter
- thread persistence
- real evidence retrieval
