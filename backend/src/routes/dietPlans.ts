import { Hono } from "hono";
import { pool, type DbClient } from "../db.js";
import { currentUser } from "../session.js";

type ActiveDietPlanRow = {
  plan_id: string;
  status: string;
  active_revision_id: string;
  updated_at: Date;
  revision_id: string;
  revision_number: number;
  created_at: Date;
  profile_snapshot: unknown;
  plan_json: unknown;
};

export function createDietPlanRoutes(db: DbClient = pool): Hono {
  const routes = new Hono();

  routes.get("/api/users/me/diet-plan", async (c) => {
    const user = await currentUser(c);
    const result = await db.query<ActiveDietPlanRow>(
      `SELECT p.plan_id,p.status,p.active_revision_id,p.updated_at,
              r.revision_id,r.revision_number,r.created_at,r.profile_snapshot,r.plan_json
       FROM user_diet_plans p
       JOIN user_diet_plan_revisions r ON r.revision_id=p.active_revision_id
       WHERE p.user_id=$1 AND p.status='active'
       ORDER BY p.updated_at DESC
       LIMIT 1`,
      [user.user_id],
    );
    return c.json({ plan: result.rows[0] ?? null });
  });

  return routes;
}

export const dietPlanRoutes = createDietPlanRoutes();
