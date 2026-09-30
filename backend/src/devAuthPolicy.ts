const DEV_AUTH_ENVIRONMENTS = new Set(["local", "development", "test"]);

export function assertDevAuthEnvironment(appEnv: string, enabled: boolean): void {
  if (enabled && !DEV_AUTH_ENVIRONMENTS.has(appEnv.trim().toLowerCase())) {
    throw new Error("ENABLE_DEV_AUTH can only be enabled in local, development, or test environments");
  }
}
