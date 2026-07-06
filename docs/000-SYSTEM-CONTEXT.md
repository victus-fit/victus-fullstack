# Victus WebApp — System Context

Victus WebApp is the product layer in front of Victus Agent.

The webapp owns:

- Web users.
- Email/password auth for the local V1.
- Future OAuth identities.
- HttpOnly cookie sessions.
- CSRF token for unsafe browser requests.
- UI settings.
- App workspaces.
- Product conversations.
- Rendered messages and artifacts.
- User files.
- Agent request logs.

The agent database remains separate and owns:

- LangGraph turns.
- Node runs.
- User events.
- Projected memory/state.
- Pending interaction state.

The webapp references the agent using logical identifiers such as `agent_user_id`, `agent_conversation_id`, and `agent_turn_id`. It does not create cross-database foreign keys to the agent database.
