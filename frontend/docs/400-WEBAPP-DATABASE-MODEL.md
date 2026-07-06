# Victus Web App Database Model V1

Scope: web app database only. Payments are intentionally excluded.

The web app database owns product-facing state: users, auth identities, browser sessions, UI preferences, visible conversations, renderable messages, files, onboarding state, workspace navigation and FastAPI-to-agent request tracking.

The LangGraph/agent database remains owner of agent internals: events, turns, node runs, projector offsets, user projections, conversation summaries and pending interaction state.

Agent references in this model are logical references, not hard cross-database foreign keys.

```mermaid
erDiagram
    APP_USERS {
        uuid user_id PK
        text primary_email
        text display_name
        text avatar_url
        text status
        text locale
        text timezone
        datetime created_at
        datetime updated_at
        datetime last_seen_at
    }

    AUTH_IDENTITIES {
        uuid auth_identity_id PK
        uuid user_id FK
        text provider
        text provider_subject
        text email
        boolean email_verified
        datetime created_at
        datetime updated_at
    }

    WEB_SESSIONS {
        uuid session_id PK
        uuid user_id FK
        text session_hash
        text status
        text ip_hash
        text user_agent_hash
        datetime created_at
        datetime expires_at
        datetime revoked_at
    }

    USER_SETTINGS {
        uuid user_id PK,FK
        text theme
        boolean sidebar_collapsed
        text default_workspace_id
        text density
        text preferred_language
        jsonb ui_preferences
        datetime updated_at
    }

    AGENT_ACCOUNT_LINKS {
        uuid agent_link_id PK
        uuid user_id FK
        text agent_user_id
        text status
        datetime created_at
        datetime synced_at
    }

    APP_WORKSPACES {
        text workspace_id PK
        text label
        text route
        text icon
        text status
        int sort_order
    }

    USER_WORKSPACE_STATE {
        uuid user_id FK
        text workspace_id FK
        datetime last_opened_at
        boolean pinned
        jsonb local_state
        datetime updated_at
    }

    APP_CONVERSATIONS {
        uuid conversation_id PK
        uuid user_id FK
        text workspace_id FK
        text agent_conversation_id
        text title
        text status
        boolean pinned
        datetime created_at
        datetime updated_at
        datetime archived_at
    }

    APP_MESSAGES {
        uuid message_id PK
        uuid conversation_id FK
        uuid user_id FK
        uuid parent_message_id FK
        uuid agent_turn_id
        text role
        text status
        text content_text
        datetime created_at
        datetime updated_at
        jsonb metadata
    }

    MESSAGE_PARTS {
        uuid message_part_id PK
        uuid message_id FK
        int sort_order
        text part_type
        text text_content
        jsonb json_content
        datetime created_at
    }

    MESSAGE_ARTIFACTS {
        uuid artifact_id PK
        uuid conversation_id FK
        uuid message_id FK
        text artifact_type
        text title
        text source
        jsonb payload
        datetime created_at
    }

    EVIDENCE_REFERENCE_SNAPSHOTS {
        uuid evidence_snapshot_id PK
        uuid artifact_id FK
        text canonical_evidence_id
        text paper_id
        text study_id
        text confidence
        text source_quote
        jsonb payload
        datetime created_at
    }

    USER_FILES {
        uuid file_id PK
        uuid user_id FK
        text storage_provider
        text storage_key
        text original_filename
        text mime_type
        bigint size_bytes
        text checksum_sha256
        text status
        datetime created_at
    }

    MESSAGE_FILES {
        uuid message_id FK
        uuid file_id FK
        text attachment_role
        datetime created_at
    }

    AGENT_REQUESTS {
        uuid request_id PK
        uuid user_id FK
        uuid conversation_id FK
        uuid message_id FK
        text agent_user_id
        text agent_conversation_id
        uuid agent_turn_id
        text status
        text idempotency_key
        jsonb request_payload
        jsonb response_summary
        text error_code
        text error_message
        datetime started_at
        datetime completed_at
    }

    ONBOARDING_STATE {
        uuid user_id PK,FK
        text status
        text current_step
        jsonb completed_steps
        jsonb answers_snapshot
        datetime updated_at
    }

    APP_AUDIT_LOGS {
        uuid audit_id PK
        uuid user_id FK
        text actor_type
        text action
        text entity_type
        text entity_id
        datetime created_at
        jsonb metadata
    }

    AGENT_DB__USER_IDENTITIES {
        text agent_user_id PK
    }

    AGENT_DB__TURNS {
        uuid turn_id PK
    }

    APP_USERS ||--o{ AUTH_IDENTITIES : authenticates_with
    APP_USERS ||--o{ WEB_SESSIONS : opens
    APP_USERS ||--|| USER_SETTINGS : configures
    APP_USERS ||--o| AGENT_ACCOUNT_LINKS : maps_to_agent
    APP_USERS ||--o{ USER_WORKSPACE_STATE : customizes
    APP_WORKSPACES ||--o{ USER_WORKSPACE_STATE : is_opened_by
    APP_WORKSPACES ||--o{ APP_CONVERSATIONS : groups
    APP_USERS ||--o{ APP_CONVERSATIONS : owns
    APP_CONVERSATIONS ||--o{ APP_MESSAGES : contains
    APP_MESSAGES ||--o{ MESSAGE_PARTS : decomposes_into
    APP_MESSAGES ||--o{ MESSAGE_ARTIFACTS : renders
    APP_CONVERSATIONS ||--o{ MESSAGE_ARTIFACTS : groups
    MESSAGE_ARTIFACTS ||--o{ EVIDENCE_REFERENCE_SNAPSHOTS : cites
    APP_USERS ||--o{ USER_FILES : uploads
    APP_MESSAGES ||--o{ MESSAGE_FILES : attaches
    USER_FILES ||--o{ MESSAGE_FILES : attached_to
    APP_USERS ||--o{ AGENT_REQUESTS : initiates
    APP_CONVERSATIONS ||--o{ AGENT_REQUESTS : proxies
    APP_MESSAGES ||--o{ AGENT_REQUESTS : triggers
    APP_MESSAGES ||--o| APP_MESSAGES : replies_to
    APP_USERS ||--o| ONBOARDING_STATE : progresses_through
    APP_USERS ||--o{ APP_AUDIT_LOGS : produces
    AGENT_ACCOUNT_LINKS }o--|| AGENT_DB__USER_IDENTITIES : logical_ref
    APP_MESSAGES }o--o| AGENT_DB__TURNS : logical_ref
    AGENT_REQUESTS }o--o| AGENT_DB__TURNS : logical_ref
```

