import { NextResponse } from "next/server";
import {
  pluginLaunchSecret,
  PLUGIN_SESSION_COOKIE,
} from "../../lib/auth/plugin-runtime";
import { signToken, verifyToken } from "../../lib/auth/signed-token";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const launch = await verifyToken(
    pluginLaunchSecret(),
    url.searchParams.get("token") ?? "",
    "launch",
  );
  if (!launch)
    return new Response("Invalid or expired Codex Poker launch link", {
      status: 401,
    });
  const requested = url.searchParams.get("return_to") ?? "/";
  const returnTo =
    requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";
  const session = await signToken(pluginLaunchSecret(), {
    sub: launch.sub,
    kind: "session",
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
  });
  const response = NextResponse.redirect(new URL(returnTo, request.url));
  response.cookies.set(PLUGIN_SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
