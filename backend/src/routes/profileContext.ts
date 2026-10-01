import { Hono } from "hono";
import type { DbClient } from "../db.js";
import { pool, transaction } from "../db.js";
import { DEMO_DAVID_USER_ID } from "../demoTemplate.js";
import { settings } from "../config.js";
import { HttpError } from "../security.js";

type ProfileSection = "overview" | "current_diet" | "biometrics";
const profileSections = new Set<ProfileSection>(["overview", "current_diet", "biometrics"]);
const biometricTypes = ["weight", "sleep", "energy", "adherence"];
const preferenceCategories = new Set(["restriction", "nutrition", "schedule", "cooking_style", "budget", "communication", "goal"]);

function authorized(authorization: string | undefined): boolean {
  return Boolean(settings.demoAgentApiToken && authorization === `Bearer ${settings.demoAgentApiToken}`);
}

function resolveUserId(subject: unknown): string {
  if (subject === "demo:david") return DEMO_DAVID_USER_ID;
  if (typeof subject === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(subject)) return subject;
  throw new HttpError(422, "Invalid profile subject");
}

function resolveSection(value: unknown): ProfileSection {
  return typeof value === "string" && profileSections.has(value as ProfileSection)
    ? value as ProfileSection
    : "overview";
}

function numeric(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function profileContext(
  db: DbClient,
  subject: unknown,
  section: ProfileSection,
) {
  const userId = resolveUserId(subject);
  const user = await db.query<{ display_name: string | null }>(
    "SELECT display_name FROM app_users WHERE user_id=$1 AND status='active'",
    [userId],
  );
  if (!user.rows[0]) throw new HttpError(404, "Profile not found");

  const response: Record<string, unknown> = {
    display_name: user.rows[0].display_name || "Victus user",
  };
  if (section === "overview" || section === "current_diet") {
    const diet = await db.query<{
      consumed_on: string; meal_type: string; description_snapshot: string; quantity: unknown;
      serving_grams: unknown; calories_kcal: unknown; protein_g: unknown; fat_g: unknown; carbohydrate_g: unknown;
    }>(
      `WITH latest_day AS (
         SELECT MAX(consumed_on) AS consumed_on FROM user_meal_log_entries WHERE user_id=$1
       ), entries AS (
         SELECT e.consumed_on,e.meal_type,e.description_snapshot,e.quantity,e.serving_grams,
           COALESCE(MAX(n.amount_per_100g) FILTER (WHERE n.nutrient_id=38),0) * e.serving_grams * e.quantity / 100 AS calories_kcal,
           COALESCE(MAX(n.amount_per_100g) FILTER (WHERE n.nutrient_id=2),0) * e.serving_grams * e.quantity / 100 AS protein_g,
           COALESCE(MAX(n.amount_per_100g) FILTER (WHERE n.nutrient_id=1),0) * e.serving_grams * e.quantity / 100 AS fat_g,
           COALESCE(MAX(n.amount_per_100g) FILTER (WHERE n.nutrient_id=3),0) * e.serving_grams * e.quantity / 100 AS carbohydrate_g
         FROM user_meal_log_entries e
         JOIN latest_day d ON d.consumed_on=e.consumed_on
         LEFT JOIN foodb_food_nutrients n ON n.food_id=e.food_id
         WHERE e.user_id=$1
         GROUP BY e.meal_log_entry_id,e.consumed_on,e.meal_type,e.description_snapshot,e.quantity,e.serving_grams
       ) SELECT * FROM entries ORDER BY meal_type,description_snapshot`,
      [userId],
    );
    const entries = diet.rows.map((row) => ({
      ...row,
      quantity: numeric(row.quantity), serving_grams: numeric(row.serving_grams),
      calories_kcal: numeric(row.calories_kcal), protein_g: numeric(row.protein_g),
      fat_g: numeric(row.fat_g), carbohydrate_g: numeric(row.carbohydrate_g),
    }));
    response.current_diet = {
      date: entries[0]?.consumed_on ?? null,
      entries,
      totals: entries.reduce((total, entry) => ({
        calories_kcal: total.calories_kcal + entry.calories_kcal,
        protein_g: total.protein_g + entry.protein_g,
        fat_g: total.fat_g + entry.fat_g,
        carbohydrate_g: total.carbohydrate_g + entry.carbohydrate_g,
      }), { calories_kcal: 0, protein_g: 0, fat_g: 0, carbohydrate_g: 0 }),
    };
  }
  if (section === "overview" || section === "biometrics") {
    const metrics = await db.query<{
      metric_type: string; label: string; value_number: unknown; unit: string | null; recorded_at: string;
    }>(
      `SELECT DISTINCT ON (metric_type) metric_type,label,value_number,unit,recorded_at
       FROM user_metric_entries
       WHERE user_id=$1 AND metric_type = ANY($2) AND value_number IS NOT NULL
       ORDER BY metric_type,recorded_at DESC`,
      [userId, biometricTypes],
    );
    response.biometrics = metrics.rows.map((row) => ({ ...row, value_number: numeric(row.value_number) }));
  }
  if (section === "overview") {
    const preferences = await db.query(`SELECT category,label,value,importance,metadata_json
      FROM user_preference_items
      WHERE user_id=$1 AND status='active'
      ORDER BY category,label`, [userId]);
    response.preferences = preferences.rows;
  }
  return response;
}

async function dietPlanProfileSnapshot(db: DbClient, subject: unknown) {
  const profile = await profileContext(db, subject, "overview");
  return {
    captured_at: new Date().toISOString(),
    biometrics: profile.biometrics ?? [],
    preferences: profile.preferences ?? [],
    current_diet: profile.current_diet ?? { date: null, entries: [], totals: {} },
  };
}

export function createProfileContextRoutes(db: DbClient = pool): Hono {
  const routes = new Hono();
  routes.onError((error, c) => {
    if (error instanceof HttpError) return c.json({ detail: error.message }, error.status as 400);
    throw error;
  });
  routes.post("/internal/agent/profile", async (c) => {
    if (!authorized(c.req.header("authorization"))) throw new HttpError(401, "Unauthorized agent");
    const body = await c.req.json<Record<string, unknown>>();
    return c.json(await profileContext(db, body.subject, resolveSection(body.section)));
  });
  routes.post("/internal/agent/profile/update", async (c) => {
    if (!authorized(c.req.header("authorization"))) throw new HttpError(401, "Unauthorized agent");
    const body = await c.req.json<Record<string, unknown>>(); const userId = resolveUserId(body.subject);
    const category = String(body.category || ""); const label = String(body.label || "").trim(); const value = String(body.value || "").trim();
    if (!preferenceCategories.has(category) || !label || !value) throw new HttpError(422, "Invalid profile update");
    const status = body.action === "remove" ? "inactive" : "active";
    const result = await db.query(`INSERT INTO user_preference_items(user_id,category,label,value,importance,status,source,metadata_json) VALUES($1,$2,$3,$4,$5,$6,'agent',$7)
      ON CONFLICT(user_id,category,label) DO UPDATE SET value=EXCLUDED.value,importance=EXCLUDED.importance,status=EXCLUDED.status,metadata_json=EXCLUDED.metadata_json,updated_at=now()
      RETURNING preference_id,category,label,value,importance,status,metadata_json`, [userId, category, label, value, Number(body.importance) || 3, status, JSON.stringify(body.metadata_json || {})]);
    return c.json(result.rows[0]);
  });
  routes.post("/internal/agent/diet-plans", async (c) => {
    if (!authorized(c.req.header("authorization"))) throw new HttpError(401, "Unauthorized agent");
    const body = await c.req.json<Record<string, unknown>>(); const userId = resolveUserId(body.subject);
    const action = String(body.action || ""); const plan = body.plan_json;
    if (action === "activate") {
      const planId = String(body.plan_id || "");
      const active = await db.query(`UPDATE user_diet_plans SET status='archived',updated_at=now() WHERE user_id=$1 AND status='active'; UPDATE user_diet_plans SET status='active',updated_at=now() WHERE plan_id=$2 AND user_id=$1 RETURNING plan_id,status,active_revision_id`, [userId, planId]);
      return c.json(active.rows.at(-1) || {});
    }
    if (!["create", "refine"].includes(action) || !plan || typeof plan !== "object") throw new HttpError(422, "action and plan_json are required");
    const saveRevision = async (writeDb: DbClient) => {
      const planId = action === "refine" ? String(body.plan_id || "") : "";
      const parent = planId ? await writeDb.query(`SELECT plan_id FROM user_diet_plans WHERE plan_id=$1 AND user_id=$2`, [planId,userId]) : null;
      if (planId && !parent?.rows[0]) throw new HttpError(404, "Diet plan not found");
      const created = planId ? { plan_id: planId } : (await writeDb.query(`INSERT INTO user_diet_plans(user_id,status) VALUES($1,'draft') RETURNING plan_id`, [userId])).rows[0];
      const snapshot = await dietPlanProfileSnapshot(writeDb, body.subject);
      const revision = await writeDb.query(`INSERT INTO user_diet_plan_revisions(plan_id,revision_number,profile_snapshot,plan_json) SELECT $1,COALESCE(MAX(revision_number),0)+1,$2,$3 FROM user_diet_plan_revisions WHERE plan_id=$1 RETURNING revision_id,revision_number,created_at`, [created.plan_id, JSON.stringify(snapshot), JSON.stringify(plan)]);
      await writeDb.query(`UPDATE user_diet_plans SET status='archived',updated_at=now() WHERE user_id=$1 AND status='active' AND plan_id<>$2`, [userId, created.plan_id]);
      await writeDb.query(`UPDATE user_diet_plans SET status='active',active_revision_id=$3,updated_at=now() WHERE plan_id=$2 AND user_id=$1`, [userId, created.plan_id, revision.rows[0].revision_id]);
      return {plan_id:created.plan_id,status:"active",revision:revision.rows[0]};
    };
    return c.json(await (db === pool ? transaction(saveRevision) : saveRevision(db)), 201);
  });
  return routes;
}

export const profileContextRoutes = createProfileContextRoutes();
