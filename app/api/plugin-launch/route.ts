import { pluginLaunchSecret } from "../../../lib/auth/plugin-runtime";
import {
  safePluginReturnTo,
  validPluginInstallationId,
} from "../../../lib/auth/plugin-launch";
import { signToken } from "../../../lib/auth/signed-token";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    installationId?: unknown;
    returnTo?: unknown;
  } | null;
  if (!validPluginInstallationId(body?.installationId))
    return Response.json({ error: "Invalid plugin installation" }, { status: 400 });

  const returnTo = safePluginReturnTo(body?.returnTo);
  const token = await signToken(pluginLaunchSecret(), {
    sub: body.installationId,
    kind: "launch",
    exp: Math.floor(Date.now() / 1000) + 90,
  });
  const launchUrl = new URL("/plugin-login", request.url);
  launchUrl.searchParams.set("token", token);
  launchUrl.searchParams.set("return_to", returnTo);

  return Response.json(
    { launchUrl: launchUrl.toString() },
    { headers: { "cache-control": "no-store" } },
  );
}
