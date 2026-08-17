import { env } from "cloudflare:workers";

export const PLUGIN_SESSION_COOKIE = "codex_poker_plugin_session";

export function pluginLaunchSecret() {
  const runtime = env as unknown as { PLUGIN_LAUNCH_SECRET?: string };
  const secret = runtime.PLUGIN_LAUNCH_SECRET ?? process.env.PLUGIN_LAUNCH_SECRET;
  if (!secret) throw new Error("PLUGIN_LAUNCH_SECRET is unavailable");
  return secret;
}