## Design notes

- `APP_USERS` is the product user. It is not the same table as `AGENT_USER_IDENTITIES`.
- `AUTH_IDENTITIES` supports Google OAuth first, but leaves room for passwordless or enterprise SSO later.
- `WEB_SESSIONS` supports HttpOnly session cookies. Store only a hash of the session token.
- `AGENT_ACCOUNT_LINKS` maps the web product user to the agent user identity.
- `APP_CONVERSATIONS` is the visible thread list owned by the web product. `agent_conversation_id` links to LangGraph/agent state.
- `APP_MESSAGES` stores renderable chat history for the UI. It should not store every LangGraph internal event.
- `MESSAGE_PARTS` exists because future messages may contain text, tool notices, charts, tables, source lists or structured blocks.
- `MESSAGE_ARTIFACTS` stores renderable UI cards such as evidence cards, plan cards, trace summaries and metric cards.
- `EVIDENCE_REFERENCE_SNAPSHOTS` stores a UI snapshot of evidence references used in an answer. The canonical scientific truth remains in the evidence/RAG system.
- `AGENT_REQUESTS` gives FastAPI observability and retry/idempotency without reading the agent database for every UI action.
- `APP_WORKSPACES` should seed V1 rows: `chat`, `diets`, `biometrics`, `profile`, `about`.
- `USER_SETTINGS.sidebar_collapsed` persists the new collapsible sidebar behavior.
