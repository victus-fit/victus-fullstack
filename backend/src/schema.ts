import { pool } from "./db.js";
import { seedDemoDavid } from "./demoTemplate.js";
import { ensureFoodbCatalog } from "./foodbBootstrap.js";

const ddl = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE TABLE IF NOT EXISTS app_users (
  user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), primary_email varchar(320) UNIQUE NOT NULL,
  display_name varchar(160), avatar_url text, status varchar(32) NOT NULL DEFAULT 'active',
  locale varchar(24) NOT NULL DEFAULT 'es-CL', timezone varchar(64) NOT NULL DEFAULT 'America/Santiago',
  last_seen_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS auth_identities (
  auth_identity_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES app_users(user_id) ON DELETE CASCADE,
  provider varchar(64) NOT NULL, provider_subject varchar(320) NOT NULL, email varchar(320) NOT NULL,
  email_verified boolean NOT NULL DEFAULT false, password_hash text, metadata_json jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_auth_identities_provider_subject UNIQUE(provider, provider_subject)
);
CREATE TABLE IF NOT EXISTS web_sessions (
  session_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES app_users(user_id) ON DELETE CASCADE,
  session_hash varchar(128) NOT NULL, status varchar(32) NOT NULL DEFAULT 'active', ip_hash varchar(128), user_agent_hash varchar(128),
  expires_at timestamptz NOT NULL, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
  code_hash varchar(128) PRIMARY KEY, client_id varchar(80) NOT NULL, user_id uuid NOT NULL REFERENCES app_users(user_id) ON DELETE CASCADE,
  redirect_uri text NOT NULL, scope text NOT NULL, code_challenge varchar(160) NOT NULL, code_challenge_method varchar(16) NOT NULL,
  expires_at timestamptz NOT NULL, used_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS user_settings (
  user_id uuid PRIMARY KEY REFERENCES app_users(user_id) ON DELETE CASCADE, theme varchar(16) NOT NULL DEFAULT 'dark',
  sidebar_collapsed boolean NOT NULL DEFAULT false, default_workspace_id varchar(64) NOT NULL DEFAULT 'chat',
  density varchar(32) NOT NULL DEFAULT 'comfortable', preferred_language varchar(16) NOT NULL DEFAULT 'es',
  ui_preferences jsonb NOT NULL DEFAULT '{}', updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app_workspaces (
  workspace_id varchar(64) PRIMARY KEY, label varchar(120) NOT NULL, route varchar(160) NOT NULL, icon varchar(64) NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'active', sort_order integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS agent_account_links (
  agent_link_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES app_users(user_id) ON DELETE CASCADE,
  agent_user_id text NOT NULL, status varchar(32) NOT NULL DEFAULT 'active', synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id, agent_user_id)
);
CREATE TABLE IF NOT EXISTS app_conversations (
  conversation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES app_users(user_id) ON DELETE CASCADE,
  workspace_id varchar(64) NOT NULL REFERENCES app_workspaces(workspace_id), agent_conversation_id text,
  title varchar(220) NOT NULL DEFAULT 'New conversation', status varchar(32) NOT NULL DEFAULT 'active', pinned boolean NOT NULL DEFAULT false,
  archived_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app_messages (
  message_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL REFERENCES app_conversations(conversation_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_users(user_id) ON DELETE CASCADE, parent_message_id uuid REFERENCES app_messages(message_id) ON DELETE SET NULL,
  agent_turn_id uuid, role varchar(32) NOT NULL, status varchar(32) NOT NULL DEFAULT 'completed', content_text text NOT NULL,
  metadata_json jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS agent_requests (
  request_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES app_users(user_id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES app_conversations(conversation_id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES app_messages(message_id) ON DELETE CASCADE, agent_user_id text, agent_conversation_id text,
  agent_turn_id uuid, status varchar(32) NOT NULL DEFAULT 'completed', idempotency_key varchar(160), request_payload jsonb NOT NULL DEFAULT '{}',
  response_summary jsonb NOT NULL DEFAULT '{}', error_code varchar(80), error_message text, started_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
CREATE TABLE IF NOT EXISTS user_metric_entries (
  metric_entry_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES app_users(user_id) ON DELETE CASCADE,
  metric_type varchar(64) NOT NULL, label varchar(120) NOT NULL, recorded_at timestamptz NOT NULL, value_number double precision,
  value_text varchar(220), unit varchar(32), source varchar(40) NOT NULL DEFAULT 'manual', notes text, metadata_json jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS user_preference_items (
  preference_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES app_users(user_id) ON DELETE CASCADE,
  category varchar(80) NOT NULL, label varchar(160) NOT NULL, value varchar(260) NOT NULL, importance integer NOT NULL DEFAULT 3,
  status varchar(40) NOT NULL DEFAULT 'active', source varchar(40) NOT NULL DEFAULT 'user', metadata_json jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (category IN ('restriction','nutrition','schedule','cooking_style','budget','communication','goal')),
  UNIQUE(user_id, category, label)
);
CREATE TABLE IF NOT EXISTS user_diet_plans (
  plan_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES app_users(user_id) ON DELETE CASCADE,
  status varchar(24) NOT NULL CHECK (status IN ('draft','active','archived')), active_revision_id uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS user_diet_plan_revisions (
  revision_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plan_id uuid NOT NULL REFERENCES user_diet_plans(plan_id) ON DELETE CASCADE,
  revision_number integer NOT NULL, profile_snapshot jsonb NOT NULL, plan_json jsonb NOT NULL, created_by varchar(40) NOT NULL DEFAULT 'agent', created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plan_id, revision_number)
);
CREATE TABLE IF NOT EXISTS foodb_nutrition_foods (
  food_id integer PRIMARY KEY, name text NOT NULL, normalized_name text NOT NULL, food_group text, food_subgroup text, category text,
  public_id text, imported_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS foodb_food_localizations (
  food_id integer NOT NULL REFERENCES foodb_nutrition_foods(food_id) ON DELETE CASCADE,
  locale varchar(16) NOT NULL,
  display_name text NOT NULL,
  normalized_name text NOT NULL,
  import_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(food_id,locale)
);
CREATE TABLE IF NOT EXISTS foodb_food_aliases (
  food_alias_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_id integer NOT NULL REFERENCES foodb_nutrition_foods(food_id) ON DELETE CASCADE,
  locale varchar(16) NOT NULL,
  alias text NOT NULL,
  normalized_alias text NOT NULL,
  alias_type varchar(24) NOT NULL DEFAULT 'synonym',
  priority integer NOT NULL DEFAULT 100,
  status varchar(16) NOT NULL DEFAULT 'active',
  source varchar(64) NOT NULL DEFAULT 'curated',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_foodb_food_aliases_food_locale_alias UNIQUE(food_id,locale,normalized_alias),
  CONSTRAINT chk_foodb_food_aliases_status CHECK(status IN ('active','disabled'))
);
CREATE TABLE IF NOT EXISTS foodb_localization_imports (
  import_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locale varchar(16) NOT NULL,
  source_filename text NOT NULL,
  source_sha256 varchar(64) NOT NULL,
  row_count integer NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS foodb_foods_without_nutrients (
  food_id integer PRIMARY KEY, name text NOT NULL, food_group text, food_subgroup text, category text,
  public_id text, exclusion_reason varchar(64) NOT NULL DEFAULT 'no_nutrient_content', imported_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS foodb_food_nutrients (
  food_id integer NOT NULL REFERENCES foodb_nutrition_foods(food_id) ON DELETE CASCADE,
  nutrient_id integer NOT NULL, amount_per_100g numeric NOT NULL, observation_count integer NOT NULL,
  raw_observation_count integer NOT NULL, PRIMARY KEY(food_id,nutrient_id)
);
CREATE TABLE IF NOT EXISTS foodb_nutrients (
  nutrient_id integer PRIMARY KEY, name text NOT NULL, unit_name varchar(16) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_foodb_food_nutrients_nutrient ON foodb_food_nutrients(nutrient_id);
CREATE TABLE IF NOT EXISTS user_meal_log_entries (
  meal_log_entry_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_meal_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(user_id) ON DELETE CASCADE,
  consumed_on date NOT NULL,
  meal_type varchar(32) NOT NULL,
  food_id integer NOT NULL REFERENCES foodb_nutrition_foods(food_id) ON DELETE RESTRICT,
  description_snapshot text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  serving_grams numeric NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_user_meal_log_entries_meal_type CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  CONSTRAINT chk_user_meal_log_entries_quantity CHECK (quantity > 0),
  CONSTRAINT chk_user_meal_log_entries_serving_grams CHECK (serving_grams > 0)
);
CREATE TABLE IF NOT EXISTS meal_import_outbox (
  meal_import_outbox_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES app_users(user_id) ON DELETE CASCADE,
  external_meal_id uuid NOT NULL,
  payload jsonb NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'pending',
  delivery_attempts integer NOT NULL DEFAULT 0,
  last_error text,
  accepted_event_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  CONSTRAINT chk_meal_import_outbox_status CHECK (status IN ('pending','delivered','failed'))
);
ALTER TABLE user_meal_log_entries ADD COLUMN IF NOT EXISTS external_meal_id uuid;
UPDATE user_meal_log_entries SET external_meal_id=gen_random_uuid() WHERE external_meal_id IS NULL;
ALTER TABLE user_meal_log_entries ALTER COLUMN external_meal_id SET DEFAULT gen_random_uuid();
ALTER TABLE user_meal_log_entries ALTER COLUMN external_meal_id SET NOT NULL;
ALTER TABLE foodb_nutrition_foods ADD COLUMN IF NOT EXISTS normalized_name text;
UPDATE foodb_nutrition_foods SET normalized_name=lower(regexp_replace(name, '\\s+', ' ', 'g')) WHERE normalized_name IS NULL;
ALTER TABLE foodb_nutrition_foods ALTER COLUMN normalized_name SET NOT NULL;
DROP TABLE IF EXISTS nutrition_food_search_documents CASCADE;
DROP TABLE IF EXISTS nutrition_food_catalog_entries CASCADE;
DROP TABLE IF EXISTS nutrition_food_localizations CASCADE;
DROP TABLE IF EXISTS nutrition_food_search_aliases CASCADE;
DROP TABLE IF EXISTS nutrition_food_portions CASCADE;
DROP TABLE IF EXISTS nutrition_food_nutrients CASCADE;
DROP TABLE IF EXISTS nutrition_branded_foods CASCADE;
DROP TABLE IF EXISTS nutrition_foods CASCADE;
DROP TABLE IF EXISTS nutrition_measure_units CASCADE;
DROP TABLE IF EXISTS nutrition_nutrients CASCADE;
DROP TABLE IF EXISTS nutrition_food_categories CASCADE;
CREATE INDEX IF NOT EXISTS idx_foodb_nutrition_foods_name_trgm ON foodb_nutrition_foods USING gin (normalized_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_foodb_food_localizations_locale_name ON foodb_food_localizations(locale,normalized_name);
CREATE INDEX IF NOT EXISTS idx_foodb_food_aliases_locale_alias ON foodb_food_aliases(locale,normalized_alias) WHERE status='active';
CREATE INDEX IF NOT EXISTS idx_user_meal_log_entries_user_date ON user_meal_log_entries(user_id,consumed_on);
CREATE INDEX IF NOT EXISTS idx_user_meal_log_entries_user_date_meal ON user_meal_log_entries(user_id,consumed_on,meal_type);
CREATE INDEX IF NOT EXISTS idx_user_meal_log_entries_external_meal ON user_meal_log_entries(external_meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_import_outbox_pending ON meal_import_outbox(status,created_at) WHERE status='pending';

-- The original Python service created these tables without database defaults.
-- Keep existing installations compatible with the canonical schema above.
ALTER TABLE app_users ALTER COLUMN user_id SET DEFAULT gen_random_uuid();
ALTER TABLE app_users ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE app_users ALTER COLUMN locale SET DEFAULT 'es-CL';
ALTER TABLE app_users ALTER COLUMN timezone SET DEFAULT 'America/Santiago';
ALTER TABLE auth_identities ALTER COLUMN auth_identity_id SET DEFAULT gen_random_uuid();
ALTER TABLE auth_identities ALTER COLUMN email_verified SET DEFAULT false;
ALTER TABLE auth_identities ALTER COLUMN metadata_json SET DEFAULT '{}';
ALTER TABLE web_sessions ALTER COLUMN session_id SET DEFAULT gen_random_uuid();
ALTER TABLE web_sessions ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE user_settings ALTER COLUMN theme SET DEFAULT 'dark';
ALTER TABLE user_settings ALTER COLUMN sidebar_collapsed SET DEFAULT false;
ALTER TABLE user_settings ALTER COLUMN default_workspace_id SET DEFAULT 'chat';
ALTER TABLE user_settings ALTER COLUMN density SET DEFAULT 'comfortable';
ALTER TABLE user_settings ALTER COLUMN preferred_language SET DEFAULT 'es';
ALTER TABLE user_settings ALTER COLUMN ui_preferences SET DEFAULT '{}';
ALTER TABLE app_workspaces ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE app_workspaces ALTER COLUMN sort_order SET DEFAULT 0;
ALTER TABLE agent_account_links ALTER COLUMN agent_link_id SET DEFAULT gen_random_uuid();
ALTER TABLE agent_account_links ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE app_conversations ALTER COLUMN conversation_id SET DEFAULT gen_random_uuid();
ALTER TABLE app_conversations ALTER COLUMN title SET DEFAULT 'New conversation';
ALTER TABLE app_conversations ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE app_conversations ALTER COLUMN pinned SET DEFAULT false;
ALTER TABLE app_messages ALTER COLUMN message_id SET DEFAULT gen_random_uuid();
ALTER TABLE app_messages ALTER COLUMN status SET DEFAULT 'completed';
ALTER TABLE app_messages ALTER COLUMN metadata_json SET DEFAULT '{}';
ALTER TABLE agent_requests ALTER COLUMN request_id SET DEFAULT gen_random_uuid();
ALTER TABLE agent_requests ALTER COLUMN status SET DEFAULT 'completed';
ALTER TABLE agent_requests ALTER COLUMN request_payload SET DEFAULT '{}';
ALTER TABLE agent_requests ALTER COLUMN response_summary SET DEFAULT '{}';
ALTER TABLE user_metric_entries ALTER COLUMN metric_entry_id SET DEFAULT gen_random_uuid();
ALTER TABLE user_metric_entries ALTER COLUMN source SET DEFAULT 'manual';
ALTER TABLE user_metric_entries ALTER COLUMN metadata_json SET DEFAULT '{}';
ALTER TABLE user_preference_items ALTER COLUMN preference_id SET DEFAULT gen_random_uuid();
ALTER TABLE user_preference_items ALTER COLUMN importance SET DEFAULT 3;
ALTER TABLE user_preference_items ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE user_preference_items ALTER COLUMN source SET DEFAULT 'user';
ALTER TABLE user_preference_items ALTER COLUMN metadata_json SET DEFAULT '{}';
`;

export async function initializeSchema(): Promise<void> {
  await pool.query(ddl);
  const workspaces = [
    ["chat", "Chat", "/app/chat", "message-square-text", 10],
    ["diets", "Dietas", "/app/diets", "apple", 20],
    ["biometrics", "Biometrics", "/app/biometrics", "activity", 30],
    ["profile", "Profile", "/app/profile", "user-round", 40],
    ["about", "About", "/app/about", "file-text", 50],
  ];
  for (const row of workspaces) {
    await pool.query(
      `INSERT INTO app_workspaces(workspace_id,label,route,icon,status,sort_order) VALUES($1,$2,$3,$4,'active',$5) ON CONFLICT(workspace_id) DO NOTHING`,
      row,
    );
  }
  await ensureFoodbCatalog(pool);
  await seedDemoDavid(pool);
}
