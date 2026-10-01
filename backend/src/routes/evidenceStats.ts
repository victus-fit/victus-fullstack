import { Hono } from "hono";
import { settings } from "../config.js";

type EvidenceStats = {
  collection: string;
  evidence_count: number;
  paper_count: number;
};

type EvidenceStatsDependencies = {
  fetchImpl?: typeof fetch;
  ragApiToken?: string;
  ragApiUrl?: string;
  timeoutMs?: number;
};

function isEvidenceStats(value: unknown): value is EvidenceStats {
  if (!value || typeof value !== "object") return false;
  const stats = value as Partial<EvidenceStats>;
  return typeof stats.collection === "string"
    && typeof stats.evidence_count === "number" && Number.isInteger(stats.evidence_count) && stats.evidence_count >= 0
    && typeof stats.paper_count === "number" && Number.isInteger(stats.paper_count) && stats.paper_count >= 0;
}

export function createEvidenceStatsRoutes(dependencies: EvidenceStatsDependencies = {}) {
  const routes = new Hono();
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const ragApiUrl = dependencies.ragApiUrl ?? settings.ragApiUrl;
  const ragApiToken = dependencies.ragApiToken ?? settings.ragApiToken;
  const timeoutMs = dependencies.timeoutMs ?? settings.ragTimeoutMs;

  routes.get("/api/evidence/stats", async (c) => {
    if (!ragApiToken) return c.json({ detail: "Evidence statistics unavailable" }, 503);
    let response: Response;
    try {
      response = await fetchImpl(`${ragApiUrl.replace(/\/$/, "")}/v1/evidence/stats`, {
        headers: { Authorization: `Bearer ${ragApiToken}` },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      return c.json({ detail: "Evidence statistics unavailable" }, 503);
    }
    if (!response.ok) return c.json({ detail: "Evidence statistics unavailable" }, 503);
    const payload: unknown = await response.json().catch(() => null);
    if (!isEvidenceStats(payload)) return c.json({ detail: "Invalid evidence statistics response" }, 502);
    c.header("Cache-Control", "no-store");
    return c.json(payload);
  });

  return routes;
}

export const evidenceStatsRoutes = createEvidenceStatsRoutes();
